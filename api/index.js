/**
 * Vercel serverless function for Shopify Hydrogen
 * Adapts Hydrogen's Oxygen/Workers fetch handler to Vercel's Node.js runtime
 */

// This will be the built server from dist/server/index.js
let serverModule;

// Initialize server module (lazy load to avoid build-time issues)
async function getServerModule() {
  if (!serverModule) {
    serverModule = await import('../dist/server/index.js');
  }
  return serverModule.default;
}

// Convert Vercel Node.js request to Web Fetch API Request
function createFetchRequest(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const url = new URL(req.url || '/', `${protocol}://${host}`);

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
    }
  });

  const requestInit = {
    method: req.method || 'GET',
    headers,
  };

  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    requestInit.body = req.body ?
      (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) :
      null;
  }

  return new Request(url.toString(), requestInit);
}

// Convert Web Fetch API Response to Vercel Node.js response
async function sendFetchResponse(res, fetchResponse) {
  // Set status
  res.status(fetchResponse.status);

  // Set headers
  for (const [key, value] of fetchResponse.headers.entries()) {
    res.setHeader(key, value);
  }

  // Send body
  if (fetchResponse.body) {
    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } else {
    res.end();
  }
}

// Main Vercel handler
export default async function handler(req, res) {
  try {
    // Get the Hydrogen server module
    const server = await getServerModule();

    // Create Fetch API Request
    const request = createFetchRequest(req);

    // Create execution context (Cloudflare Workers compatible)
    const executionContext = {
      waitUntil: (promise) => {
        // Vercel doesn't have waitUntil, but we can track promises
        if (promise && typeof promise.catch === 'function') {
          promise.catch(err => console.error('Background task error:', err));
        }
      },
      passThroughOnException: () => {},
    };

    // Call Hydrogen's fetch handler
    const response = await server.fetch(
      request,
      process.env, // Env
      executionContext
    );

    // Send response
    await sendFetchResponse(res, response);

  } catch (error) {
    console.error('[Hydrogen/Vercel] Server error:', error);

    // Send error response
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
