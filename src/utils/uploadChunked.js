/**
 * Robust File Upload Utility
 * Ensures files are reliably uploaded using XMLHttpRequest with progress tracking,
 * retry logic, and timeout handling
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const UPLOAD_TIMEOUT = 15 * 60 * 1000; // 15 minutes for large files

/**
 * Sleep helper for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Upload file using XMLHttpRequest for reliable upload with progress
 * @param {File} file - The file to upload
 * @param {string} webhookUrl - The webhook URL
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<object>} - Response from server
 */
const uploadWithXHR = (file, webhookUrl, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          // If response is not JSON, still consider it success
          resolve({ success: true, raw: xhr.responseText });
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status} - ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout - file may be too large or connection too slow'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    // Set long timeout for large files
    xhr.timeout = UPLOAD_TIMEOUT;

    xhr.open('POST', webhookUrl, true);

    // Create FormData with file
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('fileName', file.name);
    formData.append('fileSize', String(file.size));
    formData.append('mimeType', file.type || 'video/mp4');
    formData.append('fileType', 'video');
    formData.append('timestamp', new Date().toISOString());

    console.log(`[Upload] Starting: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    xhr.send(formData);
  });
};

/**
 * Upload file with automatic retry on failure
 * @param {File} file - The file to upload
 * @param {string} webhookUrl - The webhook URL
 * @param {function} onProgress - Progress callback (0-100)
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<object>} - Response from server
 */
export const uploadFileWithRetry = async (file, webhookUrl, onProgress = () => {}, maxRetries = MAX_RETRIES) => {
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Upload] Attempt ${attempt}/${maxRetries} for ${file.name}`);

      const result = await uploadWithXHR(file, webhookUrl, onProgress);

      console.log(`[Upload] Success: ${file.name}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[Upload] Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        console.log(`[Upload] Retrying in ${RETRY_DELAY / 1000} seconds...`);
        onProgress(0); // Reset progress for retry
        await sleep(RETRY_DELAY * attempt); // Exponential backoff
      }
    }
  }

  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError?.message}`);
};

/**
 * Validate file before upload
 * @param {File} file - The file to validate
 * @returns {boolean} - True if file is valid
 */
export const validateFile = (file) => {
  if (!file) {
    console.error('[Upload] No file provided');
    return false;
  }

  if (!(file instanceof File)) {
    console.error('[Upload] Invalid file object');
    return false;
  }

  if (file.size === 0) {
    console.error('[Upload] File is empty');
    return false;
  }

  console.log(`[Upload] File validated: ${file.name}, ${file.size} bytes, ${file.type}`);
  return true;
};

/**
 * Main upload function - validates and uploads with retry
 * @param {File} file - The file to upload
 * @param {string} webhookUrl - The webhook URL
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<object>} - Response from server
 */
export const uploadFile = async (file, webhookUrl, onProgress = () => {}) => {
  // Validate file first
  if (!validateFile(file)) {
    throw new Error('Invalid file');
  }

  // Upload with retry logic
  return uploadFileWithRetry(file, webhookUrl, onProgress);
};

export default uploadFile;
