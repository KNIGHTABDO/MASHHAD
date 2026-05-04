import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  
  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  const ociProxyUrl = process.env.OCI_PROXY_URL;
  const ociProxyToken = process.env.OCI_PROXY_TOKEN;

  if (!ociProxyUrl || !ociProxyToken) {
    return new NextResponse('Proxy configuration missing', { status: 500 });
  }

  try {
    // Forward the request to the OCI Proxy
    const response = await fetch(`${ociProxyUrl}?token=${ociProxyToken}&url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'X-Proxy-Token': ociProxyToken,
      },
    });

    const contentType = response.headers.get('content-type');
    const body = await response.arrayBuffer();

    // Proxy the response back to the browser
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*', // Ensure CORS is allowed
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('[Proxy Bridge] Error:', error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}
