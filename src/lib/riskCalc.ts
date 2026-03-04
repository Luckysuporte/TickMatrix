// ─── Tipos de retorno ──────────────────────────────────────────────────────
export type LotCalcResult =
    | { valid: false; message: string }
    | { valid: true; lotSize: number; lotLabel: string; unitLabel: 'contratos' | 'lotes'; riskAmountUsd: number; displayLine: string };

// ─── Tabela de Tick Values ────────────────────────────────────────────────
// Valor em USD de 1.0 de movimento absoluto no preço, POR 1 contrato/lote.
// Ex: MNQ — se o preço muda de 15000 para 15001, o P/L é $2.00 por contrato.
function getTickConfig(sym: string): { tickValueUsd: number; isFuture: boolean } {
    const s = sym.toUpperCase().replace('/', '');

    // ── Futuros CME (contratos inteiros) ───────────────────────────────────
    if (s.includes('MNQ')) return { tickValueUsd: 2.00, isFuture: true };  // Micro E-mini Nasdaq
    if (s.includes('MYM')) return { tickValueUsd: 0.50, isFuture: true };  // Micro E-mini Dow Jones
    if (s.includes('MGC')) return { tickValueUsd: 1.00, isFuture: true };  // Micro Gold
    if (s.includes('MES')) return { tickValueUsd: 5.00, isFuture: true };  // Micro E-mini S&P

    // ── Futuros B3 (contratos inteiros, convertidos de BRL → USD) ─────────
    // Taxa de câmbio de referência interna: 1 USD = 5.50 BRL
    const BRL_USD = 5.50;
    if (s.startsWith('WIN')) return { tickValueUsd: 0.20 / BRL_USD, isFuture: true };  // Mini Índice: R$0.20/pt
    if (s.startsWith('WDO')) return { tickValueUsd: 10.00 / BRL_USD, isFuture: true }; // Mini Dólar: R$10/pt

    // ── Metais e Commodities Forex (lotes fracionados) ────────────────────
    // Padrão de 1 oz para metais preciosos em CFD/Spot:
    // XAU/USD: MGC-equivalente, 1pt = $1.00
    if (s.includes('XAU')) return { tickValueUsd: 1.00, isFuture: false };
    if (s.includes('XAG')) return { tickValueUsd: 0.50, isFuture: false };  // Prata Spot (aprox)

    // ── Forex Geral ────────────────────────────────────────────────────────
    // 1 pip = 0.0001 (ou 0.01 para JPY). Lote padrão = 100,000 unidades.
    // Para simplificar: tratamos "1.0 de movimento" = 10000 pips = $10,000 em 1 lote
    // → movimento de 0.0100 (100 pips) = $100 por lote padrão → tickValueUsd = 10000
    if (s.includes('JPY')) return { tickValueUsd: 100.00, isFuture: false }; // Pares JPY (1.0 = 100 pips em USD)
    return { tickValueUsd: 10000.00, isFuture: false }; // Forex padrão (EUR/USD etc)
}

// ─── Função principal ─────────────────────────────────────────────────────
export function calculateSuggestedLot(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLossPrice: number,
    assetSymbol: string
): LotCalcResult {
    const distance = Math.abs(entryPrice - stopLossPrice);

    // Guarda de segurança: SL inválido ou ausente
    if (!accountBalance || accountBalance <= 0 || !distance || distance < 0.0001) {
        return { valid: false, message: 'Aguardando Volatilidade' };
    }

    const riskAmountUsd = accountBalance * (riskPercentage / 100);
    const { tickValueUsd, isFuture } = getTickConfig(assetSymbol);

    // Fórmula: Lote = Risco_$ / (Distância * Valor_por_Ponto)
    let lotSize = riskAmountUsd / (distance * tickValueUsd);

    let lotLabel: string;
    const unitLabel: 'contratos' | 'lotes' = isFuture ? 'contratos' : 'lotes';

    if (isFuture) {
        // Futuros: número inteiro de contratos (mínimo 1)
        lotSize = Math.max(1, Math.round(lotSize));
        lotLabel = `${lotSize} ${unitLabel}`;
    } else {
        // Forex/Metais: arredonda para 2 casas, mínimo 0.01
        lotSize = Math.max(0.01, parseFloat(lotSize.toFixed(2)));
        lotLabel = `${lotSize.toFixed(2)} ${unitLabel}`;
    }

    const displayLine = `Lote Recomendado: ${lotLabel} | Risco Total: $${riskAmountUsd.toFixed(2)}`;

    return { valid: true, lotSize, lotLabel, unitLabel, riskAmountUsd, displayLine };
}
