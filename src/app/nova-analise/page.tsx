'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Lock, Crown, Sparkles, Check, ChevronDown, TrendingUp, TrendingDown, Activity, Zap, BookmarkPlus, Star } from 'lucide-react';
import TradingViewChartCard from '@/components/TradingViewChartCard';
import { supabase } from '@/lib/supabase';
import { toggleFavorite, isFavorite } from '@/lib/favorites';

const ASSETS: Record<string, { value: string; label: string; description: string }[]> = {
    forex: [
        { value: 'EUR/USD', label: 'EUR/USD', description: 'Euro / Dólar' },
        { value: 'GBP/USD', label: 'GBP/USD', description: 'Libra / Dólar' },
        { value: 'USD/JPY', label: 'USD/JPY', description: 'Dólar / Iene' },
        { value: 'USD/CHF', label: 'USD/CHF', description: 'Dólar / Franco Suíço' },
        { value: 'AUD/USD', label: 'AUD/USD', description: 'Dólar Australiano / Dólar' },
        { value: 'USD/CAD', label: 'USD/CAD', description: 'Dólar / Dólar Canadense' },
    ],
    crypto: [
        // Binance format: no slash, ends with USDT
        { value: 'BTCUSDT', label: 'BTC/USD', description: 'Bitcoin' },
        { value: 'ETHUSDT', label: 'ETH/USD', description: 'Ethereum' },
        { value: 'SOLUSDT', label: 'SOL/USD', description: 'Solana' },
        { value: 'BNBUSDT', label: 'BNB/USD', description: 'BNB' },
    ],
    stocks: [
        { value: 'AAPL', label: 'AAPL', description: 'Apple Inc.' },
        { value: 'TSLA', label: 'TSLA', description: 'Tesla Inc.' },
        { value: 'PETR4', label: 'PETR4', description: 'Petrobras PN' },
        { value: 'VALE3', label: 'VALE3', description: 'Vale ON' },
    ],
    indices: [
        { value: 'SPX', label: 'S&P 500', description: "Standard & Poor's 500" },
        { value: 'IBOV', label: 'IBOV', description: 'Ibovespa' },
        { value: 'NDX', label: 'NASDAQ 100', description: 'Nasdaq 100' },
    ],
    commodity: [
        { value: 'XAU/USD', label: 'XAU/USD', description: 'Ouro / Dólar' },
        { value: 'XAG/USD', label: 'XAG/USD', description: 'Prata / Dólar' },
        { value: 'WTI/USD', label: 'WTI', description: 'Petróleo Bruto (WTI)' },
    ],
};

const LOADING_STEPS = [
    'Verificando contexto do mercado...',
    'Identificando tendência principal...',
    'Calculando indicadores técnicos...',
    'Analisando médias móveis...',
    'Gerando sinal de entrada...',
];

const TABS = [
    { id: 'resumo', label: 'Resumo', locked: false },
    { id: 'tecnica', label: 'Técnica', locked: false },
    { id: 'smc', label: 'SMC', locked: true },
    { id: 'harmonicos', label: 'Harmônicos', locked: true },
    { id: 'wegd', label: 'WEGD', locked: true },
    { id: 'probabilistica', label: 'Probabilística', locked: true },
    { id: 'calculadora', label: 'Calculadora', locked: false },
    { id: 'timing', label: 'Timing', locked: true },
    { id: 'visual', label: 'Visual IA', locked: true },
    { id: 'noticias', label: 'Notícias', locked: true },
];

export default function NovaAnalise() {
    const [analysisType, setAnalysisType] = useState<'simples' | 'completa'>('simples');
    const [assetType, setAssetType] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<{ value: string; label: string; description: string } | null>(null);
    const [timeframe, setTimeframe] = useState('5m');
    const [search, setSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [phase, setPhase] = useState<'config' | 'loading' | 'results'>('config');
    const [progress, setProgress] = useState(0);
    const [loadingStep, setLoadingStep] = useState(0);
    const [activeTab, setActiveTab] = useState('resumo');
    const [analysisResult, setAnalysisResult] = useState<{
        signal: string; signalStrength: string; trend: string; confluencia: string;
        rsi14: string; sma20: string; price: string; priceRaw: number;
        change: string; high: string; low: string;
        entry: string; stopLoss: string; takeProfit1: string; takeProfit2: string; takeProfit3: string;
        riskReward: string;
    } | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isFav, setIsFav] = useState(false);

    const assets = ASSETS[assetType] ?? [];
    const filtered = assets.filter(a =>
        a.label.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setAssetType(e.target.value); setSelectedAsset(null); setSearch(''); setDropdownOpen(false);
    };
    const selectAsset = (asset: typeof selectedAsset) => { setSelectedAsset(asset); setDropdownOpen(false); setSearch(''); };

    const startAnalysis = async () => {
        if (!selectedAsset || !assetType) return;
        setPhase('loading'); setProgress(0); setLoadingStep(0); setApiError(null);

        // Animate progress while fetching
        let p = 0; let s = 0;
        const iv = setInterval(() => {
            p += Math.random() * 6 + 2;
            if (p >= 90) { p = 90; clearInterval(iv); }
            setProgress(Math.min(p, 90));
            if (s < LOADING_STEPS.length - 1 && p > (s + 1) * 18) { s++; setLoadingStep(s); }
        }, 300);

        try {
            // ─ Sanitize symbol ───────────────────────────────────────────
            let symbol = selectedAsset.value.trim().toUpperCase();
            // Crypto on Binance must have no slash and end with USDT
            if (assetType === 'crypto') {
                symbol = symbol.replace('/', '');
                if (!symbol.endsWith('USDT') && !symbol.endsWith('BUSD')) {
                    symbol = symbol.replace(/USD$/, 'USDT');
                }
            }

            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, timeframe, assetType }),
            });
            const data = await res.json();
            clearInterval(iv);

            if (!res.ok || data.error) {
                setApiError(data.error ?? 'Erro ao obter dados do servidor.');
                setProgress(100);
                setTimeout(() => setPhase('results'), 400);
            } else {
                setAnalysisResult(data);
                setProgress(100);
                setLoadingStep(LOADING_STEPS.length - 1);
                // atualiza estado do favorito para o ativo atual
                setIsFav(isFavorite(selectedAsset.value));
                setTimeout(() => setPhase('results'), 600);
            }
        } catch (err) {
            clearInterval(iv);
            setApiError('Erro de rede. Verifique sua conexão.');
            setProgress(100);
            setTimeout(() => setPhase('results'), 400);
        }
    };

    const saveAnalysis = async () => {
        if (!analysisResult || !selectedAsset) return;
        setSaving(true);
        setSaveStatus('idle');
        try {
            const { error } = await supabase.from('trading_history').insert({
                ativo: selectedAsset.label,
                timeframe,
                preco: analysisResult.price,
                sinal_ia: analysisResult.signal,
                rsi: analysisResult.rsi14,
                tendencia: analysisResult.trend,
                confluence: analysisResult.confluencia,
            });
            setSaveStatus(error ? 'error' : 'success');
        } catch {
            setSaveStatus('error');
        } finally {
            setSaving(false);
            setTimeout(() => setSaveStatus('idle'), 4000);
        }
    };

    const tfLabel: Record<string, string> = { '1m': '1 Minuto', '5m': '5 Minutos', '10m': '10 Minutos', '15m': '15 Minutos', '1h': '1 Hora', '4h': '4 Horas', '1d': 'Diário', '1w': 'Semanal' };
    const assetLabel = selectedAsset?.label ?? 'XAU';
    const assetDesc = selectedAsset?.description ?? 'Ouro / Dólar';

    const selectStyle: React.CSSProperties = {
        width: '100%', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '12px 36px 12px 14px', color: '#cbd5e1',
        fontSize: '13px', outline: 'none', cursor: 'pointer', appearance: 'none', boxSizing: 'border-box',
    };

    // ── LOADING PHASE ──────────────────────────────────────────────────────────
    if (phase === 'loading') return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px 80px' }}>
            {/* Chart placeholder */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity style={{ width: '16px', height: '16px', color: '#00e5ff' }} />
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>Gráfico em Tempo Real</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{assetLabel} • {tfLabel[timeframe]}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#00e676', fontWeight: 700 }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e676', display: 'inline-block' }} />
                            Ao vivo
                        </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#fff' }}>5.253,20</div>
                        <div style={{ fontSize: '12px', color: '#00e676' }}>+1.14%</div>
                    </div>
                </div>
                {/* Fake candlestick chart area */}
                <div style={{ height: '200px', background: '#0a0d12', borderRadius: '10px', display: 'flex', alignItems: 'flex-end', gap: '3px', padding: '12px', overflow: 'hidden', position: 'relative' }}>
                    {Array.from({ length: 60 }, (_, i) => {
                        const h = 40 + Math.sin(i * 0.3) * 30 + Math.random() * 40;
                        const isGreen = Math.random() > 0.45;
                        return <div key={i} style={{ flex: 1, height: `${h}px`, background: isGreen ? '#00e676' : '#ef4444', borderRadius: '2px', opacity: 0.7 + i / 200 }} />;
                    })}
                    <div style={{ position: 'absolute', top: '8px', left: '12px', fontSize: '10px', color: '#475569' }}>RSI 14 ≈ 50,00</div>
                </div>
            </div>

            {/* IA Processing */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap style={{ width: '20px', height: '20px', color: '#00e5ff' }} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 800, color: '#fff', margin: 0, fontSize: '15px' }}>IA Analisando {assetLabel}</p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Processando com inteligência artificial avançada</p>
                    </div>
                </div>
                {['Contexto do Mercado', 'Tendências', 'Análise Técnica'].map((step, i) => (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', marginBottom: '8px', background: i <= loadingStep ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${i <= loadingStep ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.05)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${i < loadingStep ? '#00e676' : i === loadingStep ? '#00e5ff' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {i < loadingStep ? <Check style={{ width: '12px', height: '12px', color: '#00e676' }} /> : i === loadingStep ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e5ff', animation: 'pulse 1s infinite' }} /> : null}
                            </div>
                            <span style={{ fontWeight: 700, color: i <= loadingStep ? '#fff' : '#475569', fontSize: '14px' }}>{step}</span>
                            {i === loadingStep && <span style={{ fontSize: '12px', color: '#64748b' }}>Calculando indicadores principais...</span>}
                        </div>
                        {i < loadingStep && <span style={{ fontSize: '12px', color: '#00e676', fontWeight: 700 }}>Concluído</span>}
                    </div>
                ))}
                {/* Terminal */}
                <div style={{ background: '#0a0d12', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        {['#ef4444', '#facc15', '#22c55e'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                        <span style={{ fontSize: '10px', color: '#475569', marginLeft: '8px', fontFamily: 'monospace' }}>AI Engine v2.0</span>
                    </div>
                    {LOADING_STEPS.slice(0, loadingStep + 1).map((s, i) => (
                        <p key={i} style={{ fontSize: '12px', color: '#00e5ff', margin: '4px 0', fontFamily: 'monospace' }}>→ {s}</p>
                    ))}
                </div>
                {/* Progress */}
                <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Progresso</span>
                        <span style={{ fontSize: '12px', color: '#00e676', fontWeight: 700 }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #00e5ff, #00e676)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                    </div>
                </div>
            </div>
        </div>
    );

    // Derive display values from API result or defaults
    const r = analysisResult;
    const sig = r?.signal ?? 'NEUTRO';
    const sigColor = sig === 'COMPRA' ? '#00e676' : sig === 'VENDA' ? '#ef4444' : '#64748b';
    const sigBg = sig === 'COMPRA' ? 'linear-gradient(135deg,#0d2818,#0a1f14)' : sig === 'VENDA' ? 'linear-gradient(135deg,#2a0d0d,#1f0a0a)' : 'linear-gradient(135deg,#111318,#0d1017)';
    const sigBorder = sig === 'COMPRA' ? 'rgba(0,230,118,0.2)' : sig === 'VENDA' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)';

    // ── RESULTS PHASE ──────────────────────────────────────────────────────────
    if (phase === 'results') return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 80px' }}>

            {/* API Error banner */}
            {apiError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                    ⚠️ {apiError} — exibindo valores de demonstração.
                </div>
            )}

            {/* TradingView Chart */}
            <TradingViewChartCard
                assetValue={selectedAsset?.value ?? 'XAUUSD'}
                assetLabel={selectedAsset?.label ?? 'XAU/USD'}
                timeframe={timeframe}
                price={r?.price ?? '5.253,20'}
                change={r ? (parseFloat(r.change) >= 0 ? `+${r.change}%` : `${r.change}%`) : '+1.14%'}
                high={r?.high ?? '5.278,60'}
                low={r?.low ?? '5.230,60'}
            />

            {/* Timeframe badge */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 18px', marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
                Timeframe usado na análise: <strong style={{ color: '#fff' }}>{tfLabel[timeframe]}</strong>
            </div>

            {/* Tabs */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px 16px', marginBottom: '20px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => !tab.locked && setActiveTab(tab.id)} style={{
                            display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: tab.locked ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.15s',
                            background: activeTab === tab.id ? '#00e5ff' : 'transparent',
                            color: activeTab === tab.id ? '#000' : tab.locked ? '#334155' : '#94a3b8',
                        }}>
                            {tab.label}
                            {tab.locked && <Lock style={{ width: '11px', height: '11px' }} />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Signal Card */}
            <div style={{ background: sigBg, border: `1px solid ${sigBorder}`, borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#475569', letterSpacing: '0.1em', margin: '0 0 6px' }}>SINAL IDENTIFICADO</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${sigColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {sig === 'VENDA' ? <TrendingDown style={{ width: '22px', height: '22px', color: sigColor }} /> : <TrendingUp style={{ width: '22px', height: '22px', color: sigColor }} />}
                            </div>
                            <span style={{ fontSize: '28px', fontWeight: 900, color: sigColor }}>
                                {sig} {r?.signalStrength && r.signalStrength !== 'NEUTRO' ? r.signalStrength : ''}
                            </span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, color: '#fff', fontSize: '16px', margin: 0 }}>{assetLabel}</p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{tfLabel[timeframe]}</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                    {[
                        { label: 'Entrada', value: r?.entry ?? '—', color: '#fff', bg: 'rgba(255,255,255,0.04)' },
                        { label: 'Stop Loss', value: r?.stopLoss ?? '—', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                        { label: 'Take Profit 1', value: r?.takeProfit1 ?? '—', color: '#00e676', bg: 'rgba(0,230,118,0.08)' },
                        { label: 'Risco/Retorno', value: r?.riskReward ?? '—', color: '#fff', bg: 'rgba(255,255,255,0.04)' },
                    ].map(item => (
                        <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.bg}`, borderRadius: '12px', padding: '14px' }}>
                            <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 4px' }}>{item.label}</p>
                            <p style={{ fontSize: '18px', fontWeight: 800, color: item.color, margin: 0 }}>{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                    { label: 'Confluência', value: r?.confluencia ?? '—', sub: null, color: '#fff' },
                    { label: 'Tendência', value: r?.trend ?? '—', sub: null, color: r?.trend === 'ALTA' ? '#00e676' : r?.trend === 'BAIXA' ? '#ef4444' : '#64748b' },
                    { label: 'RSI (14)', value: r ? `${r.rsi14}` : '—', sub: null, color: r && parseFloat(r.rsi14) < 35 ? '#00e676' : r && parseFloat(r.rsi14) > 65 ? '#ef4444' : '#fff' },
                ].map(m => (
                    <div key={m.label} style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px' }}>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Activity style={{ width: '12px', height: '12px' }} /> {m.label}
                        </p>
                        <p style={{ fontSize: '22px', fontWeight: 900, color: m.color, margin: 0 }}>{m.value}</p>
                    </div>
                ))}
            </div>

            {/* PRO Banner */}
            <div style={{ background: 'linear-gradient(135deg, #1a1206, #1c1a08)', border: '1px solid rgba(255,153,0,0.2)', borderRadius: '14px', padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Crown style={{ width: '20px', height: '20px', color: '#ff9900' }} />
                    <div>
                        <p style={{ fontWeight: 800, color: '#ff9900', margin: 0, fontSize: '14px' }}>Análise PRO mais completa 🔒</p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>+Smart Money, +Harmônicos, +6 camadas de análise institucional</p>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Até 85% mais assertiva</p>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#ff9900', margin: 0, cursor: 'pointer' }}>Desbloquear →</p>
                </div>
            </div>

            {/* Alvos Adicionais */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>Alvos Adicionais</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[{ label: 'TP2', value: r?.takeProfit2 ?? '—' }, { label: 'TP3', value: r?.takeProfit3 ?? '—' }].map(tp => (

                        <div key={tp.label} style={{ background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.1)', borderRadius: '10px', padding: '14px' }}>
                            <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 4px' }}>{tp.label}</p>
                            <p style={{ fontSize: '20px', fontWeight: 800, color: '#00e676', margin: 0 }}>{tp.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cenários de Operação */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <p style={{ fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                        <Zap style={{ width: '16px', height: '16px', color: '#00e5ff' }} /> Cenários de Operação
                    </p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>{assetLabel}</span>
                        <span style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff', fontSize: '11px', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>{tfLabel[timeframe]}</span>
                    </div>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 16px' }}>Probabilidades baseadas em 2 fatores de confluência</p>
                <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginBottom: '12px', fontStyle: 'italic' }}>Cenários condicionais (caso o mercado se mova):</p>

                {/* COMPRA */}
                <div style={{ background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '14px', padding: '20px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,230,118,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp style={{ width: '18px', color: '#00e676' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 900, color: '#00e676', margin: 0, fontSize: '18px' }}>COMPRA</p>
                            <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Probabilidade: <strong style={{ color: '#fff' }}>50%</strong></p>
                        </div>
                    </div>
                    <div style={{ height: '6px', background: '#1e293b', borderRadius: '4px', marginBottom: '16px' }}>
                        <div style={{ width: '50%', height: '100%', background: '#00e676', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: '10px', padding: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#00e676', margin: '0 0 4px' }}>🟢 Gatilho de Entrada</p>
                            <p style={{ fontWeight: 800, color: '#00e676', fontSize: '18px', margin: '0 0 4px' }}>5.232,70</p>
                            <p style={{ fontSize: '10px', color: '#475569', margin: 0 }}>Varredura da mínima 5230.6 — FVG não preenchido</p>
                        </div>
                        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '10px', padding: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px' }}>○ Stop Loss</p>
                            <p style={{ fontWeight: 800, color: '#ef4444', fontSize: '18px', margin: 0 }}>5.216,92</p>
                        </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', fontWeight: 600 }}>Alvos & Probabilidade</p>
                    {[{ tp: 'TP1', val: '5.248,49', pct: '50%', rr: '1:1' }, { tp: 'TP2', val: '5.264,27', pct: '35%', rr: '1:2' }, { tp: 'TP3', val: '5.280,05', pct: '15%', rr: '1:3' }].map(t => (
                        <div key={t.tp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700, width: '30px' }}>{t.tp}</span>
                                <span style={{ fontWeight: 800, color: '#fff' }}>{t.val}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '4px', background: '#00e676', borderRadius: '2px' }} />
                                <span style={{ fontSize: '12px', color: '#00e676', fontWeight: 700, width: '36px', textAlign: 'right' }}>{t.pct}</span>
                                <span style={{ fontSize: '12px', color: '#475569' }}>{t.rr}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* VENDA */}
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown style={{ width: '18px', color: '#ef4444' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 900, color: '#ef4444', margin: 0, fontSize: '18px' }}>VENDA</p>
                            <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>Probabilidade: <strong style={{ color: '#fff' }}>50%</strong></p>
                        </div>
                    </div>
                    <div style={{ height: '6px', background: '#1e293b', borderRadius: '4px', marginBottom: '16px' }}>
                        <div style={{ width: '50%', height: '100%', background: '#ef4444', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#ef4444', margin: '0 0 4px' }}>🔴 Gatilho de Entrada</p>
                            <p style={{ fontWeight: 800, color: '#ef4444', fontSize: '18px', margin: '0 0 4px' }}>5.274,50</p>
                            <p style={{ fontSize: '10px', color: '#475569', margin: 0 }}>Varredura da máxima do range (5276.6) com rejeição</p>
                        </div>
                        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '10px', padding: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 4px' }}>○ Stop Loss</p>
                            <p style={{ fontWeight: 800, color: '#ef4444', fontSize: '18px', margin: 0 }}>5.290,28</p>
                        </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px', fontWeight: 600 }}>Alvos & Probabilidade</p>
                    {[{ tp: 'TP1', val: '5.258,71', pct: '65%', rr: '1:1' }, { tp: 'TP2', val: '5.242,93', pct: '45%', rr: '1:2' }, { tp: 'TP3', val: '5.227,15', pct: '25%', rr: '1:3' }].map(t => (
                        <div key={t.tp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', color: '#475569', fontWeight: 700, width: '30px' }}>{t.tp}</span>
                                <span style={{ fontWeight: 800, color: '#fff' }}>{t.val}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '4px', background: '#ef4444', borderRadius: '2px' }} />
                                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, width: '36px', textAlign: 'right' }}>{t.pct}</span>
                                <span style={{ fontSize: '12px', color: '#475569' }}>{t.rr}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: '#475569', textAlign: 'center', marginTop: '14px', margin: 0 }}>
                    Probabilidades calculadas com base em todas as confluências técnicas e institucionais. Sempre gerencie seu risco.
                </p>
            </div>

            {/* Contexto de Mercado */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ fontWeight: 800, color: '#fff', margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity style={{ width: '16px', height: '16px', color: '#00e5ff' }} /> Contexto de Mercado
                    </p>
                    <span style={{ background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', color: '#ff9900', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px' }}>
                        ⚖ Zona: Equilíbrio
                    </span>
                </div>
                {/* Range bar */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Mín: 5.230,60</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Máx: 5.276,60</span>
                    </div>
                    <div style={{ position: 'relative', height: '8px', background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)', borderRadius: '6px' }}>
                        <div style={{ position: 'absolute', left: '50%', top: '-4px', width: '16px', height: '16px', background: '#00e5ff', borderRadius: '50%', border: '2px solid #fff', transform: 'translateX(-50%)', boxShadow: '0 0 8px rgba(0,229,255,0.6)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#22c55e' }}>Desconto</span>
                        <span style={{ fontSize: '11px', color: '#eab308' }}>Equilíbrio</span>
                        <span style={{ fontSize: '11px', color: '#ef4444' }}>Premium</span>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: '10px', padding: '14px' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <TrendingUp style={{ width: '12px' }} /> Preço Atual
                        </p>
                        <p style={{ fontWeight: 800, color: '#fff', fontSize: '20px', margin: 0 }}>5.253,20</p>
                    </div>
                    <div style={{ background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.12)', borderRadius: '10px', padding: '14px' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <TrendingDown style={{ width: '12px' }} /> Suporte Próximo
                        </p>
                        <p style={{ fontWeight: 800, color: '#00e676', fontSize: '20px', margin: 0 }}>5.230,60</p>
                    </div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <TrendingUp style={{ width: '12px' }} /> Resistência Próxima
                    </p>
                    <p style={{ fontWeight: 800, color: '#ef4444', fontSize: '20px', margin: 0 }}>5.276,60</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 600 }}>Tendência Dominante</span>
                    <span style={{ fontWeight: 900, color: '#00e676', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <TrendingUp style={{ width: '16px' }} /> ALTA
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'center' }}>
                {/* Mensagem de sucesso */}
                {saveStatus === 'success' && (
                    <div style={{ fontSize: '13px', color: '#00e676', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Check style={{ width: '15px', height: '15px' }} /> Análise salva com sucesso!
                    </div>
                )}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {/* Botão Favoritar */}
                    <button
                        onClick={() => {
                            if (!selectedAsset) return;
                            const nowFav = toggleFavorite({ value: selectedAsset.value, label: selectedAsset.label, description: selectedAsset.description, assetType });
                            setIsFav(nowFav);
                        }}
                        title={isFav ? 'Remover dos favoritos' : 'Adicionar ao Radar de Favoritos'}
                        style={{
                            padding: '12px 20px', borderRadius: '12px', border: `1px solid ${isFav ? 'rgba(255,204,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            background: isFav ? 'rgba(255,204,0,0.12)' : 'transparent',
                            color: isFav ? '#ffcc00' : '#94a3b8', fontWeight: 700, fontSize: '14px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px',
                            transition: 'all 0.25s ease',
                        }}
                    >
                        <Star style={{ width: '16px', height: '16px', fill: isFav ? '#ffcc00' : 'none' }} />
                        {isFav ? 'No Radar' : 'Favoritar'}
                    </button>
                    {/* Botão Salvar no Histórico */}
                    <button
                        onClick={saveAnalysis}
                        disabled={saving || !analysisResult || saveStatus === 'success'}
                        style={{
                            padding: '12px 28px', borderRadius: '12px', border: 'none',
                            background: saveStatus === 'success' ? 'linear-gradient(135deg, #00e676, #00b248)' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #00e5ff22, #00b2ff22)',
                            borderWidth: '1px', borderStyle: 'solid',
                            borderColor: saveStatus === 'success' ? '#00e676' : saveStatus === 'error' ? '#ef4444' : 'rgba(0,229,255,0.3)',
                            color: saveStatus === 'success' ? '#000' : saveStatus === 'error' ? '#ef4444' : '#00e5ff',
                            fontWeight: 700, fontSize: '14px', cursor: saving ? 'wait' : (saveStatus === 'success' ? 'default' : 'pointer'),
                            display: 'flex', alignItems: 'center', gap: '8px',
                            opacity: saving ? 0.7 : 1,
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {saveStatus === 'success'
                            ? <Check style={{ width: '16px', height: '16px' }} />
                            : <BookmarkPlus style={{ width: '16px', height: '16px' }} />
                        }
                        {saving ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : saveStatus === 'error' ? '✗ Erro ao Salvar' : 'Salvar no Histórico'}
                    </button>
                    {/* Botão Nova Análise */}
                    <button onClick={() => { setPhase('config'); setSelectedAsset(null); setAssetType(''); setSaveStatus('idle'); }} style={{ padding: '12px 32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                        ← Nova Análise
                    </button>
                </div>
            </div>
        </div>
    );

    // ── CONFIG PHASE ───────────────────────────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px', padding: '12px 36px 12px 40px', color: '#cbd5e1',
        fontSize: '13px', outline: 'none', boxSizing: 'border-box',
        cursor: assetType ? 'pointer' : 'not-allowed', opacity: assetType ? 1 : 0.6,
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px 80px' }}>
            <div style={{ background: '#121318', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '40px 48px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '32px' }}>Configurar Análise</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    {/* Ativo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} ref={dropdownRef}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Ativo</label>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748b', zIndex: 1, pointerEvents: 'none' }} />
                            <input type="text" placeholder={assetType ? 'Selecione o ativo' : 'Selecione o tipo primeiro'} disabled={!assetType}
                                value={dropdownOpen ? search : (selectedAsset ? `${selectedAsset.label}  ${selectedAsset.description}` : '')}
                                onChange={e => setSearch(e.target.value)}
                                onClick={() => { if (assetType) setDropdownOpen(true); }}
                                onFocus={() => { if (assetType) setDropdownOpen(true); }}
                                readOnly={!dropdownOpen} style={inputStyle} />
                            <ChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: `translateY(-50%) rotate(${dropdownOpen ? 180 : 0}deg)`, width: '16px', height: '16px', color: '#64748b', pointerEvents: 'none', transition: 'transform 0.2s' }} />
                            {dropdownOpen && filtered.length > 0 && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', overflow: 'hidden', maxHeight: '260px', overflowY: 'auto' }}>
                                    {filtered.map((asset, i) => (
                                        <div key={asset.value} onClick={() => selectAsset(asset)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: selectedAsset?.value === asset.value ? 'rgba(255,165,0,0.15)' : 'transparent', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = selectedAsset?.value === asset.value ? 'rgba(255,165,0,0.15)' : 'transparent')}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {selectedAsset?.value === asset.value && <Check style={{ width: '14px', height: '14px', color: '#ff9900' }} />}
                                                <span style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>{asset.label}</span>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{asset.description}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Tipo de Ativo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Tipo de Ativo</label>
                        <div style={{ position: 'relative' }}>
                            <select value={assetType} onChange={handleTypeChange} style={selectStyle}>
                                <option value="">Selecione o tipo</option>
                                <option value="forex">Forex (EUR/USD, GBP/USD)</option>
                                <option value="crypto">Criptomoedas (BTC, ETH)</option>
                                <option value="stocks">Ações (AAPL, PETR4)</option>
                                <option value="indices">Índices (S&P 500, IBOV)</option>
                                <option value="commodity">Commodities (Ouro, Petróleo)</option>
                            </select>
                            <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>
                    {/* Timeframe */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Timeframe</label>
                        <div style={{ position: 'relative' }}>
                            <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={selectStyle}>
                                <option value="1m">1 Minuto</option>
                                <option value="5m">5 Minutos</option>
                                <option value="10m">10 Minutos</option>
                                <option value="15m">15 Minutos</option>
                                <option value="1h">1 Hora</option>
                                <option value="4h">4 Horas</option>
                                <option value="1d">Diário</option>
                                <option value="1w">Semanal</option>
                            </select>
                            <svg style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>
                </div>

                <p style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>Tipo de Análise</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Simples */}
                    <div onClick={() => setAnalysisType('simples')} style={{ padding: '20px', borderRadius: '16px', cursor: 'pointer', minHeight: '140px', transition: 'all 0.2s', border: analysisType === 'simples' ? '2px solid #00e5ff' : '2px solid rgba(255,255,255,0.06)', background: analysisType === 'simples' ? '#002028' : '#1c1c24', boxShadow: analysisType === 'simples' ? '0 0 20px rgba(0,229,255,0.1)' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Análise Simples</span>
                            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: analysisType === 'simples' ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.05)', color: analysisType === 'simples' ? '#00e676' : '#64748b' }}>1 crédito</span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>Ideal para uma visão rápida do mercado</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {['Resumo Executivo', 'Indicadores Técnicos'].map(tag => (
                                <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,230,118,0.1)', color: '#00e676', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                                    <Check style={{ width: '12px', height: '12px' }} /> {tag}
                                </span>
                            ))}
                            {['SMC', '+7 mais'].map(tag => (
                                <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.04)', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                                    <Lock style={{ width: '11px', height: '11px' }} /> {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    {/* Completa */}
                    <div onClick={() => setAnalysisType('completa')} style={{ position: 'relative', padding: '20px', borderRadius: '16px', cursor: 'pointer', minHeight: '140px', overflow: 'hidden', transition: 'all 0.2s', border: analysisType === 'completa' ? '2px solid rgba(255,153,0,0.6)' : '2px solid rgba(255,255,255,0.06)', background: analysisType === 'completa' ? '#1c1a12' : '#1c1c24', boxShadow: analysisType === 'completa' ? '0 0 20px rgba(255,153,0,0.1)' : 'none' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(90deg,#ffea00,#ff9900)', color: '#000', fontWeight: 900, fontSize: '10px', padding: '5px 14px', borderBottomLeftRadius: '12px' }}>RECOMENDADO</div>
                        <div style={{ marginBottom: '8px', paddingRight: '110px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Crown style={{ width: '18px', height: '18px', color: '#ff9900' }} /> Análise Completa
                            </span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,153,0,0.1)', border: '1px solid rgba(255,153,0,0.2)', color: '#ff9900', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                                <Crown style={{ width: '12px', height: '12px' }} /> 1 crédito PRO
                            </span>
                        </div>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '14px' }}>Análise profunda com todas as ferramentas PRO</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {['Tudo da Simples', 'SMC', 'Harmônicos', 'WEGD', 'Probabilística', 'Visual IA'].map(item => (
                                <span key={item} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,153,0,0.1)', color: '#ff9900', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                                    <Check style={{ width: '12px', height: '12px' }} /> {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={startAnalysis} style={{ width: '100%', marginTop: '24px', padding: '16px', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '16px', color: '#000', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: analysisType === 'simples' ? '#22d3ee' : 'linear-gradient(90deg,#ffea00,#ff9900)', boxShadow: analysisType === 'simples' ? '0 0 24px rgba(34,211,238,0.25)' : '0 0 24px rgba(255,153,0,0.25)' }}>
                    {analysisType === 'simples' ? <><Sparkles style={{ width: '20px', height: '20px' }} /> Análise Simples (1 Simples)</> : <><Crown style={{ width: '20px', height: '20px' }} /> Análise Completa (1 PRO)</>}
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '14px', fontSize: '13px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Crown style={{ width: '15px', height: '15px', color: '#ff9900' }} /> 4 PRO</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles style={{ width: '15px', height: '15px', color: '#22d3ee' }} /> 5 Simples</span>
                </div>
            </div>
        </div>
    );
}
