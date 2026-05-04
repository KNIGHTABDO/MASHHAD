import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
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
    // We pass the current origin so the OCI proxy can (optionally) rewrite URLs to point back here
    const response = await fetch(`${ociProxyUrl}?token=${ociProxyToken}&url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'X-Proxy-Token': ociProxyToken,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || targetUrl.includes('.m3u8');

    if (isM3U8) {
      let text = await response.text();
      
      // The OCI proxy might have rewritten URLs to http://84.8.217.17/api/proxy...
      // We need to change those to https://your-domain.vercel.app/api/proxy...
      // to avoid Mixed Content blocks in the browser.
      const vercelProxyBase = `${origin}/api/proxy`;
      const ociProxyBase = ociProxyUrl.split('?')[0];
      
      // Replace OCI proxy URLs with Vercel proxy URLs
      // This ensures segments (.ts files) are also fetched via HTTPS through this bridge
      text = text.replaceAll(ociProxyBase, vercelProxyBase);
      
      // Also catch any raw http: links that might have slipped through
      text = text.replaceAll('http://', 'https://'); 

      return new NextResponse(text, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Proxy Bridge] Error:', errorMessage);
    return new NextResponse(errorMessage, { status: 500 });
  }
}
