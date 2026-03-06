'use client';

import React, { useState } from 'react';
import { Search, Crown, BarChart2 } from 'lucide-react';
import AudioTester from '@/components/AudioTester';

// ─── Quick-pick stocks ────────────────────────────────────────────────────────
const BR_STOCKS = [
    { ticker: 'PETR4', name: 'Petrobras' },
    { ticker: 'VALE3', name: 'Vale' },
    { ticker: 'ITUB4', name: 'Itaú' },
    { ticker: 'BBDC4', name: 'Bradesco' },
    { ticker: 'WEGE3', name: 'WEG' },
    { ticker: 'ABEV3', name: 'Ambev' },
    { ticker: 'BBAS3', name: 'Banco do Brasil' },
    { ticker: 'MGLU3', name: 'Magazine Luiza' },
    { ticker: 'RENT3', name: 'Localiza' },
    { ticker: 'B3SA3', name: 'B3' },
];

export default function TickMatrixAcoes() {
    const [tab, setTab] = useState<'brasil' | 'eua' | 'crypto'>('brasil');
    const [ticker, setTicker] = useState('');
    const [selected, setSelected] = useState('');

    const handleQuickPick = (t: string) => {
        setSelected(t);
        setTicker(t);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.toUpperCase();
        setTicker(v);
        setSelected(v);
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 80px' }}>

            {/* Botão de Som para liberação de áudio do Sniper */}
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <AudioTester />
            </div>

            {/* PRO Banner */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'linear-gradient(90deg, #0a1a2e 0%, #0d2240 100%)',
                border: '1px solid rgba(0,229,255,0.15)',
                borderRadius: '16px',
                padding: '16px 24px',
                marginBottom: '20px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,153,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Crown style={{ width: '22px', height: '22px', color: '#ff9900' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: 0 }}>Ative seu plano PRO</p>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>A partir de R$ 4,50/dia</p>
                    </div>
                </div>
                <button style={{
                    background: '#00e5ff', color: '#000', fontWeight: 800, fontSize: '13px',
                    padding: '9px 22px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                }}>
                    Ver planos
                </button>
            </div>

            {/* Main Card */}
            <div style={{
                background: '#121318',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '28px',
                marginBottom: '16px',
            }}>

                {/* Search bar */}
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Digite o ticker (ex: PETR4, VALE3, WEGE3)"
                        value={ticker}
                        onChange={handleInput}
                        style={{
                            width: '100%',
                            background: '#1c1c24',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: '13px 14px 13px 42px',
                            color: '#e2e8f0',
                            fontSize: '14px',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                        onClick={() => setTab('brasil')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                            background: tab === 'brasil' ? '#00e5ff' : 'rgba(255,255,255,0.05)',
                            color: tab === 'brasil' ? '#000' : '#94a3b8',
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>🇧🇷</span> Brasil
                    </button>

                    <button
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 16px', borderRadius: '10px', border: 'none', cursor: 'not-allowed', fontWeight: 700, fontSize: '13px',
                            background: 'rgba(255,255,255,0.04)', color: '#475569', opacity: 0.7,
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>🇺🇸</span> EUA
                        <span style={{ background: '#ff9900', color: '#000', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.05em' }}>EM BREVE</span>
                    </button>

                    <button
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 16px', borderRadius: '10px', border: 'none', cursor: 'not-allowed', fontWeight: 700, fontSize: '13px',
                            background: 'rgba(255,255,255,0.04)', color: '#475569', opacity: 0.7,
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>₿</span> Crypto
                        <span style={{ background: '#ff9900', color: '#000', fontSize: '9px', fontWeight: 900, padding: '2px 6px', borderRadius: '6px', letterSpacing: '0.05em' }}>EM BREVE</span>
                    </button>
                </div>

                {/* Quick-pick stocks */}
                {tab === 'brasil' && (
                    <div>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', fontWeight: 600 }}>
                            Selecione uma ação brasileira:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {BR_STOCKS.map(s => (
                                <button
                                    key={s.ticker}
                                    onClick={() => handleQuickPick(s.ticker)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '7px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, transition: 'all 0.15s',
                                        background: selected === s.ticker ? 'rgba(0,229,255,0.15)' : '#1c1c24',
                                        color: selected === s.ticker ? '#00e5ff' : '#94a3b8',
                                        outline: selected === s.ticker ? '1px solid rgba(0,229,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                    }}
                                >
                                    {s.ticker}
                                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>• {s.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: '28px', paddingTop: '20px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                        {selected
                            ? <span>Ativo selecionado: <strong style={{ color: '#00e5ff' }}>{selected}</strong></span>
                            : 'Selecione uma ação da lista ou digite um ticker acima'
                        }
                    </p>

                    <button
                        disabled={!selected}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '11px 24px', borderRadius: '12px', border: 'none', fontWeight: 800, fontSize: '14px', cursor: selected ? 'pointer' : 'not-allowed',
                            background: selected ? '#00e5ff' : 'rgba(255,255,255,0.06)',
                            color: selected ? '#000' : '#475569',
                            opacity: selected ? 1 : 0.6,
                            transition: 'all 0.2s',
                        }}
                    >
                        <Crown style={{ width: '16px', height: '16px' }} />
                        Analisar (1 PRO)
                    </button>
                </div>
            </div>

            {/* Empty state / Result area */}
            <div style={{
                background: '#121318',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '20px',
                padding: '64px 40px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                minHeight: '220px',
            }}>
                <BarChart2 style={{ width: '48px', height: '48px', color: '#1e3a4a', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Análise Institucional de Ações</h3>
                <p style={{ fontSize: '14px', color: '#00e5ff', lineHeight: 1.7, maxWidth: '420px', margin: 0 }}>
                    Digite o ticker de uma ação brasileira para receber uma análise completa baseada em 5 camadas: Macro, Fundamentos, Valuation, Técnica e Fluxo.
                </p>
            </div>

        </div>
    );
}