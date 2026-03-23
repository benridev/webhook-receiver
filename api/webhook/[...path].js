import { db } from '../_utils/db.js';
import crypto from 'crypto';

// Disable Next.js body parser to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Read raw body buffer from request
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Verify LINE signature using raw body string
function verifyLineSignature(channelSecret, signature, rawBody) {
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');
  return signature === hash;
}

// Build cURL command from a webhook log entry (importable into Postman via Raw Text)
export function buildCurlCommand(log) {
  const payload = log.data || log.payload;
  const headers = payload?.headers || {};
  const allowedHeaders = ['accept', 'user-agent', 'content-type', 'x-line-signature'];

  // Strip query string from url
  const url = (payload?.url || '').split('?')[0];

  // Use rawBody for valid signature replay, fallback to re-serialized body
  const body = payload?.rawBody || JSON.stringify(payload?.body ?? {});

  const headerFlags = Object.entries(headers)
    .filter(([key]) => allowedHeaders.includes(key.toLowerCase()))
    .map(([key, value]) => `  -H ${JSON.stringify(`${key}: ${value}`)}`)
    .join(' \
');

  // Escape single quotes in body for shell safety
  const escapedBody = body.replace(/'/g, `'\''`);

  return `curl '${url}' \
  -X ${payload?.method || 'POST'} \
${headerFlags} \
  --data-raw '${escapedBody}'`;
}

export default async function handler(req, res) {
  console.log('=== Webhook Request ===');
  console.log('Query params:', req.query);
  console.log('Headers:', req.headers);

  const path = req.query['...path'] || req.query.path;

  if (!path || (Array.isArray(path) && path.length === 0)) {
    console.error('No path in query');
    return res.status(404).json({ error: 'Webhook path not found' });
  }

  const webhookPath = Array.isArray(path) ? path.join('/') : path;
  console.log('Looking for webhook path:', webhookPath);

  // Read raw body BEFORE any parsing
  const rawBodyBuffer = await getRawBody(req);
  const rawBodyString = rawBodyBuffer.toString('utf8');

  let body;
  try {
    body = JSON.parse(rawBodyString);
  } catch (e) {
    console.error('Failed to parse body as JSON:', e);
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.log('Raw body string:', rawBodyString);

  try {
    const endpoint = await db.getEndpointByPath(webhookPath);
    console.log('Database result:', endpoint);

    if (!endpoint) {
      console.error('Endpoint not found for path:', webhookPath);
      return res.status(404).json({
        error: 'Webhook endpoint not found',
        path: webhookPath,
      });
    }

    console.log('Found endpoint:', endpoint.id);

    const signature = req.headers['x-line-signature'];

    if (!signature) {
      console.error('Missing LINE signature header');
      return res.status(400).json({ error: 'Missing LINE signature' });
    }

    // ✅ Verify using the TRUE raw body string (not re-serialized)
    const isValid = verifyLineSignature(
      endpoint.line_channel_secret,
      signature,
      rawBodyString
    );

    if (!isValid) {
      console.error('Invalid signature:', { rawBodyString, signature });
      return res.status(401).json({ error: 'Invalid LINE signature' });
    }

    console.log('Signature verified successfully');

    // Handle LINE webhook verification (empty events array)
    if (body.events && body.events.length === 0) {
      console.log('LINE verification request received for:', webhookPath);
      return res.status(200).json({ message: 'Verification successful' });
    }

    // ✅ Store rawBody so Postman export can replay with valid signature
    const webhookData = {
      method: req.method,
      url: `https://${req.headers.host}${req.url}`,
      headers: req.headers,
      body: body,
      rawBody: rawBodyString, // original string for Postman export
      query: req.query,
      timestamp: new Date().toISOString(),
    };

    await db.saveWebhookLog(endpoint.id, req.method, webhookData);

    console.log('Webhook saved successfully');
    return res.status(200).json({ message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook error details:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}