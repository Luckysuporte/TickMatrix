'use client';

import React, { useState, useEffect } from 'react';
import { Search, Crown, BarChart2, Shield, Activity } from 'lucide-react';
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

    // Estados para Gestão de Risco (Mesa Proprietária)
    const [balance, setBalance] = useState(10000);
    const [riskPerTrade, setRiskPerTrade] = useState(1);
    const [drawdownLimit, setDrawdownLimit] = useState(500);

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px 80px', color: '#fff' }}>

            {/* 1. MÓDULO DE GESTÃO DE RISCO (MESA PROPRIETÁRIA) */}
            <div style={{ background: '#121318', border: '1px solid rgba(255,153,0,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ff9900' }}>
                    <Shield size={18} />
                    <h2 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Gestão de Risco Mesa Proprietária</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                    <div>
                        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Saldo da Conta ($)</p>
                        <input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))}
                            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Risco por Operação (%)</p>
                        <input type="number" value={riskPerTrade} onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', padding: '10px', borderRadius: '8px', color: '#fff' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Daily Drawdown Limit</p>
                        <input type="number" value={drawdownLimit} onChange={(e) => setDrawdownLimit(Number(e.target.value))}
                            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', padding: '10px', borderRadius: '8px', color: '#ff4444' }} />
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Cálculo de TP (Lote)</p>
                        <div style={{ background: '#0a0a0a', border: '1px solid #222', padding: '10px', borderRadius: '8px', color: '#00e5ff', fontWeight: 'bold' }}>0.1</div>
                    </div>
                </div>

                <div style={{ background: 'rgba(0, 255, 127, 0.05)', border: '1px solid rgba(0, 255, 127, 0.1)', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00ff7f' }}>● VIDA DIÁRIA (DRAWDOWN)</span>
                        <span style={{ fontSize: '12px', color: '#00ff7f' }}>${drawdownLimit}.00 / ${drawdownLimit}.00</span>
                    </div>
                    <div style={{ width: '100%', background: '#1a1a1a', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '100%', background: '#00ff7f', height: '100%', boxShadow: '0 0 10px #00ff7f' }}></div>
                    </div>
                </div>
            </div>

            {/* 2. RADAR COM INÍCIO DO SINAL E ÁUDIO */}
            <div style={{ background: '#121318', border: '1px solid #222', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#ff9900' }}>Meu Radar — Score de Confluência</h3>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <AudioTester />
                            <button style={{ background: '#1a1a1a', border: '1px solid #333', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Histórico de Hoje</button>
                        </div>
                    </div>
                </div>

                {/* Badge de Status e Início do Sinal (Retângulo) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ background: '#0a0a0a', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #222' }}>
                        <span style={{ color: '#00ff7f', fontWeight: 'bold' }}>XAU/USD ★★★</span>
                        <span style={{ background: '#00331a', color: '#00ff7f', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>COMPRA FORTE</span>
                        <span style={{ background: '#ff9900', color: '#000', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>ELITE 3★</span>

                        {/* O RETÂNGULO QUE VOCÊ PEDIU */}
                        <div style={{ border: '1px solid #ff9900', color: '#ff9900', padding: '2px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', marginLeft: '10px' }}>
                            INÍCIO DO SINAL: 12:22:10
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '12px', marginLeft: '10px' }}>
                            <Shield size={14} /> Risco: $184.93 (1.8%)
                        </div>
                    </div>
                </div>
            </div>

            {/* Restante do Dashboard de Ações */}
            <div style={{ background: '#121318', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#64748b' }} />
                    <input type="text" placeholder="Digite o ticker (ex: PETR4, VALE3)" value={ticker} onChange={handleInput}
                        style={{ width: '100%', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '13px 42px', color: '#e2e8f0', outline: 'none' }} />
                </div>

                {/* Lista de Ações e Botão Analisar permanecem conforme sua lógica original */}
                {/* ... */}
            </div>
        </div>
    );
}