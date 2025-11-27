/**
 * Cloudflare Worker - Direct Upload to Postiz
 *
 * Browser uploads directly to this Worker, which forwards to Postiz API.
 * Then notifies n8n with just the video ID (no large file transfer!)
 *
 * Flow:
 * Browser -> Cloudflare Worker -> Postiz API
 *                |
 *                v
 *            n8n Webhook (only JSON with video ID)
 */

// IMPORTANT: Set this in Cloudflare Worker Settings -> Variables
// Add a variable named POSTIZ_API_KEY with your Postiz API key
const POSTIZ_UPLOAD_URL = 'https://api.postiz.com/public/v1/upload';

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Filename, X-Filetype, X-N8N-Webhook',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Upload endpoint - forwards to Postiz
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUploadToPostiz(request, env, corsHeaders);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        version: 'postiz-direct-v1',
        hasApiKey: !!env.POSTIZ_API_KEY
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

async function handleUploadToPostiz(request, env, corsHeaders) {
  try {
    // Check for API key
    if (!env.POSTIZ_API_KEY) {
      return jsonResponse({
        error: 'POSTIZ_API_KEY not configured in Worker settings'
      }, 500, corsHeaders);
    }

    const filename = request.headers.get('X-Filename') || 'video.mp4';
    const filetype = request.headers.get('X-Filetype') || 'video/mp4';
    const n8nWebhook = request.headers.get('X-N8N-Webhook') || null;

    console.log(`[Postiz Upload] Starting: ${filename}`);

    // Create FormData for Postiz
    const formData = new FormData();

    // Get the file from request
    const contentType = request.headers.get('Content-Type') || '';

    let fileBlob;
    if (contentType.includes('multipart/form-data')) {
      // FormData upload from browser
      const incomingFormData = await request.formData();
      fileBlob = incomingFormData.get('file');
    } else {
      // Raw binary upload
      const arrayBuffer = await request.arrayBuffer();
      fileBlob = new Blob([arrayBuffer], { type: filetype });
    }

    if (!fileBlob) {
      return jsonResponse({ error: 'No file provided' }, 400, corsHeaders);
    }

    // Create new FormData for Postiz
    formData.append('file', fileBlob, filename);

    console.log(`[Postiz Upload] Forwarding to Postiz API...`);

    // Upload to Postiz
    const postizResponse = await fetch(POSTIZ_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.POSTIZ_API_KEY}`,
      },
      body: formData,
    });

    if (!postizResponse.ok) {
      const errorText = await postizResponse.text();
      console.error(`[Postiz Upload] Postiz API error: ${postizResponse.status} - ${errorText}`);
      return jsonResponse({
        error: `Postiz API error: ${postizResponse.status}`,
        details: errorText
      }, postizResponse.status, corsHeaders);
    }

    const postizData = await postizResponse.json();
    console.log(`[Postiz Upload] Success:`, postizData);

    // If n8n webhook provided, notify it
    if (n8nWebhook) {
      try {
        console.log(`[Postiz Upload] Notifying n8n webhook...`);
        await fetch(n8nWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: postizData.id,
            video_url: postizData.path,
            video_filename: postizData.name || filename,
            upload_method: 'postiz-direct',
            timestamp: new Date().toISOString(),
          }),
        });
        console.log(`[Postiz Upload] n8n notified`);
      } catch (n8nError) {
        console.error(`[Postiz Upload] n8n notification failed:`, n8nError);
        // Don't fail the whole request if n8n notification fails
      }
    }

    return jsonResponse({
      success: true,
      video_id: postizData.id,
      video_url: postizData.path,
      video_filename: postizData.name || filename,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Postiz Upload] Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
