/**
 * Upload to Cloudflare R2 via Worker - Chunked Upload
 * Supports files > 100MB by splitting into chunks
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks (safe under 100MB limit)
const UPLOAD_TIMEOUT = 10 * 60 * 1000; // 10 minutes per chunk

const R2_WORKER_URL = 'https://coda-video-upload.sebaskauf-business.workers.dev';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload a single chunk via XHR with progress
 */
const uploadChunk = (url, data, headers, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload timeout')));

    xhr.timeout = UPLOAD_TIMEOUT;
    xhr.open('POST', url, true);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.send(data);
  });
};

/**
 * Simple upload for files < 95MB
 */
const uploadSimple = async (file, onProgress) => {
  console.log(`[R2] Simple upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  const response = await uploadChunk(
    `${R2_WORKER_URL}/upload`,
    file,
    {
      'X-Filename': file.name,
      'X-Filetype': file.type || 'video/mp4',
      'Content-Type': file.type || 'video/mp4',
    },
    (loaded, total) => {
      const progress = Math.round((loaded / total) * 90);
      onProgress(progress);
    }
  );

  if (!response.success) {
    throw new Error(response.error || 'Upload failed');
  }

  return response;
};

/**
 * Chunked upload for files >= 95MB
 */
const uploadChunked = async (file, onProgress) => {
  console.log(`[R2] Chunked upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  console.log(`[R2] Splitting into ${totalChunks} chunks of ${CHUNK_SIZE / 1024 / 1024}MB`);

  // Step 1: Start multipart upload
  const startResponse = await fetch(`${R2_WORKER_URL}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'video/mp4',
      fileSize: file.size,
    }),
  });

  if (!startResponse.ok) {
    throw new Error(`Failed to start upload: ${startResponse.status}`);
  }

  const startData = await startResponse.json();
  if (!startData.success) {
    throw new Error(startData.error || 'Failed to start upload');
  }

  const { uploadId, key, originalFilename } = startData;
  console.log(`[R2] Multipart upload started: ${uploadId}`);

  // Step 2: Upload each chunk
  const parts = [];
  let uploadedBytes = 0;

  for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    console.log(`[R2] Uploading part ${partNumber}/${totalChunks} (${(chunk.size / 1024 / 1024).toFixed(2)} MB)`);

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const partResponse = await uploadChunk(
          `${R2_WORKER_URL}/upload-part`,
          chunk,
          {
            'X-Upload-Id': uploadId,
            'X-Part-Number': String(partNumber),
            'X-Filename': key,
            'Content-Type': 'application/octet-stream',
          },
          (loaded, total) => {
            const chunkProgress = loaded / total;
            const overallProgress = ((uploadedBytes + loaded) / file.size) * 90;
            onProgress(Math.round(overallProgress));
          }
        );

        if (!partResponse.success) {
          throw new Error(partResponse.error || 'Part upload failed');
        }

        parts.push({
          partNumber: partResponse.partNumber,
          etag: partResponse.etag,
        });

        uploadedBytes += chunk.size;
        console.log(`[R2] Part ${partNumber} complete`);
        break;

      } catch (error) {
        lastError = error;
        console.error(`[R2] Part ${partNumber} attempt ${attempt} failed:`, error.message);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
        }
      }
    }

    if (parts.length < partNumber) {
      throw new Error(`Failed to upload part ${partNumber}: ${lastError?.message}`);
    }
  }

  // Step 3: Complete multipart upload
  console.log(`[R2] Completing multipart upload with ${parts.length} parts`);

  const completeResponse = await fetch(`${R2_WORKER_URL}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId,
      key,
      parts,
      originalFilename,
      mimeType: file.type || 'video/mp4',
    }),
  });

  if (!completeResponse.ok) {
    throw new Error(`Failed to complete upload: ${completeResponse.status}`);
  }

  const completeData = await completeResponse.json();
  if (!completeData.success) {
    throw new Error(completeData.error || 'Failed to complete upload');
  }

  console.log(`[R2] Upload complete: ${completeData.url}`);
  return completeData;
};

/**
 * Notify n8n webhook with the R2 URL
 */
const notifyN8n = async (n8nWebhookUrl, r2Data, originalFile) => {
  const response = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoUrl: r2Data.url,
      r2Filename: r2Data.filename,
      fileName: originalFile.name,
      fileSize: String(originalFile.size),
      mimeType: originalFile.type || 'video/mp4',
      fileType: 'video',
      uploadMethod: 'r2',
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status}`);
  }

  return response.json();
};

/**
 * Main upload function: Upload to R2, then notify n8n
 */
export const uploadViaR2 = async (file, n8nWebhookUrl, onProgress = () => {}) => {
  const SIMPLE_UPLOAD_LIMIT = 95 * 1024 * 1024; // 95MB

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[R2] Attempt ${attempt}/${MAX_RETRIES}`);

      // Choose upload method based on file size
      let r2Result;
      if (file.size < SIMPLE_UPLOAD_LIMIT) {
        r2Result = await uploadSimple(file, onProgress);
      } else {
        r2Result = await uploadChunked(file, onProgress);
      }

      console.log('[R2] Upload complete:', r2Result.url);

      // Notify n8n
      onProgress(95);
      const n8nResult = await notifyN8n(n8nWebhookUrl, r2Result, file);
      console.log('[R2] n8n notified');

      onProgress(100);

      return {
        ...n8nResult,
        r2Url: r2Result.url,
      };

    } catch (error) {
      lastError = error;
      console.error(`[R2] Attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        console.log(`[R2] Retrying in ${RETRY_DELAY / 1000}s...`);
        onProgress(0);
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
};

export const isR2Configured = () => true;

export default uploadViaR2;
