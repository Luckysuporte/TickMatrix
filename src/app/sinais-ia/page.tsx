'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Crown, Lock, TrendingUp, TrendingDown, Star, Radio, RefreshCw, AlertTriangle, Settings, X, Check } from 'lucide-react';
import { getFavorites, FavoriteAsset } from '@/lib/favorites';

// ─── Sinais Recentes — começa vazio, pronto para receber dados reais ─────────
const RECENT_SIGNALS: {
    id: number; asset: string; direction: string; badge: string;
    badgeColor: string; stopLoss: string; takeProfit: string; time: string;
    stats: string; positive: boolean;
}[] = [];

// ─── Ativos disponíveis no Filtro Sniper ────────────────────────────────────
const SNIPER_ASSET_GROUPS = [
    {
        group: 'Índices/Futuros',
        assets: [
            { value: 'MNQ', label: 'MNQ', description: 'Micro E-mini Nasdaq' },
            { value: 'MYM', label: 'MYM', description: 'Micro E-mini Dow Jones' },
            { value: 'MGC', label: 'MGC', description: 'Micro Gold' },
            { value: 'WINJ26', label: 'WINJ26', description: 'Mini Índice' },
            { value: 'WDOF25', label: 'WDOF25', description: 'Mini Dólar' },
        ],
    },
    {
        group: 'Forex',
        assets: [
            { value: 'USD/CHF', label: 'USD/CHF', description: 'Dólar / Franco Suíço' },
            { value: 'AUD/EUR', label: 'AUD/EUR', description: 'Dólar Australiano / Euro' },
            { value: 'AUD/JPY', label: 'AUD/JPY', description: 'Dólar Australiano / Iene' },
            { value: 'AUD/GBP', label: 'AUD/GBP', description: 'Dólar Australiano / Libra' },
            { value: 'EUR/USD', label: 'EUR/USD', description: 'Euro / Dólar Americano' },
        ],
    },
    {
        group: 'Commodities',
        assets: [
            { value: 'XAU/USD', label: 'XAU/USD', description: 'Ouro vs Dólar' },
        ],
    },
];
const ALL_SNIPER_VALUES = SNIPER_ASSET_GROUPS.flatMap(g => g.assets.map(a => a.value));
const LS_KEY = 'tickmatrix:sniper:selectedAssets';
const LS_KEY_CUSTOM = 'tickmatrix:sniper:customAssets';

// ─── Types ─────────────────────────────────────────────────────────────────
type TFData = { signal: string; signalStrength: string };

type RadarItem = {
    asset: FavoriteAsset;
    price: string;
    rsi14: string;
    trend: string;
    // sinais por timeframe
    m5: TFData | null;
    m15: TFData | null;
    h1: TFData | null;
    // score 1-3
    stars: number;
    // sinal dominante (baseado no m5)
    signal: string;
    signalStrength: string;
    loading: boolean;
    error: boolean;
    flashing: boolean;
    lastUpdate: Date | null;
};

// ─── Audio helper ──────────────────────────────────────────────────────────
function playAlert(stars: number, direction: 'buy' | 'sell') {
    try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

        if (stars >= 3) {
            // Alerta de Elite: 3 beeps ascendentes
            [0, 0.18, 0.36].forEach((offset, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = direction === 'buy' ? 660 + i * 220 : 880 - i * 220;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.18, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.15);
            });
        } else {
            // Alerta simples: 1 beep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = direction === 'buy' ? 880 : 440;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.13, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start(); osc.stop(ctx.currentTime + 0.35);
        }
    } catch { /* silencioso se bloqueado */ }
}

// ─── Score de confluência ──────────────────────────────────────────────────
// Retorna 1-3 estrelas com base em quantos TFs têm o mesmo sinal
function calcStars(m5: TFData | null, m15: TFData | null, h1: TFData | null): { stars: number; direction: string } {
    const base = m5?.signal;
    if (!base || base === 'NEUTRO') return { stars: 1, direction: base ?? 'NEUTRO' };
    let count = 1;
    if (m15?.signal === base) count++;
    if (h1?.signal === base) count++;
    return { stars: count, direction: base };
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const sigColor = (sig: string) =>
    sig === 'COMPRA' ? '#00e676' : sig === 'VENDA' ? '#ef4444' : '#64748b';

// ─── StarBadge ─────────────────────────────────────────────────────────────
function StarBadge({ stars, direction }: { stars: number; direction: string }) {
    const color = direction === 'COMPRA' ? '#ffcc00' : direction === 'VENDA' ? '#ff9900' : '#334155';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '13px' }} title={`${stars} estrela(s) de confluência`}>
            {Array.from({ length: 3 }).map((_, i) => (
                <Star
                    key={i}
                    style={{ width: '13px', height: '13px', color: i < stars ? color : '#1e293b', fill: i < stars ? color : 'none' }}
                />
            ))}
        </span>
    );
}

// ─── TF chip ───────────────────────────────────────────────────────────────
function TFChip({ label, data }: { label: string; data: TFData | null }) {
    const c = data ? sigColor(data.signal) : '#334155';
    return (
        <span style={{
            fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px',
            background: `${c}18`, color: c, border: `1px solid ${c}30`,
        }}>
            {label} {data ? data.signal.slice(0, 1) : '?'}
            {data?.signalStrength === 'FORTE' ? '★' : ''}
        </span>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function SinaisIA() {
    const [active, setActive] = useState(false);
    const [radarData, setRadarData] = useState<Record<string, RadarItem>>({});
    const [favorites, setFavorites] = useState<FavoriteAsset[]>([]);
    const [countdown, setCountdown] = useState(120);
    const prevSignals = useRef<Record<string, string>>({});

    // ── Construtor de Estratégias (Filtros de Confluência) ──────────────────
    const [activeFilters, setActiveFilters] = useState({
        supertrend: true,
        rsi: false,
        macd: false,
        emas: false,
    });

    // ── Filtro Sniper ───────────────────────────────────────────────────────
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('Índices/Futuros');

    // Ativos customizados (adicionados pelo usuário)
    const [customAssets, setCustomAssets] = useState<{ value: string; label: string; description: string }[]>(() => {
        try {
            const saved = localStorage.getItem(LS_KEY_CUSTOM);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    // Ativos selecionados (padrão + customizados)
    const [selectedSignalAssets, setSelectedSignalAssets] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? JSON.parse(saved) : ALL_SNIPER_VALUES;
        } catch { return ALL_SNIPER_VALUES; }
    });

    const persist = (selected: string[]) => {
        try { localStorage.setItem(LS_KEY, JSON.stringify(selected)); } catch { /* ignore */ }
    };
    const persistCustom = (custom: { value: string; label: string; description: string }[]) => {
        try { localStorage.setItem(LS_KEY_CUSTOM, JSON.stringify(custom)); } catch { /* ignore */ }
    };

    const toggleSniperAsset = (value: string) => {
        setSelectedSignalAssets(prev => {
            const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
            persist(next);
            return next;
        });
    };

    const removeCustomAsset = (value: string) => {
        setCustomAssets(prev => {
            const next = prev.filter(a => a.value !== value);
            persistCustom(next);
            return next;
        });
        setSelectedSignalAssets(prev => {
            const next = prev.filter(v => v !== value);
            persist(next);
            return next;
        });
    };

    const selectAll = () => {
        const all = [...ALL_SNIPER_VALUES, ...customAssets.map(a => a.value)];
        setSelectedSignalAssets(all);
        persist(all);
    };

    const clearAll = () => {
        setSelectedSignalAssets([]);
        persist([]);
    };
    // ────────────────────────────────────────────────────────────────────────

    useEffect(() => { setFavorites(getFavorites()); }, []);

    // Helper de delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Busca único TF de um ativo (retorna objeto completo)
    const fetchTF = async (fav: FavoriteAsset, timeframe: string) => {
        const symbol = fav.value; // Twelve Data exige XAU/USD (com barra); encodeURIComponent na route trata a URL
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, timeframe, assetType: fav.assetType, filters: activeFilters }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(`[${fav.value} ${timeframe}] HTTP ${res.status}: ${data.error ?? JSON.stringify(data)}`);
        return data;
    };

    // Busca os 3 TFs de forma SEQUENCIAL (com delay) para evitar Rate Limit
    const fetchOne = async (fav: FavoriteAsset) => {
        try {
            // M5 primeiro — reaproveita os dados de preço, rsi, trend
            const m5Data = await fetchTF(fav, '5m');
            await delay(2000);

            const m15Data = await fetchTF(fav, '15m');
            await delay(2000);

            const h1Data = await fetchTF(fav, '1h');

            const m5: TFData = { signal: m5Data.signal, signalStrength: m5Data.signalStrength };
            const m15: TFData = { signal: m15Data.signal, signalStrength: m15Data.signalStrength };
            const h1: TFData = { signal: h1Data.signal, signalStrength: h1Data.signalStrength };

            const { stars, direction } = calcStars(m5, m15, h1);
            const oldSig = prevSignals.current[fav.value];
            const changed = oldSig !== undefined && oldSig !== direction;
            prevSignals.current[fav.value] = direction;

            if (changed) {
                playAlert(stars, direction === 'COMPRA' ? 'buy' : 'sell');
            } else if (stars === 3 && oldSig === undefined) {
                // Primeira carga já com 3 estrelas — alerta de elite
                playAlert(3, direction === 'COMPRA' ? 'buy' : 'sell');
            }

            setRadarData(prev => ({
                ...prev,
                [fav.value]: {
                    asset: fav,
                    // Reutiliza dados do M5 para preço/rsi/trend (evita chamada extra)
                    price: m5Data.price ?? '—',
                    rsi14: m5Data.rsi14 ?? '—',
                    trend: m5Data.trend ?? '—',
                    m5, m15, h1,
                    stars,
                    signal: direction,
                    signalStrength: m5.signalStrength,
                    loading: false,
                    error: false,
                    flashing: changed,
                    lastUpdate: new Date(),
                },
            }));

            if (changed) {
                setTimeout(() => setRadarData(prev => ({ ...prev, [fav.value]: { ...prev[fav.value], flashing: false } })), 2500);
            }
        } catch (err) {
            // Log silencioso no console para diagnóstico (sem exibir erro na UI)
            console.error(`[Radar] Falha ao buscar ${fav.value}:`, err instanceof Error ? err.message : err);

            // Preserva os ÚLTIMOS dados conhecidos e não exibe erro na tela.
            // A próxima tentativa automática ocorrerá em 120s.
            setRadarData(prev => ({
                ...prev,
                [fav.value]: {
                    ...(prev[fav.value] ?? {
                        asset: fav, price: '—', rsi14: '—', trend: '—',
                        m5: null, m15: null, h1: null, stars: 0,
                        signal: '—', signalStrength: '—', flashing: false, lastUpdate: null,
                    }),
                    loading: false,
                    error: false, // silencioso — dados anteriores ficam na tela
                },
            }));
        }
    };

    const fetchAll = async (favs: FavoriteAsset[]) => {
        // Marca todos como carregando antes de iniciar
        setRadarData(prev => {
            const updated = { ...prev };
            favs.forEach(f => {
                updated[f.value] = {
                    ...(updated[f.value] ?? {
                        asset: f, price: '—', rsi14: '—', trend: '—',
                        m5: null, m15: null, h1: null, stars: 0,
                        signal: '—', signalStrength: '—', flashing: false, lastUpdate: null,
                    }),
                    loading: true, error: false,
                };
            });
            return updated;
        });
        // Processa ativos SEQUENCIALMENTE com 2s de intervalo entre eles
        // para não sobrecarregar a API com muitas requisições simultâneas
        for (let i = 0; i < favs.length; i++) {
            await fetchOne(favs[i]);
            if (i < favs.length - 1) await delay(2000);
        }
    };

    useEffect(() => {
        if (favorites.length === 0) return;
        fetchAll(favorites);
        setCountdown(120);

        let counter = 120;
        const tick = setInterval(() => {
            counter -= 1;
            setCountdown(counter);
            if (counter <= 0) {
                counter = 120;
                setCountdown(120);
                fetchAll(favorites);
            }
        }, 1000);
        return () => clearInterval(tick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favorites, activeFilters]);

    const rowBg = (positive: boolean, badge: string) => {
        if (badge === 'Stop') return 'rgba(255,61,0,0.06)';
        return positive ? 'rgba(0,230,118,0.04)' : 'transparent';
    };
    // rowBg mantida para uso futuro quando sinais reais forem conectados

    // Ordenação: 3★ > 2★ > 1★, depois FORTE
    const radarItems = Object.values(radarData).sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        const aS = a.signalStrength === 'FORTE' ? 0 : 1;
        const bS = b.signalStrength === 'FORTE' ? 0 : 1;
        return aS - bS;
    });

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 80px', fontFamily: 'inherit' }}>

            {/* ════════════════════════════════════════
                MEU RADAR — Score de Confluência
            ════════════════════════════════════════ */}
            <div style={{ marginBottom: '24px' }}>
                {/* Header */}
                <div style={{
                    background: '#0d1117',
                    border: '1px solid rgba(255,204,0,0.18)',
                    borderBottom: favorites.length === 0 ? '1px solid rgba(255,204,0,0.18)' : 'none',
                    borderRadius: favorites.length === 0 ? '16px' : '16px 16px 0 0',
                    padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Star style={{ width: '16px', height: '16px', color: '#ffcc00', fill: '#ffcc00' }} />
                        <div>
                            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#ffcc00', margin: 0 }}>
                                Meu Radar — Score de Confluência
                            </h2>
                            <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>
                                M5 · M15 · H1 • Atualiza a cada 60s
                            </p>
                        </div>
                    </div>
                    {favorites.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#475569' }}>
                                <Radio style={{ width: '12px', height: '12px', color: '#00e676' }} />
                                <span style={{ color: '#00e676', fontWeight: 700 }}>{countdown}s</span>
                            </div>
                            <button
                                onClick={() => fetchAll(favorites)}
                                title="Atualizar agora"
                                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
                            >
                                <RefreshCw style={{ width: '13px', height: '13px' }} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Legenda de estrelas */}
                {favorites.length > 0 && (
                    <div style={{
                        background: '#080b10', borderLeft: '1px solid rgba(255,204,0,0.12)', borderRight: '1px solid rgba(255,204,0,0.12)',
                        padding: '8px 20px', display: 'flex', gap: '20px', flexWrap: 'wrap',
                    }}>
                        {[
                            { stars: 1, label: '1★ — Sinal só no M5' },
                            { stars: 2, label: '2★ — M5 + M15 alinhados' },
                            { stars: 3, label: '3★ — Oportunidade de Elite (M5+M15+H1)' },
                        ].map(({ stars, label }) => (
                            <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
                                <StarBadge stars={stars} direction="COMPRA" />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sem favoritos */}
                {favorites.length === 0 && (
                    <div style={{
                        background: '#0d1117', border: '1px solid rgba(255,204,0,0.08)',
                        borderTop: 'none', borderRadius: '0 0 16px 16px',
                        padding: '28px 20px', textAlign: 'center',
                    }}>
                        <Star style={{ width: '28px', height: '28px', color: '#334155', margin: '0 auto 10px' }} />
                        <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>Nenhum favorito ainda.</p>
                        <p style={{ color: '#334155', fontSize: '12px', margin: '4px 0 0' }}>
                            Faça uma análise e clique em <strong style={{ color: '#ffcc00' }}>⭐ Favoritar</strong> para adicionar ao radar.
                        </p>
                    </div>
                )}

                {/* Cards */}
                {radarItems.length > 0 && (
                    <div style={{
                        background: '#0a0d12',
                        border: '1px solid rgba(255,204,0,0.1)',
                        borderTop: 'none',
                        borderRadius: '0 0 16px 16px',
                        overflow: 'hidden',
                    }}>
                        <style>{`
                            @keyframes radarFlash {
                                0%,100% { box-shadow: none; }
                                25%,75%  { box-shadow: 0 0 0 2px #ffcc00, 0 0 18px rgba(255,204,0,0.4); }
                            }
                            @keyframes eliteGlow {
                                0%,100% { box-shadow: 0 0 14px rgba(255,204,0,0.2); }
                                50%      { box-shadow: 0 0 32px rgba(255,204,0,0.55); }
                            }
                            .radar-flash  { animation: radarFlash 0.6s ease 4; }
                            .elite-card   { animation: eliteGlow 1.8s ease-in-out infinite; }
                        `}</style>

                        {radarItems.map((item, i) => {
                            const isElite = item.stars === 3 && (item.signal === 'COMPRA' || item.signal === 'VENDA');
                            const c = sigColor(item.signal);
                            const eliteBg = item.signal === 'COMPRA'
                                ? 'linear-gradient(135deg, rgba(0,230,118,0.07), rgba(0,230,118,0.02))'
                                : item.signal === 'VENDA'
                                    ? 'linear-gradient(135deg, rgba(239,68,68,0.07), rgba(239,68,68,0.02))'
                                    : 'transparent';

                            return (
                                <div
                                    key={item.asset.value}
                                    className={[
                                        item.flashing ? 'radar-flash' : '',
                                        isElite ? 'elite-card' : '',
                                    ].join(' ').trim()}
                                    style={{
                                        padding: '16px 20px',
                                        background: isElite ? eliteBg : 'transparent',
                                        borderBottom: i < radarItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                        transition: 'background 0.3s',
                                    }}
                                >
                                    {/* Linha 1: ativo + estrelas + badge sinal */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                        {/* Ícone */}
                                        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {item.signal === 'VENDA'
                                                ? <TrendingDown style={{ width: '16px', height: '16px', color: c }} />
                                                : <TrendingUp style={{ width: '16px', height: '16px', color: c }} />
                                            }
                                        </div>

                                        {/* Nome + estrelas */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <span style={{ fontWeight: 800, color: '#fff', fontSize: '15px' }}>{item.asset.label}</span>
                                            {!item.loading && <StarBadge stars={item.stars} direction={item.signal} />}
                                        </div>

                                        {/* Badge sinal */}
                                        {!item.loading && (
                                            <span style={{
                                                fontSize: '10px', fontWeight: 800, padding: '2px 9px', borderRadius: '6px',
                                                background: `${c}20`, color: c, border: `1px solid ${c}40`,
                                            }}>
                                                {item.signal}{item.signalStrength === 'FORTE' ? ' FORTE' : ''}
                                            </span>
                                        )}

                                        {/* Banner Elite */}
                                        {isElite && (
                                            <span style={{
                                                fontSize: '10px', fontWeight: 900, color: '#000',
                                                background: 'linear-gradient(90deg, #ffcc00, #ff9900)',
                                                padding: '2px 10px', borderRadius: '20px',
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                            }}>
                                                <AlertTriangle style={{ width: '10px', height: '10px' }} /> ELITE 3★
                                            </span>
                                        )}

                                        {item.loading && <span style={{ fontSize: '11px', color: '#475569' }}>Carregando...</span>}
                                        {item.error && (
                                            <span title="Falha na última atualização — dados anteriores mantidos" style={{
                                                fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px',
                                                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                                                padding: '1px 7px', borderRadius: '5px',
                                            }}>
                                                ⚠️ falha na atualização
                                            </span>
                                        )}

                                        {/* Horário atualização */}
                                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#334155' }}>
                                            {item.lastUpdate?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '—'}
                                        </span>

                                        {/* Botão de Recarregar individual — aparece só quando há erro */}
                                        {item.error && !item.loading && (
                                            <button
                                                onClick={() => fetchOne(item.asset)}
                                                title="Tentar recarregar este ativo"
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '6px',
                                                    padding: '3px 8px',
                                                    cursor: 'pointer',
                                                    color: '#94a3b8',
                                                    fontSize: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginLeft: '4px',
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => {
                                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                                                    (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                                                }}
                                                onMouseLeave={e => {
                                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                                                    (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                                                }}
                                            >
                                                🔄 Recarregar
                                            </button>
                                        )}
                                    </div>

                                    {/* Linha 2: chips TF + métricas */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <TFChip label="M5" data={item.m5} />
                                        <TFChip label="M15" data={item.m15} />
                                        <TFChip label="H1" data={item.h1} />

                                        <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />

                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            Preço <strong style={{ color: '#fff' }}>{item.loading ? '…' : item.price}</strong>
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            RSI <strong style={{
                                                color: item.loading ? '#64748b'
                                                    : parseFloat(item.rsi14) < 35 ? '#00e676'
                                                        : parseFloat(item.rsi14) > 65 ? '#ef4444'
                                                            : '#fff'
                                            }}>{item.loading ? '…' : item.rsi14}</strong>
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            Tend <strong style={{
                                                color: item.trend === 'ALTA' ? '#00e676' : item.trend === 'BAIXA' ? '#ef4444' : '#64748b'
                                            }}>{item.loading ? '…' : item.trend}</strong>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Header Sinais IA ── */}
            <div style={{ background: '#0d1117', border: '1px solid rgba(0,229,255,0.08)', borderBottom: 'none', borderRadius: '16px 16px 0 0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Zap style={{ width: '16px', height: '16px' }} />
                        Sinais IA em Tempo Real
                    </h2>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0' }}>Sinais de trading gerados por IA com alta confiança</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Botão Filtro Sniper */}
                    <button
                        onClick={() => setFilterOpen(true)}
                        title="Filtrar Ativos (Modo Sniper)"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                            border: '1px solid rgba(0,229,255,0.25)',
                            background: selectedSignalAssets.length < ALL_SNIPER_VALUES.length
                                ? 'rgba(0,229,255,0.12)'
                                : 'rgba(255,255,255,0.04)',
                            color: selectedSignalAssets.length < ALL_SNIPER_VALUES.length ? '#00e5ff' : '#64748b',
                            fontSize: '11px', fontWeight: 700, transition: 'all 0.2s',
                        }}
                    >
                        <Settings style={{ width: '13px', height: '13px' }} />
                        Sniper
                        <span style={{
                            background: 'rgba(0,229,255,0.2)', color: '#00e5ff',
                            fontSize: '10px', fontWeight: 900, padding: '1px 6px',
                            borderRadius: '10px', minWidth: '18px', textAlign: 'center',
                        }}>
                            {selectedSignalAssets.length}/{ALL_SNIPER_VALUES.length}
                        </span>
                    </button>
                    {/* Toggle Ativo/Inativo */}
                    <span style={{ fontSize: '12px', color: active ? '#00e5ff' : '#475569', fontWeight: 700 }}>{active ? 'Ativo' : 'Inativo'}</span>
                    <div onClick={() => setActive(!active)} style={{ width: '44px', height: '24px', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', background: active ? '#00e5ff' : '#1e293b' }}>
                        <div style={{ position: 'absolute', top: '3px', left: active ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }} />
                    </div>
                </div>
            </div>

            {/* ── Desbloquear Sinais ── */}
            <div style={{ background: '#0f1722', border: '1px solid rgba(255,153,0,0.15)', padding: '14px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#ff9900', display: 'flex', alignItems: 'center', gap: '7px', margin: '0 0 4px' }}>
                        <Crown style={{ width: '14px', height: '14px' }} />
                        Desbloquear Sinais
                    </p>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                        🌟 <strong style={{ color: '#ff9900' }}>1 crédito PRO/hora</strong>{' '}
                        <span style={{ color: '#475569' }}>Frequência: ativo</span>
                    </p>
                    <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0' }}>Dica: Desative quando não estiver usando para economizar créditos</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>OFF</div>
                    <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: '#1e293b', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', top: '3px', left: '3px', width: '14px', height: '14px', borderRadius: '50%', background: '#475569' }} />
                    </div>
                </div>
            </div>

            {/* ── Construtor de Estratégias (Filtros de Confluência) ── */}
            <div style={{
                background: '#0a0f16', border: '1px solid rgba(0,229,255,0.06)',
                padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings style={{ width: '15px', height: '15px', color: '#00e5ff' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>Construtor de Estratégias</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                    {/* SuperTrend */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: activeFilters.supertrend ? '#00e5ff' : '#64748b', fontWeight: 700 }}>SuperTrend (ATR)</span>
                        <div
                            onClick={() => setActiveFilters(prev => ({ ...prev, supertrend: !prev.supertrend }))}
                            style={{
                                width: '32px', height: '18px', borderRadius: '9px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                background: activeFilters.supertrend ? '#00e5ff' : '#1e293b'
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: '2px', left: activeFilters.supertrend ? '16px' : '2px',
                                width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                            }} />
                        </div>
                    </div>

                    {/* RSI */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: activeFilters.rsi ? '#00e5ff' : '#64748b', fontWeight: 700 }}>Força Relativa (RSI)</span>
                        <div
                            onClick={() => setActiveFilters(prev => ({ ...prev, rsi: !prev.rsi }))}
                            style={{
                                width: '32px', height: '18px', borderRadius: '9px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                background: activeFilters.rsi ? '#00e5ff' : '#1e293b'
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: '2px', left: activeFilters.rsi ? '16px' : '2px',
                                width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                            }} />
                        </div>
                    </div>

                    {/* MACD */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: activeFilters.macd ? '#00e5ff' : '#64748b', fontWeight: 700 }}>Cruzamento MACD</span>
                        <div
                            onClick={() => setActiveFilters(prev => ({ ...prev, macd: !prev.macd }))}
                            style={{
                                width: '32px', height: '18px', borderRadius: '9px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                background: activeFilters.macd ? '#00e5ff' : '#1e293b'
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: '2px', left: activeFilters.macd ? '16px' : '2px',
                                width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                            }} />
                        </div>
                    </div>

                    {/* EMAs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: activeFilters.emas ? '#00e5ff' : '#64748b', fontWeight: 700 }}>Alinhamento de Médias</span>
                        <div
                            onClick={() => setActiveFilters(prev => ({ ...prev, emas: !prev.emas }))}
                            style={{
                                width: '32px', height: '18px', borderRadius: '9px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                background: activeFilters.emas ? '#00e5ff' : '#1e293b'
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: '2px', left: activeFilters.emas ? '16px' : '2px',
                                width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                            }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Sinais Ativos ── */}
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.04)', borderTop: '1px solid rgba(0,229,255,0.06)' }}>
                <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <Zap style={{ width: '14px', height: '14px' }} /> Sinais Ativos (2)
                    </span>
                    <span style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Lock style={{ width: '12px', height: '12px' }} /> Bloqueado
                    </span>
                </div>
                {[0].map(i => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px', background: 'rgba(0,230,118,0.04)', padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)', backdropFilter: 'blur(2px)', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #00e676', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                <Crown style={{ width: '14px', height: '14px', color: '#00e676' }} />
                            </div>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#00e676', margin: 0 }}>Oportunidade de Lucro</p>
                            <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>Ative uma assinatura para desbloquear</p>
                        </div>
                        <div style={{ width: '100%', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }} />
                    </div>
                ))}
            </div>

            {/* ── Sinais Recentes ── */}
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.04)', borderTop: '1px solid rgba(0,229,255,0.06)', borderRadius: '0 0 16px 16px' }}>
                <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <Zap style={{ width: '14px', height: '14px', color: '#ff9900' }} /> Sinais Recentes
                    </span>
                </div>
                {RECENT_SIGNALS.length === 0 ? (
                    /* ── Empty State ─────────────────────────────────────────── */
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', padding: '40px 24px', gap: '14px',
                    }}>
                        {/* Ícone de radar animado */}
                        <style>{`
                            @keyframes radarSpin {
                                0%   { transform: rotate(0deg);   opacity: 1; }
                                50%  { transform: rotate(180deg); opacity: 0.5; }
                                100% { transform: rotate(360deg); opacity: 1; }
                            }
                            @keyframes radarPing {
                                0%, 100% { transform: scale(1);   opacity: 0.15; }
                                50%       { transform: scale(1.6); opacity: 0; }
                            }
                        `}</style>
                        <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Anel pulsante */}
                            <div style={{
                                position: 'absolute', inset: 0, borderRadius: '50%',
                                border: '2px solid rgba(0,229,255,0.35)',
                                animation: 'radarPing 2.2s ease-in-out infinite',
                            }} />
                            {/* Ícone principal */}
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'rgba(0,229,255,0.07)',
                                border: '1px solid rgba(0,229,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Radio
                                    style={{
                                        width: '20px', height: '20px', color: '#00e5ff',
                                        animation: 'radarSpin 3s linear infinite',
                                    }}
                                />
                            </div>
                        </div>
                        {/* Textos */}
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', margin: '0 0 6px' }}>
                                Modo Sniper ativado.
                            </p>
                            <p style={{ fontSize: '11px', color: '#334155', margin: '0 0 10px', letterSpacing: '0.02em' }}>
                                Aguardando oportunidades de Elite nos ativos selecionados...
                            </p>
                            {selectedSignalAssets.length > 0 ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center', marginBottom: '4px' }}>
                                    {selectedSignalAssets.map(v => (
                                        <span key={v} style={{
                                            fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '5px',
                                            background: 'rgba(0,229,255,0.08)', color: '#00e5ff',
                                            border: '1px solid rgba(0,229,255,0.18)',
                                        }}>{v}</span>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: '11px', color: '#ef4444', margin: 0 }}>
                                    ⚠ Nenhum ativo selecionado no filtro Sniper.
                                </p>
                            )}
                        </div>
                        {/* Linha decorativa */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            {[...Array(3)].map((_, i) => (
                                <div key={i} style={{
                                    width: '4px', height: '4px', borderRadius: '50%',
                                    background: '#1e293b',
                                }} />
                            ))}
                        </div>
                    </div>
                ) : (
                    RECENT_SIGNALS.map((sig, i) => (
                        <div key={sig.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '12px 24px', background: rowBg(sig.positive, sig.badge), borderBottom: i < RECENT_SIGNALS.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                            onMouseLeave={e => (e.currentTarget.style.background = rowBg(sig.positive, sig.badge))}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    {sig.direction === 'buy' ? <TrendingUp style={{ width: '14px', height: '14px', color: '#00e676' }} /> : <TrendingDown style={{ width: '14px', height: '14px', color: '#ff3d00' }} />}
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{sig.asset}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: `${sig.badgeColor}20`, color: sig.badgeColor }}>{sig.badge} {sig.badge === 'Take' ? '✓' : '✗'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(248,113,113,0.2)' }}>SL: {sig.stopLoss}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(74,222,128,0.2)' }}>TP: {sig.takeProfit}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 4px' }}>{sig.time}</p>
                                <p style={{ fontSize: '11px', color: '#475569', margin: 0, fontFamily: 'monospace' }}>{sig.stats}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ════════════════════════════════════════
                MODAL — Filtro Sniper
            ════════════════════════════════════════ */}
            {filterOpen && (
                <>
                    {/* Overlay */}
                    <div
                        onClick={() => setFilterOpen(false)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 80,
                            background: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />
                    {/* Painel */}
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        zIndex: 81, width: '100%', maxWidth: '420px',
                        background: '#0d1117',
                        border: '1px solid rgba(0,229,255,0.2)',
                        borderRadius: '20px',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                    }}>
                        {/* Header do modal */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '18px 22px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '9px',
                                    background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Settings style={{ width: '15px', height: '15px', color: '#00e5ff' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>Filtro Sniper</p>
                                    <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>Selecione os ativos que deseja monitorar</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFilterOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', padding: '4px' }}
                            >
                                <X style={{ width: '18px', height: '18px' }} />
                            </button>
                        </div>

                        {/* ── Selecionador de Categorias (Abas) ───────────────────────── */}
                        <div style={{
                            padding: '14px 22px 0',
                            display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px',
                            scrollbarWidth: 'none', msOverflowStyle: 'none',
                        }}>
                            {SNIPER_ASSET_GROUPS.map(cat => (
                                <button
                                    key={cat.group}
                                    onClick={() => setSelectedCategory(cat.group)}
                                    style={{
                                        padding: '6px 14px', borderRadius: '14px', fontSize: '11px', fontWeight: 800,
                                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', border: 'none',
                                        background: selectedCategory === cat.group ? '#00e5ff' : 'rgba(255,255,255,0.06)',
                                        color: selectedCategory === cat.group ? '#000' : '#94a3b8',
                                    }}
                                >
                                    {cat.group}
                                </button>
                            ))}
                            {customAssets.length > 0 && (
                                <button
                                    onClick={() => setSelectedCategory('Customizados')}
                                    style={{
                                        padding: '6px 14px', borderRadius: '14px', fontSize: '11px', fontWeight: 800,
                                        cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', border: 'none',
                                        background: selectedCategory === 'Customizados' ? '#00e5ff' : 'rgba(255,255,255,0.06)',
                                        color: selectedCategory === 'Customizados' ? '#000' : '#94a3b8',
                                    }}
                                >
                                    Customizados
                                </button>
                            )}
                        </div>

                        {/* ── Ações rápidas ───────────────────────────────── */}
                        <div style={{
                            display: 'flex', gap: '8px', padding: '12px 22px',
                        }}>
                            <button onClick={selectAll} style={{
                                flex: 1, padding: '7px 0', borderRadius: '8px', cursor: 'pointer',
                                border: '1px solid rgba(0,230,118,0.25)', background: 'rgba(0,230,118,0.08)',
                                color: '#00e676', fontSize: '12px', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            }}>
                                <Check style={{ width: '13px', height: '13px' }} /> Selecionar Todos
                            </button>
                            <button onClick={clearAll} style={{
                                flex: 1, padding: '7px 0', borderRadius: '8px', cursor: 'pointer',
                                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                                color: '#64748b', fontSize: '12px', fontWeight: 700,
                            }}>
                                Limpar Seleção
                            </button>
                        </div>

                        {/* ── Lista de checkboxes por Categoria selecionada ───────────────── */}
                        <div style={{
                            padding: '0 22px 20px', maxHeight: '340px', overflowY: 'auto',
                            borderTop: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            {/* Rendereização do Grupo Escolhido (Padrão) */}
                            {SNIPER_ASSET_GROUPS.filter(g => g.group === selectedCategory).map(group => (
                                <div key={group.group} style={{ marginTop: '14px' }}>
                                    {group.assets.map(asset => {
                                        const checked = selectedSignalAssets.includes(asset.value);
                                        return (
                                            <div
                                                key={asset.value}
                                                onClick={() => toggleSniperAsset(asset.value)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                                    marginBottom: '4px', transition: 'background 0.15s',
                                                    background: checked ? 'rgba(0,229,255,0.07)' : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${checked ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
                                                }}
                                            >
                                                <div style={{
                                                    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                                                    border: `2px solid ${checked ? '#00e5ff' : '#334155'}`,
                                                    background: checked ? '#00e5ff' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.15s',
                                                }}>
                                                    {checked && <Check style={{ width: '11px', height: '11px', color: '#000' }} />}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'monospace' }}>{asset.label}</p>
                                                    <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>{asset.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Renderização da Tab Customizados (Retroativa) */}
                            {selectedCategory === 'Customizados' && customAssets.length > 0 && (
                                <div style={{ marginTop: '14px' }}>
                                    {customAssets.map(asset => {
                                        const checked = selectedSignalAssets.includes(asset.value);
                                        return (
                                            <div key={asset.value} style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '9px 12px', borderRadius: '10px', cursor: 'pointer',
                                                marginBottom: '4px', transition: 'background 0.15s',
                                                background: checked ? 'rgba(0,229,255,0.07)' : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${checked ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.04)'}`,
                                            }}>
                                                {/* Checkbox */}
                                                <div
                                                    onClick={() => toggleSniperAsset(asset.value)}
                                                    style={{
                                                        width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                                                        border: `2px solid ${checked ? '#00e5ff' : '#334155'}`,
                                                        background: checked ? '#00e5ff' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {checked && <Check style={{ width: '11px', height: '11px', color: '#000' }} />}
                                                </div>
                                                {/* Label */}
                                                <div style={{ flex: 1 }} onClick={() => toggleSniperAsset(asset.value)}>
                                                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'monospace' }}>{asset.label}</p>
                                                    <p style={{ fontSize: '10px', color: '#475569', margin: 0 }}>Ativo personalizado antigo</p>
                                                </div>
                                                {/* Botão remover */}
                                                <button
                                                    onClick={e => { e.stopPropagation(); removeCustomAsset(asset.value); }}
                                                    title="Remover ativo"
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: '#334155', padding: '3px', display: 'flex',
                                                        borderRadius: '4px', transition: 'color 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                                    onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
                                                >
                                                    <X style={{ width: '13px', height: '13px' }} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '14px 22px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span style={{ fontSize: '12px', color: '#475569' }}>
                                <strong style={{ color: '#00e5ff' }}>{selectedSignalAssets.length}</strong> de {ALL_SNIPER_VALUES.length + customAssets.length} ativos selecionados
                            </span>
                            <button
                                onClick={() => setFilterOpen(false)}
                                style={{
                                    padding: '9px 22px', borderRadius: '10px', cursor: 'pointer', border: 'none',
                                    background: 'linear-gradient(135deg, #00e5ff, #0099cc)',
                                    color: '#000', fontWeight: 800, fontSize: '13px',
                                }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </>
            )
            }

        </div >
    );
}
