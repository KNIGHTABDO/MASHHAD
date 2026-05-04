import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  const ociProxyUrl = process.env.OCI_PROXY_URL;
  const ociProxyToken = process.env.OCI_PROXY_TOKEN;

  if (!ociProxyUrl || !ociProxyToken) {
    return new NextResponse('Proxy configuration missing', { status: 500 });
  }

  try {
    // Correctly extract the Client IP from Vercel headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Mozilla/5.0';

    // Forward to OCI Proxy
    const response = await fetch(`${ociProxyUrl}?token=${ociProxyToken}&url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'X-Proxy-Token': ociProxyToken,
        'X-Forwarded-For': clientIp,
        'X-Real-IP': clientIp,
        'User-Agent': userAgent,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('x-mpegurl') || targetUrl.includes('.m3u8');

    if (isM3U8) {
      let text = await response.text();
      const vercelProxyBase = `${url.origin}/api/proxy`;
      
      // Aggressively replace any OCI IP variations to force them through our bridge
      // This catches both http://84.8.217.17/proxy and http://84.8.217.17/api/proxy
      text = text.split('http://84.8.217.17/api/proxy').join(vercelProxyBase);
      text = text.split('http://84.8.217.17/proxy').join(vercelProxyBase);
      text = text.split('http://84.8.217.17').join(url.origin); // Catch-all for any other raw OCI links

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
