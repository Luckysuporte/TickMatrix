// eslint-disable-next-line @typescript-eslint/no-require-imports
const ti = require('technicalindicators');
const ATR = ti.ATR;

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface Candle {
  high: number;
  low: number;
  close: number;
  open?: number;
}

export interface Strategy1Result {
  asset: string;
  timeframe: string;
  signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
  currentPrice: number;
  supertrendValue: number;
  supertrendDirection: 'up' | 'down';
  entry: number;
  stopLoss: number;
  takeProfit: number; // R:R 1.5
  aoValue: number;   // valor do AO para debug/display
  isConfirmed: boolean; // AO confirma o sinal
}

// ─── SuperTrend ───────────────────────────────────────────────────────────────
/**
 * Calcula o SuperTrend conforme ta.supertrend() do Pine Script.
 * Em Pine: dir < 0 = bullish (preço acima), dir > 0 = bearish (preço abaixo).
 * Aqui retornamos direction: 'up' = bullish, 'down' = bearish.
 */
function computeSupertrend(
  highs: number[],
  lows: number[],
  closes: number[],
  atrPeriod: number,
  factor: number
): { value: number; direction: 'up' | 'down' }[] {
  if (closes.length < atrPeriod + 1) return [];

  const atrArr: number[] = ATR.calculate({ period: atrPeriod, high: highs, low: lows, close: closes });
  const offset = closes.length - atrArr.length;

  const results: { value: number; direction: 'up' | 'down' }[] = [];

  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevST = 0;
  let prevDir: 'up' | 'down' = 'up';

  for (let i = 0; i < atrArr.length; i++) {
    const idx = i + offset;
    const hl2 = (highs[idx] + lows[idx]) / 2;
    const atr = atrArr[i];

    let upperBand = hl2 + factor * atr;
    let lowerBand = hl2 - factor * atr;

    if (i > 0) {
      // Lower band: só sobe, nunca desce se preço estava acima
      lowerBand = (lowerBand > prevLowerBand || closes[idx - 1] < prevLowerBand)
        ? lowerBand
        : prevLowerBand;
      // Upper band: só desce, nunca sobe se preço estava abaixo
      upperBand = (upperBand < prevUpperBand || closes[idx - 1] > prevUpperBand)
        ? upperBand
        : prevUpperBand;
    }

    let dir: 'up' | 'down';
    let stVal: number;

    if (i === 0) {
      dir = closes[idx] > upperBand ? 'up' : 'down';
    } else {
      if (prevST === prevUpperBand) {
        // estava bearish → só vira bullish se close > upper
        dir = closes[idx] > upperBand ? 'up' : 'down';
      } else {
        // estava bullish → só vira bearish se close < lower
        dir = closes[idx] < lowerBand ? 'down' : 'up';
      }
    }

    stVal = dir === 'up' ? lowerBand : upperBand;

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevST = stVal;
    prevDir = dir;

    results.push({ value: stVal, direction: dir });
  }

  return results;
}

// ─── Awesome Oscillator com Wavelet Smoothing ─────────────────────────────────
/**
 * Calcula o AO com Wavelet Enhancement conforme o indicador AIBitcoinTrend.
 * Parâmetros conforme a estratégia TrendMatrix: shortPeriod=1, longPeriod=23,
 * wavelet periods: 3, 8, 21 | weights: 0.5, 0.3, 0.2
 */
function smaSlice(arr: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < arr.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += arr[j];
    result.push(sum / period);
  }
  return result;
}

function stdev(arr: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < arr.length; i++) {
    const slice = arr.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    result.push(Math.sqrt(variance));
  }
  return result;
}

function computeAOWavelet(
  highs: number[],
  lows: number[],
  aoShort = 1,
  aoLong = 23,
  w1 = 3,
  w2 = 8,
  w3 = 21,
  wt1 = 0.5,
  wt2 = 0.3,
  wt3 = 0.2,
  normPeriod = 50
): number[] {
  const midPrices = highs.map((h, i) => (h + lows[i]) / 2);

  // AO bruto = SMA(mid, short) - SMA(mid, long)
  const smaShort = smaSlice(midPrices, aoShort);
  const smaLong = smaSlice(midPrices, aoLong);

  // Alinha pelo menor array (long é mais lento)
  const offsetAO = midPrices.length - smaLong.length;
  const ao: number[] = smaLong.map((_, i) => smaShort[i + offsetAO] - smaLong[i]);

  // Wavelet smoothing
  const wSma1 = smaSlice(ao, w1);
  const wSma2 = smaSlice(ao, w2);
  const wSma3 = smaSlice(ao, w3);

  // Alinha pelo menor (wSma3 é mais curto)
  const offsetW = ao.length - wSma3.length;
  const advancedRaw: number[] = wSma3.map((_, i) => {
    const aoIdx = i + offsetW;
    const d1 = ao[aoIdx] - wSma1[i + (wSma1.length - wSma3.length)];
    const d2 = wSma1[i + (wSma1.length - wSma3.length)] - wSma2[i + (wSma2.length - wSma3.length)];
    const d3 = wSma2[i + (wSma2.length - wSma3.length)] - wSma3[i];
    const combined = wt1 * d1 + wt2 * d2 + wt3 * d3;
    // Transformação não-linear: log(|x|+1) * sqrt(|x|) * sign(x)
    const absC = Math.abs(combined);
    return Math.log(absC + 1) * Math.sqrt(absC) * Math.sign(combined);
  });

  // Normalização pelo desvio padrão (normPeriod)
  const normArr = stdev(advancedRaw, Math.min(normPeriod, advancedRaw.length));
  const normOffset = advancedRaw.length - normArr.length;

  const advancedAO: number[] = normArr.map((sd, i) => {
    const val = advancedRaw[i + normOffset];
    return sd > 0 ? val / sd : 0;
  });

  return advancedAO; // último elemento = AO da vela mais recente
}

// ─── Highest / Lowest ─────────────────────────────────────────────────────────
function highest(arr: number[], lookback: number, endIdx: number): number {
  const start = Math.max(0, endIdx - lookback + 1);
  return Math.max(...arr.slice(start, endIdx + 1));
}

function lowest(arr: number[], lookback: number, endIdx: number): number {
  const start = Math.max(0, endIdx - lookback + 1);
  return Math.min(...arr.slice(start, endIdx + 1));
}

// ─── TrendMatrix Sniper 1.5x ─────────────────────────────────────────────────
/**
 * Estratégia TrendMatrix Sniper 1.5x
 *
 * Indicadores:
 *   - SuperTrend Destur ST1 (ATR=12, Fator=3.0) → sinal de tendência
 *   - Awesome Oscillator Wavelet (Short=1, Long=23) → filtro de momento
 *
 * Regras:
 *   - COMPRA: ST1 virou bullish NA VELA FECHADA (candles[-2]) + AO > 0
 *   - VENDA : ST1 virou bearish NA VELA FECHADA (candles[-2]) + AO < 0
 *   - Entrada: close da última vela confirmada (candles[-1])
 *   - Stop Loss dinâmico: lowest(low, 15) para COMPRA / highest(high, 15) para VENDA
 *   - Take Profit: entrada ± (|entrada - SL| × 1.5)
 */
export function analyzeStrategy1(
  candles: Candle[],
  symbol: string,
  timeframe: string
): Strategy1Result {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const n = candles.length;

  const price = closes[n - 1]; // preço atual (última vela fechada)

  const neutralResult = (ao = 0): Strategy1Result => ({
    asset: symbol, timeframe,
    signal: 'NEUTRO', currentPrice: price,
    supertrendValue: 0, supertrendDirection: 'up',
    entry: price, stopLoss: price, takeProfit: price,
    aoValue: ao, isConfirmed: false,
  });

  // Precisamos de ao menos 60 candles para todos os cálculos
  if (n < 60) return neutralResult();

  // ── 1. SuperTrend ST1 (ATR=12, Fator=3.0) ──────────────────────────────────
  const stResults = computeSupertrend(highs, lows, closes, 12, 3.0);
  if (stResults.length < 2) return neutralResult();

  // Vela de sinal = penúltima (index[1] em Pine = candle já fechada, não a atual)
  const signalST   = stResults[stResults.length - 2]; // vela do sinal (fechada)
  const prevST     = stResults[stResults.length - 3] ?? signalST; // anterior ao sinal
  const currentST  = stResults[stResults.length - 1]; // vela atual

  // Virada: direção mudou do penúltimo para o último ST calculado sobre a vela de sinal
  const flippedBullish = prevST.direction === 'down' && signalST.direction === 'up';
  const flippedBearish = prevST.direction === 'up'  && signalST.direction === 'down';

  // ── 2. AO Wavelet (Short=1, Long=23) ───────────────────────────────────────
  const aoArr = computeAOWavelet(highs, lows, 1, 23);
  if (aoArr.length < 2) return neutralResult();

  // AO da vela de sinal (penúltima)
  const aoSignalBar = aoArr[aoArr.length - 2];
  const aoCurrentBar = aoArr[aoArr.length - 1];

  // ── 3. Confirmação do sinal ─────────────────────────────────────────────────
  // Regra: virada ST na vela fechada + AO confirma na mesma vela
  let signal: 'COMPRA' | 'VENDA' | 'NEUTRO' = 'NEUTRO';
  let isConfirmed = false;

  if (flippedBullish && aoSignalBar > 0) {
    signal = 'COMPRA';
    isConfirmed = true;
  } else if (flippedBearish && aoSignalBar < 0) {
    signal = 'VENDA';
    isConfirmed = true;
  } else {
    // Sem virada recente, mas mostra a direção atual para contexto
    signal = 'NEUTRO';
  }

  // Valor do ST para display (vela atual)
  const supertrendValue = currentST.value;
  const supertrendDirection = currentST.direction;

  // ── 4. Gerenciamento: Entrada, SL dinâmico, TP 1.5x ────────────────────────
  // Entrada = close da última vela (pessoa entra na vela seguinte ao sinal)
  const entry = closes[n - 1];

  // SL dinâmico: último fundo (COMPRA) ou último topo (VENDA) nos 15 candles anteriores ao sinal
  const slLookback = 15;
  const slEndIdx = n - 2; // vela de sinal

  let stopLoss: number;
  if (signal === 'COMPRA') {
    stopLoss = lowest(lows, slLookback, slEndIdx);
  } else if (signal === 'VENDA') {
    stopLoss = highest(highs, slLookback, slEndIdx);
  } else {
    // NEUTRO: usa o valor do ST como referência
    stopLoss = supertrendValue;
  }

  const risk = Math.abs(entry - stopLoss);
  const REWARD_RATIO = 1.5;

  const takeProfit = signal === 'COMPRA'
    ? entry + risk * REWARD_RATIO
    : signal === 'VENDA'
      ? entry - risk * REWARD_RATIO
      : entry; // neutro

  return {
    asset: symbol,
    timeframe,
    signal,
    currentPrice: price,
    supertrendValue,
    supertrendDirection,
    entry,
    stopLoss,
    takeProfit,
    aoValue: aoCurrentBar,
    isConfirmed,
  };
}
