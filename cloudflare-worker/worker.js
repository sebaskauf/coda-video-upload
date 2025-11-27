/**
 * Cloudflare Worker for R2 Video Upload
 *
 * This worker handles direct uploads from the frontend to R2
 * Deploy this to Cloudflare Workers and bind your R2 bucket
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
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Filename, X-Filetype',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);

    // Upload endpoint
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleUpload(request, env) {
  try {
    const contentType = request.headers.get('Content-Type') || '';

    let file;
    let filename;
    let filetype;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData upload
      const formData = await request.formData();
      file = formData.get('file');
      filename = formData.get('fileName') || file?.name || 'video.mp4';
      filetype = formData.get('mimeType') || file?.type || 'video/mp4';
    } else {
      // Handle raw binary upload
      file = await request.arrayBuffer();
      filename = request.headers.get('X-Filename') || 'video.mp4';
      filetype = request.headers.get('X-Filetype') || 'video/mp4';
    }

    if (!file) {
      return jsonResponse({ error: 'No file provided' }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop() || 'mp4';
    const uniqueFilename = `videos/${timestamp}-${random}.${ext}`;

    // Get file data as ArrayBuffer
    const fileData = file instanceof File ? await file.arrayBuffer() : file;

    // Upload to R2
    await env.R2_BUCKET.put(uniqueFilename, fileData, {
      httpMetadata: {
        contentType: filetype,
      },
      customMetadata: {
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Construct public URL
    const publicUrl = `https://pub-41d321eea7e1460a8ceec66c6bb4016e.r2.dev/${uniqueFilename}`;

    console.log(`[R2 Upload] Success: ${uniqueFilename}`);

    return jsonResponse({
      success: true,
      url: publicUrl,
      filename: uniqueFilename,
      originalFilename: filename,
      size: fileData.byteLength,
      mimeType: filetype,
    });

  } catch (error) {
    console.error('[R2 Upload] Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
