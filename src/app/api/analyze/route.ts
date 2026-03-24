import { NextRequest, NextResponse } from 'next/server';
import { analyzeStrategy1 } from '@/services/dataFeed';

interface Candle {
    high: number;
    low: number;
    close: number;
}

// ─── Timeframe mapping ────────────────────────────────────────────────────────
const TF_TO_BINANCE: Record<string, string> = {
    '1m': '1m', '5m': '5m', '10m': '10m', '15m': '15m',
    '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
};
const TF_TO_TWELVEDATA: Record<string, string> = {
    '1m': '1min', '5m': '5min', '10m': '10min', '15m': '15min',
    '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week',
};

// ─── Symbol normalisation for Binance ────────────────────────────────────────
function toBinanceSymbol(sym: string): string {
    if (sym.endsWith('USD') && !sym.endsWith('USDT')) return sym.replace(/USD$/, 'USDT');
    return sym;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchBinanceCandles(symbol: string, interval: string): Promise<Candle[]> {
    const binSym = toBinanceSymbol(symbol);
    const url = `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${interval}&limit=200`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Binance error ${res.status}: ${await res.text()}`);
    const data: unknown[][] = await res.json();
    return data.map((k) => ({
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string)
    }));
}

async function fetchTwelveDataCandles(symbol: string, interval: string): Promise<Candle[]> {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) throw new Error('TWELVE_DATA_API_KEY not configured');
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=200&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Twelve Data HTTP error ${res.status}`);
    const json = await res.json();
    if (json.status === 'error') throw new Error(`Twelve Data API: ${json.message}`);
    const values: { high: string; low: string; close: string }[] = json.values ?? [];
    return values.reverse().map((v) => ({
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close)
    }));
}

// ─── Smart decimal formatting by symbol ─────────────────────────────────────
function getDecimals(price: number, symbol: string): number {
    const sym = symbol.toUpperCase();
    if (sym.includes('JPY')) return 3;
    if (sym.includes('BTC') || price > 10000) return 2;
    if (price >= 100) return 2;
    if (price >= 1) return 5;
    return 6;
}

function fmtPrice(n: number, symbol: string): string {
    const dec = getDecimals(n, symbol);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            symbol: string; timeframe: string; assetType: string;
        };

        const symbol = (body.symbol ?? '').trim().toUpperCase();
        const timeframe = (body.timeframe ?? '').trim();
        const assetType = (body.assetType ?? '').trim();

        console.log(`[analyze] Recebido: symbol="${symbol}" timeframe="${timeframe}" assetType="${assetType}"`);

        if (!symbol || symbol.length < 2) {
            return NextResponse.json({ error: 'Símbolo inválido. Selecione um ativo da lista.' }, { status: 400 });
        }
        if (!timeframe || !assetType) {
            return NextResponse.json({ error: 'Parâmetros incompletos. Selecione timeframe e tipo de ativo.' }, { status: 400 });
        }

        let candles: Candle[];

        if (assetType === 'crypto') {
            const binanceInterval = TF_TO_BINANCE[timeframe] ?? '1m';
            candles = await fetchBinanceCandles(symbol, binanceInterval);
        } else {
            const tdInterval = TF_TO_TWELVEDATA[timeframe] ?? '1min';
            candles = await fetchTwelveDataCandles(symbol, tdInterval);
        }

        if (!candles || candles.length < 15) {
            return NextResponse.json({ error: 'Dados insuficientes do provedor' }, { status: 422 });
        }

        // ── Executa a TrendMatrix Sniper 1.5x ──────────────────────────────────
        const result = analyzeStrategy1(candles, symbol, timeframe);

        const price = result.currentPrice;
        const entry = result.entry;
        const stopLoss = result.stopLoss;
        const takeProfit = result.takeProfit; // alvo principal R:R 1.5
        const f = (n: number) => fmtPrice(n, symbol);

        // Extrai o High e Low do último candle para rastreamento de targets
        const lastCandle = candles[candles.length - 1];

        // Monta TP1/TP2/TP3 para compatibilidade com o frontend existente
        const risk = Math.abs(entry - stopLoss);
        const isBuy = result.signal === 'COMPRA';

        const tp1 = isBuy ? entry + risk * 1.0 : entry - risk * 1.0;  // R:R 1:1 (parcial)
        const tp2 = isBuy ? entry + risk * 1.5 : entry - risk * 1.5;  // R:R 1:1.5 (alvo principal)
        const tp3 = isBuy ? entry + risk * 2.0 : entry - risk * 2.0;  // R:R 1:2 (extensão)

        return NextResponse.json({
            ok: true,
            symbol,
            timeframe,
            signal: result.signal,
            signalStrength: result.isConfirmed ? 'FORTE' : 'NEUTRO',
            trend: result.supertrendDirection === 'up' ? 'ALTA' : 'BAIXA',
            confluencia: result.isConfirmed ? '2/2' : '0/2',
            isConfirmed: result.isConfirmed,
            aoValue: result.aoValue.toFixed(4),
            supertrendValue: f(result.supertrendValue),
            supertrendDirection: result.supertrendDirection,
            // Campos legados mantidos para compatibilidade
            rsi14: '—',
            sma20: f(result.supertrendValue),
            price: f(price),
            priceRaw: price,
            change: '0.00',
            high: f(lastCandle.high),
            low: f(lastCandle.low),
            currentHigh: lastCandle.high,
            currentLow: lastCandle.low,
            entry: f(entry),
            stopLoss: f(stopLoss),
            takeProfit1: f(tp1),
            takeProfit2: f(tp2),
            takeProfit3: f(tp3),
            riskReward: '1:1.5',
            // Valores brutos para cálculos no frontend
            entryRaw: entry,
            stopLossRaw: stopLoss,
            takeProfit1Raw: tp1,
            takeProfit2Raw: tp2,
            takeProfit3Raw: tp3,
            takeProfitRaw: tp2,  // Alvo principal (R:R 1.5)
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[analyze] error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
