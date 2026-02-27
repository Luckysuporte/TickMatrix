'use client';

import React, { useState } from 'react';
import { Zap, Crown, Lock, TrendingUp, TrendingDown } from 'lucide-react';

// ─── Mock data ────────────────────────────────────────────────────────────────
const RECENT_SIGNALS = [
    { id: 1, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$21.10', pct: '+1.10%', time: '9h atrás', stats: '0.0T  +$21.1  1.0x  +$211.00', positive: true },
    { id: 2, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$44.20', pct: '+0.91%', time: '5h atrás', stats: '0.0T  +$44.7  1.0x  +$442.00', positive: true },
    { id: 3, asset: 'BTCUSD', direction: 'sell', badge: 'Stop', badgeColor: '#ff3d00', result: '-$39.52', pct: '-0.70%', time: '18h atrás', stats: '0.0T  -$3.93  1.0x  -$395.20', positive: false },
    { id: 4, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$54.80', pct: '+0.19%', time: '13h atrás', stats: '0.0T  +$5.48  1.0x  +$548.00', positive: true },
    { id: 5, asset: 'GBPUSD', direction: 'buy', badge: 'Take', badgeColor: '#00e676', result: '+$28.80', pct: '+0.18%', time: '7h atrás', stats: '0.0T  +$7.88  1.0x  +$288.00', positive: true },
    { id: 6, asset: 'AUDUSD', direction: 'sell', badge: 'Stop', badgeColor: '#ff3d00', result: '-$33.30', pct: '-0.70%', time: '19h atrás', stats: '0.0T  -$3.25  1.0x  -$333.00', positive: false },
];

export default function SinaisIA() {
    const [active, setActive] = useState(false);

    const rowBg = (positive: boolean, badge: string) => {
        if (badge === 'Stop') return 'rgba(255,61,0,0.06)';
        return positive ? 'rgba(0,230,118,0.04)' : 'transparent';
    };

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0 80px', fontFamily: 'inherit' }}>

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

                {/* Locked signal cards */}
                {[0].map(i => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px',
                        background: 'rgba(0,230,118,0.04)', padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(2px)', position: 'relative',
                    }}>
                        {/* Blurred background content */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,17,23,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #00e676', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
                                <Crown style={{ width: '14px', height: '14px', color: '#00e676' }} />
                            </div>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#00e676', margin: 0 }}>Oportunidade de Lucro</p>
                            <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>Ative uma assinatura para desbloquear</p>
                        </div>
                        {/* Blurred bg rows */}
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
                            {/* Row 1: asset + badge + price */}
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
                            {/* Row 2: result & pct */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>$</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: sig.positive ? '#00e676' : '#ff3d00' }}>
                                    {sig.result}
                                </span>
                                <span style={{ fontSize: '11px', color: '#475569' }}>({sig.pct})</span>
                            </div>
                        </div>

                        {/* Right side: time + stats */}
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
