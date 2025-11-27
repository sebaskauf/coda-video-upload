/**
 * Upload to Cloudflare R2 via Worker
 * Then notify n8n with the URL
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const UPLOAD_TIMEOUT = 30 * 60 * 1000; // 30 minutes for large files

const R2_WORKER_URL = 'https://coda-video-upload.sebaskauf-business.workers.dev/upload';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload file to R2 via Cloudflare Worker
 */
const uploadToR2Worker = (file, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        // R2 upload is 90% of total progress
        const progress = Math.round((event.loaded / event.total) * 90);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'R2 upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response from R2 worker'));
        }
      } else {
        reject(new Error(`R2 upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during R2 upload')));
    xhr.addEventListener('timeout', () => reject(new Error('R2 upload timeout')));
    xhr.addEventListener('abort', () => reject(new Error('R2 upload aborted')));

    xhr.timeout = UPLOAD_TIMEOUT;
    xhr.open('POST', R2_WORKER_URL, true);

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('fileName', file.name);
    formData.append('mimeType', file.type || 'video/mp4');

    console.log(`[R2] Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    xhr.send(formData);
  });
};

/**
 * Notify n8n webhook with the R2 URL
 */
const notifyN8n = async (n8nWebhookUrl, r2Data, originalFile) => {
  const response = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // R2 file info
      videoUrl: r2Data.url,
      r2Filename: r2Data.filename,

      // Original file info
      fileName: originalFile.name,
      fileSize: String(originalFile.size),
      mimeType: originalFile.type || 'video/mp4',
      fileType: 'video',

      // Upload method indicator
      uploadMethod: 'r2',
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook failed with status: ${response.status}`);
  }

  return response.json();
};

/**
 * Main upload function: Upload to R2, then notify n8n
 */
export const uploadViaR2 = async (file, n8nWebhookUrl, onProgress = () => {}) => {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[R2] Attempt ${attempt}/${MAX_RETRIES}`);

      // Step 1: Upload to R2 (90% of progress)
      const r2Result = await uploadToR2Worker(file, onProgress);
      console.log('[R2] Upload complete:', r2Result.url);

      // Step 2: Notify n8n (10% of progress)
      onProgress(95);
      const n8nResult = await notifyN8n(n8nWebhookUrl, r2Result, file);
      console.log('[R2] n8n notified successfully');

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

/**
 * Check if R2 upload is configured
 */
export const isR2Configured = () => {
  return !R2_WORKER_URL.includes('YOUR_SUBDOMAIN');
};

export default uploadViaR2;
