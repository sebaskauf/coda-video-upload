// Chunked Upload Utility for Large Files
// This allows uploading very large files by splitting them into smaller chunks

export const uploadFileInChunks = async (file, webhookUrl, onProgress) => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('fileName', file.name);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    formData.append('fileSize', file.size);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex + 1}/${totalChunks} upload failed`);
      }

      // Update progress
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      if (onProgress) {
        onProgress(progress);
      }
    } catch (error) {
      throw new Error(`Upload failed at chunk ${chunkIndex + 1}/${totalChunks}: ${error.message}`);
    }
  }

  return true;
};
