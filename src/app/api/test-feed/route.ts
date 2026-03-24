import { NextResponse } from 'next/server';
import { analyzeStrategy1 } from '@/services/dataFeed';

export async function GET() {
    try {
        // Teste da Estratégia 1 (SuperTrend) com dados mock
        const mockCandles = Array.from({ length: 50 }).map((_, i) => {
            const base = 17500 + i * 10;
            return { high: base + 20, low: base - 20, close: base + (i % 2 === 0 ? 5 : -5) };
        });

        const analysis = analyzeStrategy1(mockCandles, 'MNQ', '5m');

        return NextResponse.json({
            success: true,
            message: 'Estratégia 1 (SuperTrend) — Análise gerada com sucesso!',
            data: analysis
        });
    } catch (error) {
        console.error('API Test Error:', error);
        return NextResponse.json(
            { success: false, error: 'Falha ao rodar a análise do motor.' },
            { status: 500 }
        );
    }
}
