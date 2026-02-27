'use client';

import React, { useState } from 'react';
import { Crown, Zap, Sparkles, Check, CreditCard } from 'lucide-react';

const PLANS = {
    mensal: {
        basico: { original: 'R$ 167', price: 'R$ 137', sub: 'ou 12x R$ 137,00', credits: '10 créditos PRO/mês', economy: null },
        intermediario: { original: 'R$ 237', price: 'R$ 197', sub: 'ou 12x R$ 197,00', credits: '60 créditos PRO/mês', economy: null },
        pro: { original: 'R$ 649', price: 'R$ 549', sub: 'ou 12x R$ 549,00', credits: '250 créditos PRO/mês', economy: null },
    },
    anual: {
        basico: { original: 'R$ 137', price: 'R$ 113', sub: 'ou 12x R$ 113,46', credits: '120 créditos PRO/ano', economy: 'Economia de R$282 🎁 4 meses grátis!' },
        intermediario: { original: 'R$ 197', price: 'R$ 131', sub: 'ou 12x R$ 131,41', credits: '720 créditos PRO/ano', economy: 'Economia de R$787 🎁 4 meses grátis!' },
        pro: { original: 'R$ 549', price: 'R$ 366', sub: 'ou 12x R$ 366,41', credits: '3000 créditos PRO/ano', economy: 'Economia de R$2.191 🎁 4 meses grátis!' },
    },
};

const BASICO_FEATURES = [
    '120 créditos PRO/ano (10/mês)',
    'Análises completas',
    'Todos os mercados',
    'Smart Money Concepts',
    'Entry, Stop & Take Profit',
    'Suporte por email',
];

const INTER_FEATURES = [
    '720 créditos PRO/ano (60/mês)',
    'Análises COMPLETAS com IA',
    'Smart Money institucional',
    'Padrões Harmônicos',
    'Análise Wyckoff',
    'Análise Visual IA',
    'Suporte prioritário',
];

const PRO_FEATURES = [
    '3000 créditos PRO/ano (250/mês)',
    'TUDO do Intermediário',
    'Análise Probabilística',
    'Fear & Greed Index',
    'Relatório Executivo',
    'Motor IA V5.0',
    'Acesso antecipado a atualizações futuras',
    'Suporte VIP 24/7',
];

export default function Planos() {
    const [billing, setBilling] = useState<'mensal' | 'anual'>('anual');
    const plans = PLANS[billing];

    const cardBase: React.CSSProperties = {
        background: '#121318',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
        flex: 1,
    };

    const featureItem = (text: string, key: number) => (
        <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#94a3b8', listStyle: 'none', marginBottom: '10px' }}>
            <Check style={{ width: '14px', height: '14px', color: '#00e676', marginTop: '2px', flexShrink: 0 }} />
            {text}
        </li>
    );

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 16px 80px' }}>

            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <h1 style={{ fontSize: '36px', fontWeight: 900, color: '#fff', marginBottom: '12px' }}>
                    Escolha seu <span style={{ color: '#00e5ff' }}>Plano</span>
                </h1>
                <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
                    Assine um plano para receber créditos PRO automaticamente.
                </p>
            </div>

            {/* Billing Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#1c1c24', borderRadius: '50px', padding: '4px', gap: '2px' }}>
                    <button
                        onClick={() => setBilling('mensal')}
                        style={{
                            padding: '8px 22px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                            background: billing === 'mensal' ? '#fff' : 'transparent',
                            color: billing === 'mensal' ? '#000' : '#64748b',
                        }}
                    >
                        Mensal
                    </button>
                    <button
                        onClick={() => setBilling('anual')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 22px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                            background: billing === 'anual' ? 'linear-gradient(90deg, #00c6ff, #7c3aed)' : 'transparent',
                            color: billing === 'anual' ? '#fff' : '#64748b',
                        }}
                    >
                        Anual
                        {billing === 'anual' && (
                            <span style={{ background: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 900, padding: '2px 8px', borderRadius: '20px' }}>-33%</span>
                        )}
                        {billing === 'mensal' && (
                            <span style={{ background: 'rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: '11px', fontWeight: 900, padding: '2px 8px', borderRadius: '20px' }}>-33%</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Plans grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.08fr 1fr', gap: '20px', alignItems: 'start' }}>

                {/* ── Básico ── */}
                <div style={{ ...cardBase }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Sparkles style={{ width: '20px', height: '20px', color: '#00e5ff' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Básico</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, textTransform: 'capitalize' }}>{billing === 'anual' ? 'Anual' : 'Mensal'}</p>
                        </div>
                    </div>

                    <p style={{ fontSize: '13px', color: '#475569', textDecoration: 'line-through', margin: '0 0 4px' }}>{plans.basico.original}</p>
                    <p style={{ margin: '0 0 4px' }}>
                        <span style={{ fontSize: '36px', fontWeight: 900, color: '#fff' }}>{plans.basico.price}</span>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>/mês</span>
                    </p>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px' }}>{plans.basico.sub}</p>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>{plans.basico.credits}</p>

                    {plans.basico.economy && (
                        <div style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#00e676', marginBottom: '20px' }}>
                            {plans.basico.economy}
                        </div>
                    )}
                    {!plans.basico.economy && <div style={{ height: '16px', marginBottom: '20px' }} />}

                    <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: 800, color: '#00e5ff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap style={{ width: '13px', height: '13px' }} /> SINAIS EM TEMPO REAL
                    </div>

                    <ul style={{ padding: 0, margin: '0 0 28px', flex: 1 }}>
                        {BASICO_FEATURES.map((f, i) => featureItem(f, i))}
                    </ul>

                    <button style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Assinar Básico
                    </button>
                </div>

                {/* ── Intermediário (MAIS POPULAR) ── */}
                <div style={{
                    ...cardBase,
                    background: 'linear-gradient(160deg, #0a1a2e 0%, #0d1f3c 100%)',
                    border: '2px solid #00e5ff',
                    boxShadow: '0 0 40px rgba(0,229,255,0.1)',
                    paddingTop: '20px',
                }}>
                    {/* Badge */}
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <span style={{ background: 'linear-gradient(90deg, #ffea00, #ff9900)', color: '#000', fontSize: '11px', fontWeight: 900, padding: '5px 16px', borderRadius: '20px', letterSpacing: '0.05em' }}>
                            ⭐ MAIS POPULAR ⭐
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap style={{ width: '20px', height: '20px', color: '#00e5ff' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Intermediário</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, textTransform: 'capitalize' }}>{billing === 'anual' ? 'Anual' : 'Mensal'}</p>
                        </div>
                    </div>

                    <p style={{ fontSize: '13px', color: '#475569', textDecoration: 'line-through', margin: '0 0 4px' }}>{plans.intermediario.original}</p>
                    <p style={{ margin: '0 0 4px' }}>
                        <span style={{ fontSize: '36px', fontWeight: 900, color: '#fff' }}>{plans.intermediario.price}</span>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>/mês</span>
                    </p>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px' }}>{plans.intermediario.sub}</p>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>{plans.intermediario.credits}</p>

                    {plans.intermediario.economy && (
                        <div style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#00e676', marginBottom: '20px' }}>
                            {plans.intermediario.economy}
                        </div>
                    )}
                    {!plans.intermediario.economy && <div style={{ height: '16px', marginBottom: '20px' }} />}

                    <div style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: 800, color: '#00e5ff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap style={{ width: '13px', height: '13px' }} /> SINAIS EM TEMPO REAL
                    </div>

                    <ul style={{ padding: 0, margin: '0 0 28px', flex: 1 }}>
                        {INTER_FEATURES.map((f, i) => featureItem(f, i))}
                    </ul>

                    <button style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#00e5ff', color: '#000', fontWeight: 900, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#7dd9e6'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#00e5ff'; }}
                    >
                        Assinar Intermediário
                    </button>
                </div>

                {/* ── Pro ── */}
                <div style={{ ...cardBase }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,153,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Crown style={{ width: '20px', height: '20px', color: '#ff9900' }} />
                        </div>
                        <div>
                            <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Pro</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, textTransform: 'capitalize' }}>{billing === 'anual' ? 'Anual' : 'Mensal'}</p>
                        </div>
                    </div>

                    <p style={{ fontSize: '13px', color: '#475569', textDecoration: 'line-through', margin: '0 0 4px' }}>{plans.pro.original}</p>
                    <p style={{ margin: '0 0 4px' }}>
                        <span style={{ fontSize: '36px', fontWeight: 900, color: '#fff' }}>{plans.pro.price}</span>
                        <span style={{ fontSize: '14px', color: '#64748b' }}>/mês</span>
                    </p>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px' }}>{plans.pro.sub}</p>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>{plans.pro.credits}</p>

                    {plans.pro.economy && (
                        <div style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#00e676', marginBottom: '20px' }}>
                            {plans.pro.economy}
                        </div>
                    )}
                    {!plans.pro.economy && <div style={{ height: '16px', marginBottom: '20px' }} />}

                    <div style={{ background: 'rgba(255,153,0,0.08)', border: '1px solid rgba(255,153,0,0.2)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', fontWeight: 800, color: '#ff9900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Crown style={{ width: '13px', height: '13px' }} /> SINAIS EM TEMPO REAL
                    </div>

                    <ul style={{ padding: 0, margin: '0 0 28px', flex: 1 }}>
                        {PRO_FEATURES.map((f, i) => featureItem(f, i))}
                    </ul>

                    <button style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        Assinar Pro
                    </button>
                </div>

            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CreditCard style={{ width: '15px', height: '15px' }} />
                Pagamento seguro processado pela <strong style={{ color: '#94a3b8' }}>HUBLA</strong> • Cancele quando quiser
            </div>

        </div>
    );
}
