import { NextRequest, NextResponse } from 'next/server';

// ─── GET /api/symbol-search?q={term} ─────────────────────────────────────────
// Proxy seguro para o endpoint symbol_search da Twelve Data.
// A chave de API fica exclusivamente no servidor — nunca exposta ao client.
export async function GET(req: NextRequest) {
    const q = req.nextUrl.searchParams.get('q')?.trim();

    if (!q || q.length < 1) {
        return NextResponse.json({ results: [] });
    }

    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        const url = `https://api.twelvedata.com/symbol_search?symbol=${encodeURIComponent(q)}&outputsize=8&apikey=${apiKey}`;
        const res = await fetch(url, { next: { revalidate: 0 } });

        if (!res.ok) {
            return NextResponse.json({ error: `Twelve Data HTTP ${res.status}` }, { status: 502 });
        }

        const json = await res.json();

        // Normaliza a resposta — pode vir como { data: [...] } ou { message: "..." }
        if (json.status === 'error' || json.message) {
            return NextResponse.json({ results: [] });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = Array.isArray(json.data) ? json.data : [];

        const results = raw.map((item) => ({
            symbol: item.symbol ?? '',
            instrument_name: item.instrument_name ?? item.symbol ?? '',
            exchange: item.exchange ?? '',
            country: item.country ?? '',
            type: item.instrument_type ?? '',
        }));

        return NextResponse.json({ results });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[symbol-search] error:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
