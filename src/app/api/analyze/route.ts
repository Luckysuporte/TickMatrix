import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ti = require('technicalindicators');
const RSI = ti.RSI;
const SMA = ti.SMA;


// ─── Timeframe mapping ────────────────────────────────────────────────────────
// Binance → "1m","5m","15m","1h","4h","1d","1w"
// Twelve Data → "1min","5min","15min","1h","4h","1day","1week"
const TF_TO_BINANCE: Record<string, string> = {
    '1m': '1m', '5m': '5m', '10m': '10m', '15m': '15m',
    '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
};
const TF_TO_TWELVEDATA: Record<string, string> = {
    '1m': '1min', '5m': '5min', '10m': '10min', '15m': '15min',
    '1h': '1h', '4h': '4h', '1d': '1day', '1w': '1week',
};

// ─── Symbol normalisation for Binance ────────────────────────────────────────
// Frontend sends e.g. "BTCUSD" → Binance needs "BTCUSDT"
function toBinanceSymbol(sym: string): string {
    if (sym.endsWith('USD') && !sym.endsWith('USDT')) return sym.replace(/USD$/, 'USDT');
    return sym;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchBinanceClosePrices(symbol: string, interval: string): Promise<number[]> {
    const binSym = toBinanceSymbol(symbol);
    const url = `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${interval}&limit=100`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Binance error ${res.status}: ${await res.text()}`);
    const data: unknown[][] = await res.json();
    // kline[4] = close price
    return data.map((k) => parseFloat(k[4] as string));
}

async function fetchTwelveDataClosePrices(symbol: string, interval: string): Promise<number[]> {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) throw new Error('TWELVE_DATA_API_KEY not configured');
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=100&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Twelve Data HTTP error ${res.status}`);
    const json = await res.json();
    if (json.status === 'error') throw new Error(`Twelve Data API: ${json.message}`);
    // values are in reverse-chronological order → reverse to get oldest first
    const values: { close: string }[] = json.values ?? [];
    return values.reverse().map((v) => parseFloat(v.close));
}

// ─── Smart decimal formatting by symbol ─────────────────────────────────────
// JPY pairs: 3 decimals | Large prices (>=100): 2 | Forex USD: 5 | Mid (1-99): 3 | Micro (<1): 6
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
    // Use pt-BR locale with correct decimals
    return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ─── Signal decision ──────────────────────────────────────────────────────────
/*
  COMPRA  : price > SMA20 AND rsi < 35
  VENDA   : price < SMA20 AND rsi > 65
  NEUTRO  : everything else

  Risk management (V2 - percentage-based):
    riskPercent = 0.5% of price
    TP1 = entry ± risk×1  (R:R 1:1)
    TP2 = entry ± risk×2  (R:R 1:2)  ← card principal
    TP3 = entry ± risk×3  (R:R 1:3)
*/
const RISK_PERCENT = 0.005;   // 0.5%
const REWARD_RATIO = 2;       // Primary target is 1:2

function computeSignal(closes: number[], symbol: string): {
    signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
    signalStrength: 'FORTE' | 'FRACA' | 'NEUTRO';
    price: number;
    sma20: number;
    rsi14: number;
    entry: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    riskReward: string;
    trend: 'ALTA' | 'BAIXA' | 'LATERAL';
    confluencia: string;
    change: number;
    high: number;
    low: number;
} {
    const price = closes[closes.length - 1];
    const high = Math.max(...closes.slice(-20));
    const low = Math.min(...closes.slice(-20));
    const change = ((price - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;

    // SMA 20
    const smaValues = SMA.calculate({ period: 20, values: closes });
    const sma20 = smaValues[smaValues.length - 1] ?? price;

    // RSI 14
    const rsiValues = RSI.calculate({ period: 14, values: closes });
    const rsi14 = rsiValues[rsiValues.length - 1] ?? 50;

    const trend: 'ALTA' | 'BAIXA' | 'LATERAL' =
        price > sma20 * 1.002 ? 'ALTA' : price < sma20 * 0.998 ? 'BAIXA' : 'LATERAL';

    let signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
    let signalStrength: 'FORTE' | 'FRACA' | 'NEUTRO';
    let entry: number, stopLoss: number, takeProfit1: number, takeProfit2: number, takeProfit3: number;
    let riskRewardString: string;

    const riskAmount = price * RISK_PERCENT;

    if (price > sma20 && rsi14 < 35) {
        signal = 'COMPRA';
        signalStrength = rsi14 < 25 ? 'FORTE' : 'FRACA';
        entry = price;
        stopLoss = price - riskAmount;           // -0.5%
        takeProfit1 = price + riskAmount * 1;      // R:R 1:1
        takeProfit2 = price + riskAmount * REWARD_RATIO; // R:R 1:2 (principal)
        takeProfit3 = price + riskAmount * 3;      // R:R 1:3
        riskRewardString = `1:${REWARD_RATIO}`;

    } else if (price < sma20 && rsi14 > 65) {
        signal = 'VENDA';
        signalStrength = rsi14 > 75 ? 'FORTE' : 'FRACA';
        entry = price;
        stopLoss = price + riskAmount;           // +0.5%
        takeProfit1 = price - riskAmount * 1;      // R:R 1:1
        takeProfit2 = price - riskAmount * REWARD_RATIO; // R:R 1:2 (principal)
        takeProfit3 = price - riskAmount * 3;      // R:R 1:3
        riskRewardString = `1:${REWARD_RATIO}`;

    } else {
        signal = 'NEUTRO';
        signalStrength = 'NEUTRO';
        entry = price;
        stopLoss = price - riskAmount;
        takeProfit1 = price + riskAmount;
        takeProfit2 = price + riskAmount * REWARD_RATIO;
        takeProfit3 = price + riskAmount * 3;
        riskRewardString = '1:0';
    }

    // Confluencia: count aligned factors
    let factors = 0;
    if ((signal === 'COMPRA' && price > sma20) || (signal === 'VENDA' && price < sma20)) factors++;
    if ((signal === 'COMPRA' && rsi14 < 50) || (signal === 'VENDA' && rsi14 > 50)) factors++;
    if ((signal === 'COMPRA' && trend === 'ALTA') || (signal === 'VENDA' && trend === 'BAIXA')) factors++;
    const confluencia = `${factors}/3`;

    return { signal, signalStrength, price, sma20, rsi14, entry, stopLoss, takeProfit1, takeProfit2, takeProfit3, riskReward: riskRewardString, trend, confluencia, change, high, low };
}


// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as {
            symbol: string; timeframe: string; assetType: string;
        };

        // Sanitize & validate inputs
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

        let closes: number[];

        if (assetType === 'crypto') {
            const binanceInterval = TF_TO_BINANCE[timeframe] ?? '5m';
            closes = await fetchBinanceClosePrices(symbol, binanceInterval);
        } else {
            const tdInterval = TF_TO_TWELVEDATA[timeframe] ?? '5min';
            closes = await fetchTwelveDataClosePrices(symbol, tdInterval);
        }

        if (!closes || closes.length < 25) {
            return NextResponse.json({ error: 'Insufficient data from provider' }, { status: 422 });
        }

        const result = computeSignal(closes, symbol);
        const f = (n: number) => fmtPrice(n, symbol);

        return NextResponse.json({
            ok: true,
            symbol,
            timeframe,
            signal: result.signal,
            signalStrength: result.signalStrength,
            trend: result.trend,
            confluencia: result.confluencia,
            rsi14: result.rsi14.toFixed(2),
            sma20: f(result.sma20),
            price: f(result.price),
            priceRaw: result.price,
            change: result.change.toFixed(2),
            high: f(result.high),
            low: f(result.low),
            entry: f(result.entry),
            stopLoss: f(result.stopLoss),
            // TP1 = R:R 1:1  |  takeProfit1 no card principal = TP2 (1:2)  |  TP3 = 1:3
            takeProfit1: f(result.takeProfit2),   // card principal exibe o alvo 1:2
            takeProfit2: f(result.takeProfit2),
            takeProfit3: f(result.takeProfit3),
            riskReward: result.riskReward,        // "1:2"
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[analyze] error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
