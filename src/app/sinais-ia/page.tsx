'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Crown, Lock, TrendingUp, TrendingDown, Star, Radio, RefreshCw, AlertTriangle } from 'lucide-react';
import { getFavorites, FavoriteAsset } from '@/lib/favorites';

// ─── Mock data ────────────────────────────────────────────────────────────────
const RECENT_SIGNALS = [
    { id: 1, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$21.10', pct: '+1.10%', time: '9h atrás', stats: '0.0T  +$21.1  1.0x  +$211.00', positive: true },
    { id: 2, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$44.20', pct: '+0.91%', time: '5h atrás', stats: '0.0T  +$44.7  1.0x  +$442.00', positive: true },
    { id: 3, asset: 'BTCUSD', direction: 'sell', badge: 'Stop', badgeColor: '#ff3d00', result: '-$39.52', pct: '-0.70%', time: '18h atrás', stats: '0.0T  -$3.93  1.0x  -$395.20', positive: false },
    { id: 4, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$54.80', pct: '+0.19%', time: '13h atrás', stats: '0.0T  +$5.48  1.0x  +$548.00', positive: true },
    { id: 5, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$28.80', pct: '+0.18%', time: '7h atrás', stats: '0.0T  +$7.88  1.0x  +$288.00', positive: true },
    { id: 6, asset: 'AUDUSD', direction: 'sell', badge: 'Stop', badgeColor: '#ff3d00', result: '-$33.30', pct: '-0.70%', time: '19h atrás', stats: '0.0T  -$3.25  1.0x  -$333.00', positive: false },
];

// ─── Radar types ──────────────────────────────────────────────────────────────
type RadarItem = {
    asset: FavoriteAsset;
    price: string;
    rsi14: string;
    signal: string;
    signalStrength: string;
    trend: string;
    loading: boolean;
    error: boolean;
    flashing: boolean;  // piscar quando sinal muda
    lastUpdate: Date | null;
};

// ─── Audio helper (Web Audio API) ─────────────────────────────────────────────
function playAlert(type: 'buy' | 'sell') {
    try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = type === 'buy' ? 880 : 440;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch { /* silencioso se bloqueado pelo browser */ }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sigColor = (sig: string) =>
    sig === 'COMPRA' ? '#00e676' : sig === 'VENDA' ? '#ef4444' : '#64748b';

const sigBg = (sig: string) =>
    sig === 'COMPRA' ? 'rgba(0,230,118,0.08)' : sig === 'VENDA' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)';

const isStrong = (sig: string, str: string) =>
    (sig === 'COMPRA' || sig === 'VENDA') && str === 'FORTE';

// ─── Component ────────────────────────────────────────────────────────────────
export default function SinaisIA() {
    const [active, setActive] = useState(false);
    const [radarData, setRadarData] = useState<Record<string, RadarItem>>({});
    const [favorites, setFavorites] = useState<FavoriteAsset[]>([]);
    const [countdown, setCountdown] = useState(60);
    const prevSignals = useRef<Record<string, string>>({});

    // Carrega favoritos do localStorage (SSR-safe)
    useEffect(() => {
        setFavorites(getFavorites());
    }, []);

    // Fetch de um único favorito
    const fetchOne = async (fav: FavoriteAsset) => {
        // símbolo sem barra para a API
        const symbol = fav.value.replace('/', '');
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, timeframe: '5m', assetType: fav.assetType }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error ?? 'err');

            const newSig: string = data.signal;
            const oldSig = prevSignals.current[fav.value];
            const changed = oldSig !== undefined && oldSig !== newSig;
            prevSignals.current[fav.value] = newSig;

            // dispara alerta se sinal mudou
            if (changed) {
                playAlert(newSig === 'COMPRA' ? 'buy' : 'sell');
            }

            setRadarData(prev => ({
                ...prev,
                [fav.value]: {
                    asset: fav,
                    price: data.price,
                    rsi14: data.rsi14,
                    signal: newSig,
                    signalStrength: data.signalStrength,
                    trend: data.trend,
                    loading: false,
                    error: false,
                    flashing: changed,
                    lastUpdate: new Date(),
                },
            }));

            // remove flash após 2.5s
            if (changed) {
                setTimeout(() => {
                    setRadarData(prev => ({
                        ...prev,
                        [fav.value]: { ...prev[fav.value], flashing: false },
                    }));
                }, 2500);
            }
        } catch {
            setRadarData(prev => ({
                ...prev,
                [fav.value]: { ...(prev[fav.value] ?? { asset: fav, price: '—', rsi14: '—', signal: '—', signalStrength: '—', trend: '—', flashing: false, lastUpdate: null }), loading: false, error: true },
            }));
        }
    };

    // Fetch de todos os favoritos
    const fetchAll = (favs: FavoriteAsset[]) => {
        // marca todos como loading primeiro
        setRadarData(prev => {
            const updated = { ...prev };
            favs.forEach(f => {
                updated[f.value] = { ...(updated[f.value] ?? { asset: f, price: '—', rsi14: '—', signal: '—', signalStrength: '—', trend: '—', flashing: false, lastUpdate: null }), loading: true, error: false };
            });
            return updated;
        });
        favs.forEach(fetchOne);
    };

    // Polling inicial e a cada 60s
    useEffect(() => {
        if (favorites.length === 0) return;
        fetchAll(favorites);
        setCountdown(60);

        const tick = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    fetchAll(favorites);
                    return 60;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favorites]);

    const rowBg = (positive: boolean, badge: string) => {
        if (badge === 'Stop') return 'rgba(255,61,0,0.06)';
        return positive ? 'rgba(0,230,118,0.04)' : 'transparent';
    };

    // Ordenação: FORTE vai ao topo
    const radarItems = Object.values(radarData).sort((a, b) => {
        const aStrong = isStrong(a.signal, a.signalStrength) ? 0 : 1;
        const bStrong = isStrong(b.signal, b.signalStrength) ? 0 : 1;
        return aStrong - bStrong;
    });

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 80px', fontFamily: 'inherit' }}>

            {/* ══════════════════════════════════════════════
                MEU RADAR (FAVORITOS)
            ══════════════════════════════════════════════ */}
            <div style={{ marginBottom: '24px' }}>
                {/* Header do Radar */}
                <div style={{
                    background: '#0d1117', border: '1px solid rgba(255,204,0,0.15)',
                    borderBottom: favorites.length === 0 ? '1px solid rgba(255,204,0,0.15)' : 'none',
                    borderRadius: favorites.length === 0 ? '16px' : '16px 16px 0 0',
                    padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Star style={{ width: '16px', height: '16px', color: '#ffcc00', fill: '#ffcc00' }} />
                        <div>
                            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#ffcc00', margin: 0 }}>Meu Radar (Favoritos)</h2>
                            <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>Atualiza automaticamente a cada 60s</p>
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

                {/* Sem favoritos */}
                {favorites.length === 0 && (
                    <div style={{ background: '#0d1117', border: '1px solid rgba(255,204,0,0.08)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '28px 20px', textAlign: 'center' }}>
                        <Star style={{ width: '28px', height: '28px', color: '#334155', margin: '0 auto 10px' }} />
                        <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>Nenhum favorito ainda.</p>
                        <p style={{ color: '#334155', fontSize: '12px', margin: '4px 0 0' }}>
                            Faça uma análise e clique em <strong style={{ color: '#ffcc00' }}>⭐ Favoritar</strong> para adicionar ao radar.
                        </p>
                    </div>
                )}

                {/* Cards do Radar */}
                {radarItems.length > 0 && (
                    <div style={{ background: '#0a0d12', border: '1px solid rgba(255,204,0,0.1)', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
                        {/* Injetar keyframes de flash via style tag */}
                        <style>{`
                            @keyframes radarFlash {
                                0%,100% { box-shadow: none; }
                                25%,75% { box-shadow: 0 0 0 2px #ffcc00, 0 0 18px rgba(255,204,0,0.4); }
                            }
                            .radar-flash { animation: radarFlash 0.6s ease 4; }
                        `}</style>

                        {radarItems.map((item, i) => {
                            const strong = isStrong(item.signal, item.signalStrength);
                            const glowColor = item.signal === 'COMPRA' ? '0 0 20px rgba(0,230,118,0.3)' : item.signal === 'VENDA' ? '0 0 20px rgba(239,68,68,0.3)' : 'none';
                            return (
                                <div
                                    key={item.asset.value}
                                    className={item.flashing ? 'radar-flash' : ''}
                                    style={{
                                        display: 'grid', gridTemplateColumns: '1fr auto',
                                        alignItems: 'center', padding: '14px 20px',
                                        background: strong ? sigBg(item.signal) : 'transparent',
                                        borderBottom: i < radarItems.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                        transition: 'background 0.3s',
                                        boxShadow: strong ? glowColor : 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        {/* Ícone de tendência */}
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${sigColor(item.signal)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {item.signal === 'VENDA'
                                                ? <TrendingDown style={{ width: '18px', height: '18px', color: sigColor(item.signal) }} />
                                                : <TrendingUp style={{ width: '18px', height: '18px', color: sigColor(item.signal) }} />
                                            }
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>{item.asset.label}</span>
                                                {/* Badge do sinal */}
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                                                    background: `${sigColor(item.signal)}20`, color: sigColor(item.signal),
                                                    border: `1px solid ${sigColor(item.signal)}40`,
                                                }}>
                                                    {item.loading ? '...' : `${item.signal}${item.signalStrength === 'FORTE' ? ' FORTE' : ''}`}
                                                </span>
                                                {strong && (
                                                    <span style={{ fontSize: '10px', color: '#ffcc00', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <AlertTriangle style={{ width: '11px', height: '11px' }} /> Oportunidade
                                                    </span>
                                                )}
                                                {item.error && (
                                                    <span style={{ fontSize: '10px', color: '#ef4444' }}>Erro ao carregar</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                    Preço: <strong style={{ color: '#fff' }}>{item.loading ? '...' : item.price}</strong>
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                    RSI: <strong style={{
                                                        color: item.loading ? '#64748b' : parseFloat(item.rsi14) < 35 ? '#00e676' : parseFloat(item.rsi14) > 65 ? '#ef4444' : '#fff'
                                                    }}>{item.loading ? '...' : item.rsi14}</strong>
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                    Tend: <strong style={{ color: item.trend === 'ALTA' ? '#00e676' : item.trend === 'BAIXA' ? '#ef4444' : '#64748b' }}>{item.loading ? '...' : item.trend}</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Horário da última atualização */}
                                    <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155' }}>
                                        {item.lastUpdate
                                            ? item.lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                            : '—'
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Header ── */}
            <div style={{ background: '#0d1117', border: '1px solid rgba(0,229,255,0.08)', borderBottom: 'none', borderRadius: '16px 16px 0 0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <Zap style={{ width: '16px', height: '16px' }} />
                        Sinais IA em Tempo Real
                    </h2>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0' }}>Sinais de trading gerados por IA com alta confiança</p>
                </div>
                {/* Toggle Ativo/Inativo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: active ? '#00e5ff' : '#475569', fontWeight: 700 }}>
                        {active ? 'Ativo' : 'Inativo'}
                    </span>
                    <div
                        onClick={() => setActive(!active)}
                        style={{
                            width: '44px', height: '24px', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                            background: active ? '#00e5ff' : '#1e293b',
                        }}
                    >
                        <div style={{
                            position: 'absolute', top: '3px', left: active ? '23px' : '3px', width: '18px', height: '18px',
                            borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                        }} />
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
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px',
                        background: 'rgba(0,230,118,0.04)', padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(2px)', position: 'relative',
                    }}>
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

                {RECENT_SIGNALS.map((sig, i) => (
                    <div key={sig.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr auto',
                        alignItems: 'center', padding: '12px 24px',
                        background: rowBg(sig.positive, sig.badge),
                        borderBottom: i < RECENT_SIGNALS.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                        cursor: 'pointer', transition: 'background 0.15s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = rowBg(sig.positive, sig.badge))}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                {sig.direction === 'buy'
                                    ? <TrendingUp style={{ width: '14px', height: '14px', color: '#00e676' }} />
                                    : <TrendingDown style={{ width: '14px', height: '14px', color: '#ff3d00' }} />
                                }
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{sig.asset}</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: `${sig.badgeColor}20`, color: sig.badgeColor }}>
                                    {sig.badge} {sig.badge === 'Take' ? '✓' : '✗'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>$</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: sig.positive ? '#00e676' : '#ff3d00' }}>
                                    {sig.result}
                                </span>
                                <span style={{ fontSize: '11px', color: '#475569' }}>({sig.pct})</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 4px' }}>{sig.time}</p>
                            <p style={{ fontSize: '11px', color: '#475569', margin: 0, fontFamily: 'monospace' }}>{sig.stats}</p>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
