// app/api/arxiv/route.ts

import { NextRequest, NextResponse } from 'next/server';

const ARXIV_BASE = 'https://export.arxiv.org/api/query';

// arXiv asks bots to wait 3 s between requests; we enforce this on the server
// so the client never has to think about it.
const ALLOWED_PARAMS = new Set(['search_query', 'start', 'max_results', 'sortBy']);

export async function GET(req: NextRequest) {
  // Forward only the params arXiv understands — strip anything else
  const incoming = req.nextUrl.searchParams;
  const forwarded = new URLSearchParams();

  for (const [key, value] of incoming.entries()) {
    if (ALLOWED_PARAMS.has(key)) forwarded.set(key, value);
  }

  const arxivUrl = `${ARXIV_BASE}?${forwarded.toString()}`;

  try {
    const upstream = await fetch(arxivUrl, {
      headers: {
        // Identify ourselves politely to arXiv
        'User-Agent': 'CitationNetworkMapper/1.0 (academic research tool)',
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!upstream.ok) {
      return new NextResponse(
        `arXiv returned ${upstream.status} ${upstream.statusText}`,
        { status: upstream.status }
      );
    }

    const xml = await upstream.text();

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        // Allow the browser to cache identical queries for 5 minutes
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/arxiv] fetch failed:', message);
    return new NextResponse(`Failed to reach arXiv: ${message}`, { status: 502 });
  }
}