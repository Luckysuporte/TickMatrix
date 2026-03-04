export function calculateSuggestedLot(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLossPrice: number,
    assetSymbol: string
): { lotSize: number; riskAmountUsd: number; lotLabel: string } {
    if (!accountBalance || accountBalance <= 0 || !entryPrice || !stopLossPrice || entryPrice === stopLossPrice) {
        return { lotSize: 0, riskAmountUsd: 0, lotLabel: '0.00' };
    }

    const riskAmountUsd = accountBalance * (riskPercentage / 100);
    const distance = Math.abs(entryPrice - stopLossPrice);

    let tickValueUsd = 1; // Padrão
    let isForex = false;
    const sym = assetSymbol.toUpperCase();

    // Tabela de Valor de Tick (por 1.0 de movimento absoluto no preço)
    if (sym.includes('MNQ') || sym === 'MYM') {
        // MNQ: 1 ponto = $2.00
        tickValueUsd = 2.00;
    } else if (sym.includes('MGC')) {
        // MGC: 1 ponto = $1.00
        tickValueUsd = 1.00;
    } else if (sym.includes('WIN')) {
        // WIN (Mini Índice Brasil): 1 ponto = R$ 0,20 (Aprox $0.0363 no câmbio de 5.50)
        tickValueUsd = 0.20 / 5.50;
    } else if (sym.includes('WDO')) {
        // WDO (Mini Dólar Brasil): 1 ponto = R$ 10,00 (Aprox $1.81 no câmbio de 5.50)
        tickValueUsd = 10.00 / 5.50;
    } else {
        // Forex e Metais (XAU/USD etc)
        isForex = true;

        // Padrão de Contratos de Forex/Metals:
        if (sym.includes('XAU')) {
            // XAU/USD: Contrato padrão = 100 onças. Então movimento de $1.00 = $100 de P/L por Lote cheio (1.00).
            tickValueUsd = 100.00;
        } else if (sym.includes('XAG')) {
            tickValueUsd = 5000.00;
        } else if (sym.includes('JPY')) {
            // Em pares JPY, 1.0 absoluto no preço é 100 pips (ex: 150.00 -> 151.00).
            // Geralmente 100 pips de 1 lote (100,000 unidades) = $~660 (depende do USD/JPY). 
            // Para simplificar grosseiramente em USD, usamos 1000 como baseline aproximado.
            tickValueUsd = 1000.00;
        } else {
            // Forex Geral (ex: EUR/USD). Movimento de 1.00 absoluto (ex: 1.0000 -> 2.0000) = $ 100,000 por lote padrão.
            tickValueUsd = 100000.00;
        }
    }

    // Fórmula: Lote = (Saldo da Conta * % Risco) / (Distância do Stop Loss * Valor do Tick)
    // O Valor do Tick aqui já é referenciado para 1.0 de movimento absoluto do preço.
    let lotSize = riskAmountUsd / (distance * tickValueUsd);

    // Formatação
    if (lotSize < 0.01) lotSize = 0.01;

    // Índices baseados em Bolsa (B3, CME) operam número de contratos (inteiros) a não ser CFD fracionado.
    // Forex opera em casas decimais (0.01).
    if (!isForex && !sym.includes('XAU')) {
        lotSize = Math.max(1, Math.round(lotSize));
    }

    return {
        lotSize,
        riskAmountUsd,
        lotLabel: (isForex || sym.includes('XAU')) ? lotSize.toFixed(2) : lotSize.toFixed(0)
    };
}
