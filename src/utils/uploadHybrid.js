/**
 * Hybrid Upload: Chunks to R2, then Worker uploads to Postiz
 * Supports files of any size with parallel chunk uploads!
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CHUNK_SIZE = 95 * 1024 * 1024; // 95MB chunks (max for Cloudflare Worker)
const PARALLEL_UPLOADS = 6; // Upload up to 6 chunks simultaneously (browser limit)
const UPLOAD_TIMEOUT = 10 * 60 * 1000; // 10 minutes per chunk

const WORKER_URL = 'https://coda-video-upload.sebaskauf-business.workers.dev';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload with XHR for progress tracking
 */
const uploadWithProgress = (url, data, headers, onProgress) => {
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
        let errorMsg = `Upload failed: ${xhr.status}`;
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMsg = errorData.error || errorMsg;
        } catch (e) {}
        reject(new Error(errorMsg));
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
const uploadSimple = async (file, n8nWebhookUrl, onProgress) => {
  console.log(`[Hybrid] Simple upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  const response = await uploadWithProgress(
    `${WORKER_URL}/upload`,
    file,
    {
      'X-Filename': file.name,
      'X-Filetype': file.type || 'video/mp4',
      'X-N8N-Webhook': n8nWebhookUrl,
      'Content-Type': file.type || 'video/mp4',
    },
    (loaded, total) => {
      onProgress(Math.round((loaded / total) * 95));
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
const uploadChunked = async (file, n8nWebhookUrl, onProgress) => {
  console.log(`[Hybrid] Chunked upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  console.log(`[Hybrid] Splitting into ${totalChunks} chunks`);

  // Step 1: Start multipart upload
  const startResponse = await fetch(`${WORKER_URL}/start`, {
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
  console.log(`[Hybrid] Upload started: ${uploadId}`);

  // Step 2: Upload chunks in parallel
  const parts = new Array(totalChunks);
  const uploadedBytesPerPart = new Array(totalChunks).fill(0);

  // Helper to update overall progress
  const updateProgress = () => {
    const totalUploaded = uploadedBytesPerPart.reduce((a, b) => a + b, 0);
    const overallProgress = (totalUploaded / file.size) * 80;
    onProgress(Math.round(overallProgress));
  };

  // Upload a single part with retries
  const uploadPart = async (partNumber) => {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    console.log(`[Hybrid] Uploading part ${partNumber}/${totalChunks}`);

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const partResponse = await uploadWithProgress(
          `${WORKER_URL}/upload-part`,
          chunk,
          {
            'X-Upload-Id': uploadId,
            'X-Part-Number': String(partNumber),
            'X-Filename': key,
            'Content-Type': 'application/octet-stream',
          },
          (loaded, total) => {
            uploadedBytesPerPart[partNumber - 1] = loaded;
            updateProgress();
          }
        );

        if (!partResponse.success) {
          throw new Error(partResponse.error || 'Part upload failed');
        }

        uploadedBytesPerPart[partNumber - 1] = chunk.size;
        updateProgress();

        return {
          partNumber: partResponse.partNumber,
          etag: partResponse.etag,
        };

      } catch (error) {
        lastError = error;
        console.error(`[Hybrid] Part ${partNumber} attempt ${attempt} failed:`, error.message);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
        }
      }
    }
    throw new Error(`Failed to upload part ${partNumber}: ${lastError?.message}`);
  };

  // Upload parts in parallel batches
  const partNumbers = Array.from({ length: totalChunks }, (_, i) => i + 1);

  for (let i = 0; i < partNumbers.length; i += PARALLEL_UPLOADS) {
    const batch = partNumbers.slice(i, i + PARALLEL_UPLOADS);
    console.log(`[Hybrid] Uploading batch: parts ${batch.join(', ')}`);

    const batchResults = await Promise.all(batch.map(uploadPart));
    batchResults.forEach((result, idx) => {
      parts[batch[idx] - 1] = result;
    });
  }

  // Step 3: Complete - Worker will assemble, upload to Postiz, and cleanup
  console.log(`[Hybrid] Completing upload...`);
  onProgress(85);

  const completeResponse = await fetch(`${WORKER_URL}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId,
      key,
      parts,
      originalFilename,
      mimeType: file.type || 'video/mp4',
      n8nWebhook: n8nWebhookUrl,
    }),
  });

  if (!completeResponse.ok) {
    throw new Error(`Failed to complete upload: ${completeResponse.status}`);
  }

  const completeData = await completeResponse.json();
  if (!completeData.success) {
    throw new Error(completeData.error || 'Failed to complete upload');
  }

  console.log(`[Hybrid] Upload complete: ${completeData.video_url}`);
  return completeData;
};

/**
 * Main upload function
 */
export const uploadHybrid = async (file, n8nWebhookUrl, onProgress = () => {}) => {
  const SIMPLE_UPLOAD_LIMIT = 95 * 1024 * 1024; // 95MB

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Hybrid] Attempt ${attempt}/${MAX_RETRIES}`);

      let result;
      if (file.size < SIMPLE_UPLOAD_LIMIT) {
        result = await uploadSimple(file, n8nWebhookUrl, onProgress);
      } else {
        result = await uploadChunked(file, n8nWebhookUrl, onProgress);
      }

      onProgress(100);

      return {
        success: true,
        video_id: result.video_id,
        video_url: result.video_url,
        response: 'Video erfolgreich hochgeladen!',
      };

    } catch (error) {
      lastError = error;
      console.error(`[Hybrid] Attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        onProgress(0);
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
};

export default uploadHybrid;
