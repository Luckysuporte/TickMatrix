import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ti = require('technicalindicators');
const RSI = ti.RSI;
const SMA = ti.SMA;
const ATR = ti.ATR;
const MACD = ti.MACD;
const EMA = ti.EMA;

interface Candle {
    high: number;
    low: number;
    close: number;
}


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
async function fetchBinanceCandles(symbol: string, interval: string): Promise<Candle[]> {
    const binSym = toBinanceSymbol(symbol);
    const url = `https://api.binance.com/api/v3/klines?symbol=${binSym}&interval=${interval}&limit=100`;
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
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=100&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Twelve Data HTTP error ${res.status}`);
    const json = await res.json();
    if (json.status === 'error') throw new Error(`Twelve Data API: ${json.message}`);
    // values are in reverse-chronological order → reverse to get oldest first
    const values: { high: string; low: string; close: string }[] = json.values ?? [];
    return values.reverse().map((v) => ({
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close)
    }));
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

function computeSignal(
    candles: Candle[],
    symbol: string,
    filters: { supertrend: boolean; rsi: boolean; macd: boolean; emas: boolean } = { supertrend: true, rsi: false, macd: false, emas: false }
): {
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
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

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

    // MACD 12, 26, 9
    const macdValues = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });
    // O último valor pode ser nulo se não houver candles suficientes
    const lastMacd = macdValues.length > 0 ? macdValues[macdValues.length - 1] : { MACD: 0, signal: 0, histogram: 0 };
    const macdLine = lastMacd.MACD ?? 0;
    const macdSignal = lastMacd.signal ?? 0;

    // EMAs 20 e 50
    const ema20Arr = EMA.calculate({ period: 20, values: closes });
    const ema50Arr = EMA.calculate({ period: 50, values: closes });
    const ema20 = ema20Arr[ema20Arr.length - 1] ?? price;
    const ema50 = ema50Arr[ema50Arr.length - 1] ?? price;

    // ATR 14
    const atrValues = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });
    const atr14 = atrValues[atrValues.length - 1] ?? (price * RISK_PERCENT); // fallback caso erro

    const trend: 'ALTA' | 'BAIXA' | 'LATERAL' =

        price > sma20 * 1.002 ? 'ALTA' : price < sma20 * 0.998 ? 'BAIXA' : 'LATERAL';

    let signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
    let signalStrength: 'FORTE' | 'FRACA' | 'NEUTRO';
    let entry: number, stopLoss: number, takeProfit1: number, takeProfit2: number, takeProfit3: number;
    let riskRewardString: string;

    const riskAmount = atr14 * 1.5;

    // --- REGRAS DE CONFLUÊNCIA ---
    const isBuyBase = price > sma20;
    const isSellBase = price < sma20;

    // Confirmações
    const rsiBuyConfirm = rsi14 > 50;
    const rsiSellConfirm = rsi14 < 50;

    const macdBuyConfirm = macdLine > macdSignal;
    const macdSellConfirm = macdLine < macdSignal;

    const emasBuyConfirm = ema20 > ema50;
    const emasSellConfirm = ema20 < ema50;

    // Pipeline Final
    // O sinal precisa passar no Base (SuperTrend Genérico provisório) e passar ESTRITAMENTE em todo filtro ligado.
    const buyCondition = isBuyBase
        && (!filters.rsi || rsiBuyConfirm)
        && (!filters.macd || macdBuyConfirm)
        && (!filters.emas || emasBuyConfirm);

    const sellCondition = isSellBase
        && (!filters.rsi || rsiSellConfirm)
        && (!filters.macd || macdSellConfirm)
        && (!filters.emas || emasSellConfirm);

    if (buyCondition) {
        signal = 'COMPRA';
        signalStrength = (rsiBuyConfirm && macdBuyConfirm) ? 'FORTE' : 'FRACA';
        entry = price;
        stopLoss = price - riskAmount;           // SL a 1.5x ATR
        takeProfit1 = price + riskAmount * 1;    // R:R 1:1
        takeProfit2 = price + riskAmount * REWARD_RATIO; // R:R 1:2 (principal)
        takeProfit3 = price + riskAmount * 3;    // R:R 1:3
        riskRewardString = `1:${REWARD_RATIO}`;

    } else if (sellCondition) {
        signal = 'VENDA';
        signalStrength = (rsiSellConfirm && macdSellConfirm) ? 'FORTE' : 'FRACA';
        entry = price;
        stopLoss = price + riskAmount;           // SL a 1.5x ATR
        takeProfit1 = price - riskAmount * 1;    // R:R 1:1
        takeProfit2 = price - riskAmount * REWARD_RATIO; // R:R 1:2 (principal)
        takeProfit3 = price - riskAmount * 3;    // R:R 1:3
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
            filters?: { supertrend: boolean; rsi: boolean; macd: boolean; emas: boolean };
        };

        // Sanitize & validate inputs
        const symbol = (body.symbol ?? '').trim().toUpperCase();
        const timeframe = (body.timeframe ?? '').trim();
        const assetType = (body.assetType ?? '').trim();
        const filters = body.filters ?? { supertrend: true, rsi: false, macd: false, emas: false };

        console.log(`[analyze] Recebido: symbol="${symbol}" timeframe="${timeframe}" assetType="${assetType}"`);

        if (!symbol || symbol.length < 2) {
            return NextResponse.json({ error: 'Símbolo inválido. Selecione um ativo da lista.' }, { status: 400 });
        }
        if (!timeframe || !assetType) {
            return NextResponse.json({ error: 'Parâmetros incompletos. Selecione timeframe e tipo de ativo.' }, { status: 400 });
        }

        let candles: Candle[];

        if (assetType === 'crypto') {
            const binanceInterval = TF_TO_BINANCE[timeframe] ?? '5m';
            candles = await fetchBinanceCandles(symbol, binanceInterval);
        } else {
            const tdInterval = TF_TO_TWELVEDATA[timeframe] ?? '5min';
            candles = await fetchTwelveDataCandles(symbol, tdInterval);
        }

        if (!candles || candles.length < 25) {
            return NextResponse.json({ error: 'Insufficient data from provider' }, { status: 422 });
        }

        const result = computeSignal(candles, symbol, filters);
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
