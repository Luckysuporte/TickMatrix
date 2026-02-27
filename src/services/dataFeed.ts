import { SMA } from 'technicalindicators';

// Tipagem básica para os dados OHLCV que vamos receber
export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalysisResult {
  asset: string;
  timeframe: string;
  recommendation: 'COMPRA' | 'VENDA' | 'NEUTRO';
  currentPrice: number;
  smaValue: number;
  confidenceScore: number;
}

/**
 * MOCK: Simula a busca de dados de uma API externa (ex: Twelve Data)
 * Retorna uma série de candles simulados para o ativo MNQ no gráfico de 5m.
 */
async function fetchMockMarketData(symbol: string, timeframe: string): Promise<OHLCV[]> {
  // Simulando um delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));

  // Gerando candles simulados com tendência leve de alta
  let basePrice = 17500;
  return Array.from({ length: 50 }).map((_, i) => {
    basePrice += (Math.random() * 20 - 5); // Variação aleatória
    return {
      time: Date.now() - (50 - i) * 5 * 60 * 1000,
      open: basePrice,
      high: basePrice + Math.random() * 10,
      low: basePrice - Math.random() * 10,
      close: basePrice + (Math.random() * 10 - 5),
      volume: Math.floor(Math.random() * 1000)
    };
  });
}

/**
 * Serviço Principal que busca os dados e aplica o Motor Matemático (neste caso, apenas um Gate Simples de SMA)
 */
export async function analyzeAssetWithSMA(symbol: string, timeframe: string): Promise<AnalysisResult> {
  // 1. Data Feed: Buscar histórico de preços
  const candles = await fetchMockMarketData(symbol, timeframe);

  // 2. Motor Matemático: Calcular SMA de 20 períodos
  const closePrices = candles.map(candle => candle.close);
  const smaPeriod = 20;
  
  const smaResult = SMA.calculate({ period: smaPeriod, values: closePrices });
  const currentSma = smaResult[smaResult.length - 1];
  const currentPrice = closePrices[closePrices.length - 1];

  // 3. Sistema de "Gates" (Lógica de Decisão Básica)
  // Regra Exemplo: Se preço atual > SMA = Compra. Se preço < SMA = Venda.
  let recommendation: 'COMPRA' | 'VENDA' | 'NEUTRO' = 'NEUTRO';
  let confidenceScore = 0;

  if (currentPrice > currentSma) {
    recommendation = 'COMPRA';
    confidenceScore = 60; // Confiança arbitrária para o mock
  } else if (currentPrice < currentSma) {
    recommendation = 'VENDA';
    confidenceScore = 60;
  }

  return {
    asset: symbol,
    timeframe,
    recommendation,
    currentPrice: Number(currentPrice.toFixed(2)),
    smaValue: Number(currentSma.toFixed(2)),
    confidenceScore
  };
}
