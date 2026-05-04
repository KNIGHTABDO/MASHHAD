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
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : (req.ip || '127.0.0.1');
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
      const ociProxyBase = ociProxyUrl.split('?')[0];
      
      // Swap OCI internal links for Vercel Bridge links
      // We use a global regex to ensure all occurrences are caught
      text = text.split(ociProxyBase).join(vercelProxyBase);

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
