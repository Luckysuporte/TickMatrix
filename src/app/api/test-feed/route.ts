import { NextResponse } from 'next/server';
import { analyzeAssetWithSMA } from '@/services/dataFeed';

export async function GET() {
    try {
        // Para simplificar no teste, usaremos hardcoded o ativo "MNQ" (Micro Nasdaq) no timeframe de "5m"
        const analysis = await analyzeAssetWithSMA('MNQ', '5m');

        return NextResponse.json({
            success: true,
            message: 'Análise simulada (Mock) gerada com sucesso!',
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
