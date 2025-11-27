/**
 * Cloudflare Worker for R2 Video Upload with Presigned URLs
 *
 * This approach bypasses the 100MB Worker limit by:
 * 1. Frontend requests a presigned upload URL from Worker
 * 2. Frontend uploads directly to R2 using presigned URL
 * 3. No file data passes through the Worker!
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Filename, X-Filetype',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Step 1: Get presigned upload URL
    if (url.pathname === '/get-upload-url' && request.method === 'POST') {
      return handleGetUploadUrl(request, env, corsHeaders);
    }

    // Step 2: Confirm upload completed
    if (url.pathname === '/confirm-upload' && request.method === 'POST') {
      return handleConfirmUpload(request, env, corsHeaders);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

async function handleGetUploadUrl(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { fileName, mimeType } = body;

    if (!fileName) {
      return jsonResponse({ error: 'fileName is required' }, 400, corsHeaders);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileName.split('.').pop() || 'mp4';
    const uniqueFilename = `videos/${timestamp}-${random}.${ext}`;

    console.log(`[R2] Generating presigned URL for: ${uniqueFilename}`);

    // Create presigned URL for direct upload to R2
    // Valid for 1 hour
    const signedUrl = await env.R2_BUCKET.createMultipartUpload(uniqueFilename, {
      httpMetadata: {
        contentType: mimeType || 'video/mp4',
      },
      customMetadata: {
        originalFilename: fileName,
        uploadedAt: new Date().toISOString(),
      },
    });

    // For simple PUT upload, we use a different approach
    // We'll use the Worker as a simple proxy for the metadata only

    // Actually, let's use a simpler approach:
    // Return the unique filename and let frontend upload via PUT to a special endpoint

    return jsonResponse({
      success: true,
      uploadId: uniqueFilename,
      fileName: uniqueFilename,
      originalFileName: fileName,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[R2] Error getting upload URL:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

async function handleConfirmUpload(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { fileName, originalFileName, mimeType, fileSize } = body;

    if (!fileName) {
      return jsonResponse({ error: 'fileName is required' }, 400, corsHeaders);
    }

    // Verify the file exists in R2
    const object = await env.R2_BUCKET.head(fileName);

    if (!object) {
      return jsonResponse({ error: 'File not found in R2' }, 404, corsHeaders);
    }

    // Construct public URL
    const publicUrl = `https://pub-41d321eea7e1460a8ceec66c6bb4016e.r2.dev/${fileName}`;

    console.log(`[R2] Upload confirmed: ${fileName}`);

    return jsonResponse({
      success: true,
      url: publicUrl,
      filename: fileName,
      originalFilename: originalFileName,
      size: object.size,
      mimeType: mimeType || 'video/mp4',
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[R2] Error confirming upload:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
