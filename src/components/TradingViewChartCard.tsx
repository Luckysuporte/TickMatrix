'use client';

import { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

// ── Symbol mapping (asset value → TradingView symbol) ──────────────────────
const SYMBOL_MAP: Record<string, string> = {
    EURUSD: 'OANDA:EURUSD',
    GBPUSD: 'OANDA:GBPUSD',
    USDJPY: 'OANDA:USDJPY',
    USDCHF: 'OANDA:USDCHF',
    AUDUSD: 'OANDA:AUDUSD',
    USDCAD: 'OANDA:USDCAD',
    NZDUSD: 'OANDA:NZDUSD',
    EURGBP: 'OANDA:EURGBP',
    EURJPY: 'OANDA:EURJPY',
    GBPJPY: 'OANDA:GBPJPY',
    BTCUSD: 'BITSTAMP:BTCUSD',
    BTCUSDT: 'BITSTAMP:BTCUSD',
    ETHUSD: 'BITSTAMP:ETHUSD',
    ETHUSDT: 'BITSTAMP:ETHUSD',
    SOLUSD: 'COINBASE:SOLUSD',
    SOLUSDT: 'COINBASE:SOLUSD',
    BNBUSD: 'BINANCE:BNBUSDT',
    BNBUSDT: 'BINANCE:BNBUSDT',
    XRPUSD: 'BITSTAMP:XRPUSD',
    AAPL: 'NASDAQ:AAPL',
    TSLA: 'NASDAQ:TSLA',
    PETR4: 'BMFBOVESPA:PETR4',
    VALE3: 'BMFBOVESPA:VALE3',
    GOOGL: 'NASDAQ:GOOGL',
    MSFT: 'NASDAQ:MSFT',
    NVDA: 'NASDAQ:NVDA',
    AMZN: 'NASDAQ:AMZN',
    SPX: 'SP:SPX',
    IBOV: 'BMFBOVESPA:IBOV',
    NDX: 'NASDAQ:NDX',
    NAS100: 'NASDAQ:NDX',
    DJ30: 'DJ:DJI',
    DAX: 'XETR:DAX',
    XAUUSD: 'OANDA:XAUUSD',
    XAGUSD: 'OANDA:XAGUSD',
    WTIUSD: 'NYMEX:CL1!',
};

// ── Timeframe mapping ────────────────────────────────────────────────────────
const TF_MAP: Record<string, string> = {
    '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W',
};

const TF_LABEL: Record<string, string> = {
    '1m': '1 Minuto', '5m': '5 Minutos', '15m': '15 Minutos',
    '1h': '1 Hora', '4h': '4 Horas', '1d': 'Diário', '1w': 'Semanal',
};

interface Props {
    assetValue: string;
    assetLabel: string;
    timeframe: string;
    price: string;
    change: string;
    high: string;
    low: string;
}

export default function TradingViewChartCard({ assetValue, assetLabel, timeframe, price, change, high, low }: Props) {
    const widgetRef = useRef<HTMLDivElement>(null);

    // Normalize: remove slash so "XAU/USD" → "XAUUSD" for map lookup
    const chartKey = assetValue.replace('/', '').toUpperCase();
    const symbol = SYMBOL_MAP[chartKey] ?? `OANDA:${chartKey}`;
    const interval = TF_MAP[timeframe] ?? '5';
    const isPositive = !change.startsWith('-');

    useEffect(() => {
        if (!widgetRef.current) return;

        // Clear previous widget
        widgetRef.current.innerHTML = '';

        // Rule 3: inner div must fill 100% of the container (position absolute)
        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'tradingview-widget-container__widget';
        widgetDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
        widgetRef.current.appendChild(widgetDiv);

        // Rule 1: autosize:true — TradingView measures the container div
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol,
            interval,
            timezone: 'America/Sao_Paulo',
            theme: 'dark',
            style: '1',
            locale: 'br',
            backgroundColor: '#0a0d12',
            gridColor: 'rgba(255,255,255,0.03)',
            hide_top_toolbar: false,
            allow_symbol_change: false,
            save_image: false,
            studies: ['STD;RSI', 'STD;MACD'],
            support_host: 'https://www.tradingview.com',
        });

        widgetRef.current.appendChild(script);

        return () => {
            if (widgetRef.current) widgetRef.current.innerHTML = '';
        };
    }, [symbol, interval]);

    return (
        // Rule 2: card principal com altura física fixa (660px) + flex column
        <div style={{
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            marginBottom: '32px',
            height: '660px',
            display: 'flex',
            flexDirection: 'column',
        }}>

            {/* Header — altura fixa, não cresce */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Activity style={{ width: '16px', height: '16px', color: '#00e5ff' }} />
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>Gráfico em Tempo Real</span>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{assetLabel}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>•</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{TF_LABEL[timeframe]}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#00e676', fontWeight: 700 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e676', display: 'inline-block', boxShadow: '0 0 6px #00e676' }} />
                        Ao vivo
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{price}</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isPositive ? '#00e676' : '#ef4444', marginTop: '2px' }}>{change}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
                        <div>Máx: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{high}</span></div>
                        <div>Min: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{low}</span></div>
                    </div>
                </div>
            </div>

            {/* Widget — flex:1 ocupa todo espaço restante, position:relative para o filho absoluto */}
            <div
                ref={widgetRef}
                className="tradingview-widget-container"
                style={{
                    flex: 1,
                    width: '100%',
                    minHeight: 0,       /* crucial: flex child precisa disso para encolher/crescer */
                    position: 'relative',
                    overflow: 'hidden',
                }}
            />

            {/* Disclaimer — altura fixa, não cresce */}
            <div style={{ flexShrink: 0, padding: '10px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: '11px', color: '#334155' }}>
                    📊 Gráfico ilustrativo (delay ~15min) • Análise usa dados profissionais em tempo real
                </span>
            </div>
        </div>
    );
}
