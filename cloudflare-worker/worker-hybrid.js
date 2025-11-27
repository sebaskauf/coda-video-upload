/**
 * Cloudflare Worker - Hybrid Upload (Chunks to R2, then to Postiz)
 *
 * Handles large files by:
 * 1. Receiving chunks from browser (< 100MB each)
 * 2. Assembling them in R2 using multipart upload
 * 3. Downloading complete file from R2
 * 4. Uploading to Postiz API
 * 5. Deleting temp file from R2
 * 6. Notifying n8n with video ID
 *
 * Setup:
 * 1. Add R2 Bucket Binding: R2_BUCKET = coda-videos
 */

const POSTIZ_UPLOAD_URL = 'https://api.postiz.com/public/v1/upload';
const POSTIZ_API_KEY = 'd11a5cd4fc367f734e371a00422dd838e252c6b4138183bdfd60d4713f95c6d7';

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Filename, X-Filetype, X-Upload-Id, X-Part-Number, X-N8N-Webhook',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Expose-Headers': 'X-Upload-Id',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Start multipart upload to R2
    if (url.pathname === '/start' && request.method === 'POST') {
      return handleStartUpload(request, env, corsHeaders);
    }

    // Upload a chunk to R2
    if (url.pathname === '/upload-part' && request.method === 'POST') {
      return handleUploadPart(request, env, corsHeaders);
    }

    // Complete: assemble in R2, upload to Postiz, cleanup
    if (url.pathname === '/complete' && request.method === 'POST') {
      return handleCompleteAndUploadToPostiz(request, env, corsHeaders);
    }

    // Simple upload for small files (< 95MB)
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleSimpleUpload(request, env, corsHeaders);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        version: 'hybrid-v3',
        hasR2: !!env.R2_BUCKET,
        hasApiKey: true
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

// Simple upload for files < 95MB - direct to Postiz
async function handleSimpleUpload(request, env, corsHeaders) {
  try {
    const filename = request.headers.get('X-Filename') || 'video.mp4';
    const filetype = request.headers.get('X-Filetype') || 'video/mp4';
    const n8nWebhook = request.headers.get('X-N8N-Webhook') || null;

    console.log(`[Hybrid] Simple upload: ${filename}`);

    // Get file from request
    const arrayBuffer = await request.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: filetype });

    // Upload to Postiz
    const formData = new FormData();
    formData.append('file', fileBlob, filename);

    const postizResponse = await fetch(POSTIZ_UPLOAD_URL, {
      method: 'POST',
      headers: { 'Authorization': POSTIZ_API_KEY },
      body: formData,
    });

    if (!postizResponse.ok) {
      const errorText = await postizResponse.text();
      return jsonResponse({ error: `Postiz error: ${postizResponse.status}`, details: errorText }, postizResponse.status, corsHeaders);
    }

    const postizData = await postizResponse.json();
    console.log(`[Hybrid] Simple upload success:`, postizData.id);

    // Notify n8n
    if (n8nWebhook) {
      await notifyN8n(n8nWebhook, postizData, filename);
    }

    return jsonResponse({
      success: true,
      video_id: postizData.id,
      video_url: postizData.path,
      video_filename: postizData.name || filename,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Hybrid] Simple upload error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Start multipart upload to R2
async function handleStartUpload(request, env, corsHeaders) {
  try {
    if (!env.R2_BUCKET) {
      return jsonResponse({ error: 'R2_BUCKET not configured' }, 500, corsHeaders);
    }

    const body = await request.json();
    const { fileName, mimeType, fileSize } = body;

    console.log(`[Hybrid] Starting chunked upload: ${fileName} (${Math.round(fileSize / 1024 / 1024)}MB)`);

    // Generate unique temp filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileName.split('.').pop() || 'mp4';
    const tempKey = `temp/${timestamp}-${random}.${ext}`;

    // Create multipart upload in R2
    const multipartUpload = await env.R2_BUCKET.createMultipartUpload(tempKey, {
      httpMetadata: { contentType: mimeType || 'video/mp4' },
      customMetadata: { originalFilename: fileName },
    });

    console.log(`[Hybrid] Multipart started: ${multipartUpload.uploadId}`);

    return jsonResponse({
      success: true,
      uploadId: multipartUpload.uploadId,
      key: tempKey,
      originalFilename: fileName,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Hybrid] Start upload error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Upload a chunk to R2
async function handleUploadPart(request, env, corsHeaders) {
  try {
    const uploadId = request.headers.get('X-Upload-Id');
    const partNumber = parseInt(request.headers.get('X-Part-Number'), 10);
    const key = request.headers.get('X-Filename');

    if (!uploadId || !partNumber || !key) {
      return jsonResponse({ error: 'Missing upload headers' }, 400, corsHeaders);
    }

    console.log(`[Hybrid] Uploading part ${partNumber} for ${key}`);

    const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
    const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);

    console.log(`[Hybrid] Part ${partNumber} done, etag: ${uploadedPart.etag}`);

    return jsonResponse({
      success: true,
      partNumber: partNumber,
      etag: uploadedPart.etag,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Hybrid] Upload part error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// Complete R2 upload, then upload to Postiz, then cleanup
async function handleCompleteAndUploadToPostiz(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { uploadId, key, parts, originalFilename, mimeType, n8nWebhook } = body;

    if (!uploadId || !key || !parts) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    console.log(`[Hybrid] Completing R2 upload: ${key} with ${parts.length} parts`);

    // Step 1: Complete R2 multipart upload
    const multipartUpload = env.R2_BUCKET.resumeMultipartUpload(key, uploadId);
    await multipartUpload.complete(parts);
    console.log(`[Hybrid] R2 assembly complete`);

    // Step 2: Download from R2
    console.log(`[Hybrid] Downloading from R2...`);
    const r2Object = await env.R2_BUCKET.get(key);
    if (!r2Object) {
      return jsonResponse({ error: 'File not found in R2' }, 404, corsHeaders);
    }

    const fileArrayBuffer = await r2Object.arrayBuffer();
    const fileBlob = new Blob([fileArrayBuffer], { type: mimeType || 'video/mp4' });
    console.log(`[Hybrid] Downloaded ${(fileArrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

    // Step 3: Upload to Postiz
    console.log(`[Hybrid] Uploading to Postiz...`);
    const formData = new FormData();
    formData.append('file', fileBlob, originalFilename);

    const postizResponse = await fetch(POSTIZ_UPLOAD_URL, {
      method: 'POST',
      headers: { 'Authorization': POSTIZ_API_KEY },
      body: formData,
    });

    if (!postizResponse.ok) {
      const errorText = await postizResponse.text();
      console.error(`[Hybrid] Postiz error: ${postizResponse.status} - ${errorText}`);
      return jsonResponse({ error: `Postiz error: ${postizResponse.status}`, details: errorText }, postizResponse.status, corsHeaders);
    }

    const postizData = await postizResponse.json();
    console.log(`[Hybrid] Postiz upload success:`, postizData.id);

    // Step 4: Delete temp file from R2
    console.log(`[Hybrid] Cleaning up R2...`);
    await env.R2_BUCKET.delete(key);
    console.log(`[Hybrid] R2 cleanup done`);

    // Step 5: Notify n8n
    if (n8nWebhook) {
      await notifyN8n(n8nWebhook, postizData, originalFilename);
    }

    return jsonResponse({
      success: true,
      video_id: postizData.id,
      video_url: postizData.path,
      video_filename: postizData.name || originalFilename,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Hybrid] Complete upload error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

async function notifyN8n(webhookUrl, postizData, filename) {
  try {
    console.log(`[Hybrid] Notifying n8n...`);
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: postizData.id,
        video_url: postizData.path,
        video_filename: postizData.name || filename,
        upload_method: 'hybrid',
        timestamp: new Date().toISOString(),
      }),
    });
    console.log(`[Hybrid] n8n notified`);
  } catch (error) {
    console.error(`[Hybrid] n8n notification failed:`, error);
  }
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
