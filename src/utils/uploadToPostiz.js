/**
 * Upload directly to Postiz via Cloudflare Worker
 * Skips R2 storage - much faster!
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
const UPLOAD_TIMEOUT = 10 * 60 * 1000; // 10 minutes per chunk

const WORKER_URL = 'https://coda-video-upload.sebaskauf-business.workers.dev';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload a chunk via XHR with progress
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
        let errorMsg = `Upload failed with status: ${xhr.status}`;
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
  console.log(`[Postiz Direct] Simple upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

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
      const progress = Math.round((loaded / total) * 95);
      onProgress(progress);
    }
  );

  if (!response.success) {
    throw new Error(response.error || 'Upload failed');
  }

  return response;
};

/**
 * Main upload function
 */
export const uploadToPostiz = async (file, n8nWebhookUrl, onProgress = () => {}) => {
  const SIMPLE_UPLOAD_LIMIT = 95 * 1024 * 1024; // 95MB

  // For now, only support simple upload
  // Chunked upload would require Postiz to support multipart uploads
  if (file.size >= SIMPLE_UPLOAD_LIMIT) {
    console.warn(`[Postiz Direct] File is ${(file.size / 1024 / 1024).toFixed(0)}MB - large files may fail`);
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Postiz Direct] Attempt ${attempt}/${MAX_RETRIES}`);

      const result = await uploadSimple(file, n8nWebhookUrl, onProgress);
      console.log('[Postiz Direct] Upload complete:', result.video_url);

      onProgress(100);

      return {
        success: true,
        video_id: result.video_id,
        video_url: result.video_url,
        response: 'Video erfolgreich hochgeladen!',
      };

    } catch (error) {
      lastError = error;
      console.error(`[Postiz Direct] Attempt ${attempt} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        console.log(`[Postiz Direct] Retrying in ${RETRY_DELAY / 1000}s...`);
        onProgress(0);
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
};

export default uploadToPostiz;
