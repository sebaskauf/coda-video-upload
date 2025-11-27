/**
 * Cloudflare Worker for R2 Video Upload - Chunked Version
 *
 * Handles large files by receiving them in chunks < 100MB
 * Uses R2 Multipart Upload API to combine chunks
 *
 * Setup:
 * 1. Create a new Worker in Cloudflare Dashboard
 * 2. Paste this code
 * 3. Go to Settings → Variables → R2 Bucket Bindings
 * 4. Add binding: Variable name = "R2_BUCKET", R2 bucket = "coda-videos"
 * 5. Deploy
 */

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Filename, X-Filetype, X-Upload-Id, X-Part-Number, X-Total-Parts',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'X-Upload-Id',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Start multipart upload
    if (url.pathname === '/start' && request.method === 'POST') {
      return handleStartUpload(request, env, corsHeaders);
    }

    // Upload a chunk/part
    if (url.pathname === '/upload-part' && request.method === 'POST') {
      return handleUploadPart(request, env, corsHeaders);
    }

    // Complete multipart upload
    if (url.pathname === '/complete' && request.method === 'POST') {
      return handleCompleteUpload(request, env, corsHeaders);
    }

    // Simple upload for small files (< 95MB to be safe)
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleSimpleUpload(request, env, corsHeaders);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', version: 'chunked-v1' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

// Simple upload for files < 95MB
async function handleSimpleUpload(request, env, corsHeaders) {
  try {
    const filename = request.headers.get('X-Filename') || 'video.mp4';
    const filetype = request.headers.get('X-Filetype') || 'video/mp4';

    console.log(`[R2] Simple upload: ${filename}`);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop() || 'mp4';
    const uniqueFilename = `videos/${timestamp}-${random}.${ext}`;

    // Stream directly to R2
    await env.R2_BUCKET.put(uniqueFilename, request.body, {
      httpMetadata: { contentType: filetype },
      customMetadata: { originalFilename: filename, uploadedAt: new Date().toISOString() },
    });

    const publicUrl = `https://pub-41d321eea7e1460a8ceec66c6bb4016e.r2.dev/${uniqueFilename}`;

    console.log(`[R2] Simple upload success: ${uniqueFilename}`);

    return jsonResponse({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      originalFilename: filename,
      mimeType: filetype,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[R2] Simple upload error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Start multipart upload
async function handleStartUpload(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { fileName, mimeType, fileSize } = body;

    console.log(`[R2] Starting multipart upload: ${fileName} (${Math.round(fileSize / 1024 / 1024)}MB)`);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileName.split('.').pop() || 'mp4';
    const uniqueFilename = `videos/${timestamp}-${random}.${ext}`;

    // Create multipart upload
    const multipartUpload = await env.R2_BUCKET.createMultipartUpload(uniqueFilename, {
      httpMetadata: { contentType: mimeType || 'video/mp4' },
      customMetadata: { originalFilename: fileName, uploadedAt: new Date().toISOString() },
    });

    console.log(`[R2] Multipart upload started: ${multipartUpload.uploadId}`);

    return jsonResponse({
      success: true,
      uploadId: multipartUpload.uploadId,
      key: uniqueFilename,
      originalFilename: fileName,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[R2] Start upload error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Upload a single part
async function handleUploadPart(request, env, corsHeaders) {
  try {
    const uploadId = request.headers.get('X-Upload-Id');
    const partNumber = parseInt(request.headers.get('X-Part-Number'), 10);
    const key = request.headers.get('X-Filename');

    if (!uploadId || !partNumber || !key) {
      return jsonResponse({ error: 'Missing upload headers' }, 400, corsHeaders);
    }

    console.log(`[R2] Uploading part ${partNumber} for ${key}`);

    // Get the multipart upload
    const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);

    // Upload the part
    const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);

    console.log(`[R2] Part ${partNumber} uploaded, etag: ${uploadedPart.etag}`);

    return jsonResponse({
      success: true,
      partNumber: partNumber,
      etag: uploadedPart.etag,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[R2] Upload part error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Complete multipart upload
async function handleCompleteUpload(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { uploadId, key, parts, originalFilename, mimeType } = body;

    if (!uploadId || !key || !parts) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    console.log(`[R2] Completing multipart upload: ${key} with ${parts.length} parts`);

    // Get the multipart upload
    const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);

    // Complete the upload
    const object = await multipartUpload.complete(parts);

    const publicUrl = `https://pub-41d321eea7e1460a8ceec66c6bb4016e.r2.dev/${key}`;

    console.log(`[R2] Multipart upload complete: ${key}`);

    return jsonResponse({
      success: true,
      url: publicUrl,
      filename: key,
      originalFilename: originalFilename,
      size: object.size,
      mimeType: mimeType || 'video/mp4',
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[R2] Complete upload error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
