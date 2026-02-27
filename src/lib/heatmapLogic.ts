// ─────────────────────────────────────────────────────────────────────────────
// heatmapLogic.ts
// Heatmap de liquidez baseado nas sessões globais de mercado.
// Todos os horários em BRT (GMT-3).
// ─────────────────────────────────────────────────────────────────────────────

export type LiquidityLevel = 'excelente' | 'alta' | 'media' | 'baixa' | 'fechado';

export interface HourData {
    hour: number;
    level: LiquidityLevel;
    reason: string;
}

export interface AssetHeatmap {
    heatmap: HourData[];
    tip: string;
    bestHours: number[];
}

// ─── Sessões de mercado (horário BRT / GMT-3) ─────────────────────────────────
// Sydney:    17h → 02h  (próximo dia)
// Tóquio:    21h → 06h
// Londres:   05h → 14h
// Nova York: 10h → 19h

const isInSession = (hour: number, start: number, end: number): boolean => {
    if (start <= end) return hour >= start && hour < end;
    return hour >= start || hour < end; // cobre meia-noite
};

const SESSIONS = {
    sydney: (h: number) => isInSession(h, 17, 2),
    tokio: (h: number) => isInSession(h, 21, 6),
    londres: (h: number) => isInSession(h, 5, 14),
    novaYork: (h: number) => isInSession(h, 10, 19),
};

// ─── Regras por tipo de ativo ─────────────────────────────────────────────────

type AssetGroup = 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'USDCHF' | 'AUDUSD' | 'USDCAD'
    | 'NZDUSD' | 'EURGBP' | 'EURJPY' | 'GBPJPY'
    | 'BTC' | 'ETH' | 'SOL' | 'BNB' | 'XRP' | 'ADA' | 'DOGE' | 'DOT' | 'AVAX' | 'MATIC'
    | 'AAPL' | 'MSFT' | 'GOOGL' | 'AMZN' | 'TSLA' | 'NVDA'
    | 'SPX' | 'IBOV' | 'NDX' | 'DJI' | 'DAX'
    | 'XAU' | 'XAG' | 'WTI' | 'BRENT' | 'NG' | 'SOJA' | 'MILHO' | 'CAFE';

function getHourDataForAsset(asset: string, hour: number): Omit<HourData, 'hour'> {
    const lnd = SESSIONS.londres(hour);
    const ny = SESSIONS.novaYork(hour);
    const tok = SESSIONS.tokio(hour);
    const syd = SESSIONS.sydney(hour);

    // ── Criptomoedas: 24/7 mas com picos ligados às sessões ocidentais ──
    const CRYPTOS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'DOT', 'AVAX', 'MATIC'];
    if (CRYPTOS.includes(asset)) {
        if (lnd && ny) return { level: 'excelente', reason: 'Sobreposição Londres+NY: máxima liquidez cripto, volumes institucionais altos.' };
        if (ny) return { level: 'alta', reason: 'Sessão americana ativa, traders institucionais de cripto presentes.' };
        if (lnd) return { level: 'alta', reason: 'Sessão europeia ativa, bom volume cripto.' };
        if (tok) return { level: 'media', reason: 'Sessão asiática: volume moderado para cripto, mercado japonês e coreano ativos.' };
        if (syd) return { level: 'media', reason: 'Sessão Sydney: liquidez razoável para cripto, menor que sessões ocidentais.' };
        return { level: 'baixa', reason: 'Janela morta: poucas sessões abertas, spreads maiores.' };
    }

    // ── Ações americanas + índices americanos ──
    // NYSE/NASDAQ: abre 10h BRT, fecha 19h BRT
    const US_STOCKS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'SPX', 'NDX', 'DJI'];
    if (US_STOCKS.includes(asset)) {
        if (hour < 10 || hour >= 19) return { level: 'fechado', reason: 'Mercado fechado. NYSE/NASDAQ operam das 10h às 19h (BRT).' };
        if (hour === 10) return { level: 'alta', reason: 'Abertura de NY: alto volume e volatilidade inicial.' };
        if (hour >= 11 && hour < 14) return { level: 'excelente', reason: 'Sessão principal de NY com sobreposição europeia: máxima liquidez.' };
        if (hour >= 14 && hour < 17) return { level: 'alta', reason: 'Tarde americana: volume sólido, tendências bem definidas.' };
        return { level: 'media', reason: 'Fim da sessão americana, volatilidade caindo.' };
    }

    // ── Ibovespa (B3) ──
    // B3: abre 09h BRT, fecha 18h BRT
    if (asset === 'IBOV') {
        if (hour < 9 || hour >= 18) return { level: 'fechado', reason: 'Mercado fechado. B3 opera das 09h às 18h (BRT).' };
        if (hour === 9) return { level: 'media', reason: 'Abertura B3: atenção a gaps e abertura volátil.' };
        if (hour >= 10 && hour < 13) return { level: 'alta', reason: 'B3 aberta com sobreposição europeia, boa liquidez.' };
        if (hour >= 13 && hour < 17) return { level: 'excelente', reason: 'Sobreposição B3 + NY: volume máximo, melhores oportunidades.' };
        return { level: 'media', reason: 'Fim da sessão B3, volume caindo.' };
    }

    // ── DAX (Alemanha) ──
    // XETRA: abre 05h BRT, fecha 18h BRT
    if (asset === 'DAX') {
        if (hour < 5 || hour >= 18) return { level: 'fechado', reason: 'Mercado fechado. XETRA opera das 05h às 18h (BRT).' };
        if (hour >= 5 && hour < 10) return { level: 'alta', reason: 'Sessão europeia pré-NY ativa, boa liquidez no DAX.' };
        if (hour >= 10 && hour < 14) return { level: 'excelente', reason: 'Sobreposição Europa+NY: máxima liquidez para índice alemão.' };
        return { level: 'media', reason: 'Europa fechando, NY sustenta algum volume no DAX.' };
    }

    // ── Commodities energéticas e agrícolas ──
    const COMMODITIES = ['WTI', 'BRENT', 'NG', 'XAG', 'SOJA', 'MILHO', 'CAFE'];
    if (COMMODITIES.includes(asset)) {
        if (lnd && ny) return { level: 'excelente', reason: 'Sobreposição Londres+NY: máximo volume em commodities, dados americanos influenciam.' };
        if (ny) return { level: 'alta', reason: 'Sessão NY ativa: dados de estoques e energia movimentam preços.' };
        if (lnd) return { level: 'alta', reason: 'Londres ativa: mercado europeu de energia e commodities em plena atividade.' };
        return { level: 'baixa', reason: 'Fora dos principais mercados de commodities. Spreads altos.' };
    }

    // ── Ouro (XAU) ──
    if (asset === 'XAU') {
        if (lnd && ny) return { level: 'excelente', reason: 'Sobreposição Londres+NY: fixação oficial do ouro, máxima liquidez.' };
        if (ny) return { level: 'alta', reason: 'NY ativa: USD e treasuries movimentam o ouro fortemente.' };
        if (lnd) return { level: 'alta', reason: 'Londres ativa: LBMA fixação e alto volume institucional em ouro.' };
        if (tok) return { level: 'media', reason: 'Ásia ativa: demanda asiática por ouro mantém liquidez moderada.' };
        return { level: 'baixa', reason: 'Janela morta: poucos participantes, spreads elevados no ouro.' };
    }

    // ── Pares de Iene ──
    const YEN_PAIRS = ['USDJPY', 'EURJPY', 'GBPJPY'];
    if (YEN_PAIRS.includes(asset)) {
        if (tok && lnd) return { level: 'excelente', reason: 'Sobreposição Tóquio+Londres: maior liquidez para pares de Iene.' };
        if (tok) return { level: 'alta', reason: 'Tóquio aberta: alta liquidez para pares de Iene, BOJ ativo.' };
        if (lnd && ny) return { level: 'alta', reason: 'Sobreposição europeia-americana mantém bom volume no Iene.' };
        if (lnd || ny) return { level: 'media', reason: 'Sessão ocidental: liquidez moderada para o Iene.' };
        return { level: 'baixa', reason: 'Zona morta: baixo volume para pares de Iene.' };
    }

    // ── Pares de Dólar Australiano / Neozelandês ──
    const AUD_NZD = ['AUDUSD', 'NZDUSD'];
    if (AUD_NZD.includes(asset)) {
        if (syd && tok) return { level: 'excelente', reason: 'Sobreposição Sydney+Tóquio: máxima liquidez para pares de AUD/NZD.' };
        if (syd || tok) return { level: 'alta', reason: 'Sessão asiático-pacífica ativa: bom volume para pares oceânicos.' };
        if (lnd && ny) return { level: 'alta', reason: 'Sobreposição ocidental: volume significativo no AUD/NZD.' };
        if (lnd || ny) return { level: 'media', reason: 'Sessão ocidental com liquidez moderada para pares oceânicos.' };
        return { level: 'baixa', reason: 'Sem sessões relevantes ativas. Spreads altos.' };
    }

    // ── USD/CAD ──
    if (asset === 'USDCAD') {
        if (lnd && ny) return { level: 'excelente', reason: 'Sobreposição Londres+NY: máxima liquidez CAD, dados de petróleo impactam.' };
        if (ny) return { level: 'alta', reason: 'Sessão americana: maior liquidez CAD, correlação com petróleo.' };
        if (lnd) return { level: 'media', reason: 'Londres ativa: liquidez moderada para o CAD.' };
        return { level: 'baixa', reason: 'Fora do horário dos mercados norte-americanos.' };
    }

    // ── Pares europeus (EUR/USD, GBP/USD, USD/CHF, EUR/GBP) — default ──
    // GBP/USD (e similares)
    if (hour >= 5 && hour < 10) return { level: 'alta', reason: 'Sessão londrina ativa: excelente volume para pares europeus.' };
    if (hour >= 10 && hour < 14) return { level: 'excelente', reason: 'Sobreposição Londres+NY: máxima liquidez. Melhor janela para operar.' };
    if (hour >= 14 && hour < 17) return { level: 'alta', reason: 'Sessão americana ativa, volume sólido.' };
    if (hour >= 17 && hour < 21) return { level: 'media', reason: 'Fim da NY e abertura da Ásia: volume caindo.' };
    return { level: 'baixa', reason: 'Zona morta: apenas sessão asiática, baixo volume para pares europeus.' };
}

// ─── Pública: getHeatmapForAsset ─────────────────────────────────────────────

export function getHeatmapForAsset(asset: string): AssetHeatmap {
    const heatmap: HourData[] = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        ...getHourDataForAsset(asset, h),
    }));

    const bestHours = heatmap
        .filter(h => h.level === 'excelente')
        .map(h => h.hour);

    // Fallback se nenhuma hora for "excelente" (e.g. IBOV de madrugada)
    const fallbackBest = bestHours.length
        ? bestHours
        : heatmap.filter(h => h.level === 'alta').map(h => h.hour).slice(0, 4);

    const tips: Partial<Record<string, string>> = {
        EURUSD: 'EUR/USD: os horários de maior assertividade são 10h-14h (sobreposição Londres+NY). Volumetria +40% acima da média.',
        GBPUSD: 'GBP/USD: abertura londrina (05h-09h) e sobreposição NY (10h-14h) são janelas premium. Cuidado com dados do BoE.',
        USDJPY: 'USD/JPY: melhor desempenho durante sessão de Tóquio (21h-06h) e sobreposição Tóquio+Londres (05h-06h).',
        XAU: 'Ouro (XAU): fixação LBMA em Londres e abertura NY são os momentos de maior volatilidade e liquidez.',
        BTC: 'Bitcoin: mercado 24/7, mas volumes institucionais sobem durante NY (10h-19h) e sobreposição com Londres.',
        IBOV: 'Ibovespa: operar entre 13h-17h aproveita a sobreposição com a NYSE, gerando os maiores volumes do dia.',
        AUDUSD: 'AUD/USD: a sobreposição Sydney+Tóquio (21h-02h BRT) é a janela de ouro para este par oceânico.',
    };

    const tip = tips[asset] ?? `Para ${asset}, as janelas verdes indicam as sessões de maior liquidez global alinhadas com este ativo. Volume sobe +25-40% nesses horários.`;

    return { heatmap, tip, bestHours: fallbackBest };
}
