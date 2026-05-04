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
    // We pass the browser's User-Agent so the OCI proxy can use it
    const response = await fetch(`${ociProxyUrl}?token=${ociProxyToken}&url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'X-Proxy-Token': ociProxyToken,
        'User-Agent': req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
