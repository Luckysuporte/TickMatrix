"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getHeatmapForAsset } from "@/lib/heatmapLogic";
import type { HourData } from "@/lib/heatmapLogic";
import {
    ArrowLeft,
    Crown,
    Clock,
    Sparkles,
    ChevronDown,
    TrendingUp,
    AlertTriangle,
    Lightbulb
} from "lucide-react";

const ASSET_CATEGORIES = [
    {
        name: 'FOREX',
        assets: [
            { id: 'EURUSD', label: 'Euro / Dólar (EUR/USD)' },
            { id: 'GBPUSD', label: 'Libra / Dólar (GBP/USD)' },
            { id: 'USDJPY', label: 'Dólar / Iene (USD/JPY)' },
            { id: 'USDCHF', label: 'Dólar / Franco Suíço (USD/CHF)' },
            { id: 'AUDUSD', label: 'Dólar Australiano / Dólar (AUD/USD)' },
            { id: 'USDCAD', label: 'Dólar / Dólar Canadense (USD/CAD)' },
            { id: 'NZDUSD', label: 'Dólar Neozelandês / Dólar (NZD/USD)' },
            { id: 'EURGBP', label: 'Euro / Libra (EUR/GBP)' },
            { id: 'EURJPY', label: 'Euro / Iene (EUR/JPY)' },
            { id: 'GBPJPY', label: 'Libra / Iene (GBP/JPY)' },
        ]
    },
    {
        name: 'CRIPTOMOEDAS',
        assets: [
            { id: 'BTC', label: 'Bitcoin (BTC)' },
            { id: 'ETH', label: 'Ethereum (ETH)' },
            { id: 'SOL', label: 'Solana (SOL)' },
            { id: 'BNB', label: 'Binance Coin (BNB)' },
            { id: 'XRP', label: 'Ripple (XRP)' },
            { id: 'ADA', label: 'Cardano (ADA)' },
            { id: 'DOGE', label: 'Dogecoin (DOGE)' },
            { id: 'DOT', label: 'Polkadot (DOT)' },
            { id: 'AVAX', label: 'Avalanche (AVAX)' },
            { id: 'MATIC', label: 'Polygon (MATIC)' },
        ]
    },
    {
        name: 'AÇÕES',
        assets: [
            { id: 'AAPL', label: 'Apple (AAPL)' },
            { id: 'MSFT', label: 'Microsoft (MSFT)' },
            { id: 'GOOGL', label: 'Google (GOOGL)' },
            { id: 'AMZN', label: 'Amazon (AMZN)' },
            { id: 'TSLA', label: 'Tesla (TSLA)' },
            { id: 'NVDA', label: 'NVIDIA (NVDA)' },
        ]
    },
    {
        name: 'ÍNDICES',
        assets: [
            { id: 'SPX', label: 'S&P 500 (SPX)' },
            { id: 'IBOV', label: 'Ibovespa (IBOV)' },
            { id: 'NDX', label: 'NASDAQ 100 (NDX)' },
            { id: 'DJI', label: 'Dow Jones (DJI)' },
            { id: 'DAX', label: 'DAX (Alemanha) (DAX)' },
        ]
    },
    {
        name: 'COMMODITIES',
        assets: [
            { id: 'XAU', label: 'Ouro (XAU)' },
            { id: 'XAG', label: 'Prata (XAG)' },
            { id: 'WTI', label: 'Petróleo WTI (WTI)' },
            { id: 'BRENT', label: 'Petróleo Brent (BRENT)' },
            { id: 'NG', label: 'Gás Natural (NG)' },
            { id: 'SOJA', label: 'Soja (SOJA)' },
            { id: 'MILHO', label: 'Milho (MILHO)' },
            { id: 'CAFE', label: 'Café (CAFE)' },
        ]
    }
];

const getAssetLabel = (id: string) => {
    for (const category of ASSET_CATEGORIES) {
        const asset = category.assets.find(a => a.id === id);
        if (asset) return asset.label;
    }
    return id;
};



const LIQUIDITY_COLORS = {
    excelente: 'bg-[#00e676]',
    alta: 'bg-[#69f0ae]',
    media: 'bg-[#ffb300]',
    baixa: 'bg-[#c62828]/80',
    fechado: 'bg-[#2a2a35]',
};


export default function HeatmapPage() {
    const [selectedAsset, setSelectedAsset] = useState('EURUSD');
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [tooltip, setTooltip] = useState<{ hour: number; text: string } | null>(null);

    useEffect(() => {
        setCurrentTime(new Date());
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const currentHour = currentTime ? currentTime.getHours() : -1;
    const formattedTime = currentTime
        ? currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '--:--';

    const assetData = getHeatmapForAsset(selectedAsset);
    const row1 = assetData.heatmap.slice(0, 12);
    const row2 = assetData.heatmap.slice(12, 24);

    const HeatmapRow = ({ items }: { items: HourData[] }) => (
        <div className="grid grid-cols-12 gap-2">
            {items.map((data) => {
                const isNow = data.hour === currentHour;
                return (
                    <div key={data.hour} className="flex flex-col items-center gap-1 relative"
                        onMouseEnter={() => setTooltip({ hour: data.hour, text: data.reason })}
                        onMouseLeave={() => setTooltip(null)}
                    >
                        <div
                            className={[
                                'w-full aspect-square rounded-lg transition-all duration-200 cursor-pointer',
                                LIQUIDITY_COLORS[data.level],
                                isNow
                                    ? 'ring-2 ring-[#00e5ff] ring-offset-[2px] ring-offset-[#121212] shadow-[0_0_14px_rgba(0,229,255,0.6)] scale-110 z-10'
                                    : 'opacity-80 hover:opacity-100 hover:scale-105'
                            ].join(' ')}
                        />
                        <span className={`text-[9px] sm:text-[10px] font-bold leading-none ${isNow ? 'text-[#00e5ff]' : 'text-slate-500'}`}>
                            {data.hour.toString().padStart(2, '0')}h
                        </span>
                        {/* Tooltip */}
                        {tooltip?.hour === data.hour && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-48 bg-[#1c1c24] border border-white/10 rounded-xl p-3 shadow-2xl pointer-events-none">
                                <p className="text-[10px] font-bold text-white mb-1">{data.hour.toString().padStart(2, '0')}h — {data.level.charAt(0).toUpperCase() + data.level.slice(1)}</p>
                                <p className="text-[10px] text-slate-400 leading-relaxed">{data.reason}</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0f16] p-4 md:p-8 font-sans pb-20">



            {/* Main content stack */}
            <div className="max-w-7xl mx-auto flex flex-col gap-6">

                {/* 1. PRO Banner */}
                <div className="bg-gradient-to-r from-[#111827] to-[#1e1b4b]/40 border border-[#00e5ff]/10 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/20 flex items-center justify-center">
                            <Crown className="w-5 h-5 text-[#00e5ff]" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Ative seu plano PRO</p>
                            <p className="text-slate-400 text-xs">A partir de R$ 4,50/dia</p>
                        </div>
                    </div>
                    <button className="bg-[#00e5ff] text-black font-bold px-6 py-2 rounded-md hover:bg-[#00b8cc] transition-colors text-sm w-full sm:w-auto">
                        Ver planos
                    </button>
                </div>

                {/* 2. Title */}
                <div>
                    <h1 className="text-white text-3xl font-extrabold tracking-tight mb-1">
                        Heatmap de <span className="text-[#ff9900]">Horários Ideais</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <p className="text-slate-400 text-sm">Horários ajustados para seu fuso horário</p>
                        <span className="bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-[#00e5ff] text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                            Brasil (BRT) <span className="opacity-60 font-normal ml-0.5">(GMT-3)</span>
                        </span>
                    </div>
                </div>

                {/* 3. Time Bar */}
                <div className="bg-[#121212] border border-white/5 rounded-xl px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-[#00e5ff]" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs mb-0.5">Horário atual</p>
                            <p className="text-[#00e5ff] text-3xl font-bold tracking-tight leading-none">{formattedTime}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[#00e676]" />
                        <div className="text-right">
                            <p className="text-slate-400 text-xs mb-0.5">Melhores horários para {getAssetLabel(selectedAsset).split(' ')[0]}</p>
                            <p className="text-[#00e676] font-bold text-sm tracking-wide">
                                {assetData.bestHours.slice(0, 4).map(h => `${h.toString().padStart(2, '0')}h`).join(', ')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 4. Asset Selector */}
                <div className="bg-[#121212] border border-white/5 rounded-xl px-6 py-5">
                    <label className="block text-slate-400 text-xs mb-2">Selecione o Ativo</label>
                    <div className="relative w-full md:w-72">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full bg-[#0a0f16] border border-white/10 text-white px-4 py-3 rounded-lg flex items-center justify-between hover:border-[#00e5ff]/50 transition-colors focus:ring-1 focus:ring-[#00e5ff] outline-none text-sm font-medium"
                        >
                            {getAssetLabel(selectedAsset)}
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-[#121212] border border-white/10 rounded-lg shadow-2xl shadow-black overflow-hidden z-30 max-h-96 overflow-y-auto">
                                <div className="p-2 py-3">
                                    {ASSET_CATEGORIES.map((category) => (
                                        <div key={category.name} className="mb-4 last:mb-0">
                                            <span className="text-slate-500 text-[10px] uppercase font-bold px-3 py-1 block sticky top-0 bg-[#121212]/95 backdrop-blur-sm z-10">{category.name}</span>
                                            {category.assets.map((asset) => (
                                                <button
                                                    key={asset.id}
                                                    onClick={() => { setSelectedAsset(asset.id); setIsDropdownOpen(false); }}
                                                    className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded-md transition-colors hover:bg-white/5 text-slate-300 hover:text-white"
                                                >
                                                    {selectedAsset === asset.id
                                                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                                                        : <div className="w-[14px] shrink-0" />
                                                    }
                                                    <span className={selectedAsset === asset.id ? "text-white font-bold" : ""}>{asset.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Heatmap + Sidebars */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Grid */}
                    <div className="lg:col-span-2 bg-[#121212] border border-white/5 rounded-xl p-6">

                        {/* Header row */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                            <div>
                                <h2 className="text-white text-xl font-bold">{getAssetLabel(selectedAsset).split('(')[0].trim()}</h2>
                                <p className="text-slate-500 text-xs mt-0.5">Horários no seu fuso (Brasil (BRT))</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#00e5ff] inline-block"></span>Agora</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#00e676] inline-block"></span>Excelente</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#69f0ae] inline-block"></span>Alta</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#ffb300] inline-block"></span>Média</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#c62828]/80 inline-block"></span>Baixa</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#2a2a35] inline-block"></span>Fechado</span>
                            </div>
                        </div>

                        {/* Two rows of hourly squares */}
                        <div className="flex flex-col gap-5">
                            <HeatmapRow items={row1} />
                            <HeatmapRow items={row2} />
                        </div>

                        {/* Insight */}
                        <div className="mt-6 bg-[#00e676]/5 border border-[#00e676]/20 rounded-lg p-4 flex gap-3">
                            <Lightbulb className="w-5 h-5 text-[#00e676] shrink-0 mt-0.5" />
                            <p className="text-[#00e676]/90 font-medium text-xs leading-relaxed">{assetData.tip}</p>
                        </div>
                    </div>

                    {/* Right: Sidebars */}
                    <div className="flex flex-col gap-5">

                        {/* Como Interpretar */}
                        <div className="bg-[#121212] border border-white/5 rounded-xl p-6">
                            <h3 className="text-white font-bold text-[15px] mb-5">Como Interpretar</h3>
                            <div className="flex flex-col gap-5">
                                {[
                                    { color: '#00e676', bg: '#00e676', Icon: TrendingUp, title: 'Excelente/Alta', desc: 'Alta liquidez e volatilidade favorável. Melhores momentos para operar.' },
                                    { color: '#ffb300', bg: '#ffb300', Icon: Clock, title: 'Média', desc: 'Liquidez moderada. Opere com cautela e stops mais apertados.' },
                                    { color: '#ff3d00', bg: '#ff3d00', Icon: AlertTriangle, title: 'Baixa', desc: 'Baixa liquidez, spreads altos. Evite operar nesses horários.' },
                                ].map(({ color, bg, Icon, title, desc }) => (
                                    <div key={title} className="flex gap-4">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${bg}18`, border: `1px solid ${bg}33` }}>
                                            <Icon className="w-5 h-5" style={{ color }} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1" style={{ color }}>{title}</h4>
                                            <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sessões de Mercado */}
                        <div className="bg-[#121212] border border-white/5 rounded-xl p-7">
                            <h3 className="text-white font-bold text-[15px] mb-5">Sessões de Mercado (GMT)</h3>
                            <div className="flex flex-col">
                                {[
                                    { flag: 'AU', name: 'Sydney', time: '22h - 07h' },
                                    { flag: 'JP', name: 'Tóquio', time: '00h - 09h' },
                                    { flag: 'GB', name: 'Londres', time: '08h - 17h' },
                                    { flag: 'US', name: 'Nova York', time: '13h - 22h' },
                                    { flag: 'BR', name: 'Brasil (B3)', time: '13h - 22h' },
                                ].map((s, i, arr) => (
                                    <div key={s.flag} className={`flex items-center justify-between py-4 ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>

                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[10px] font-bold bg-white/5 text-slate-400 px-1.5 py-0.5 rounded">{s.flag}</span>
                                            <span className="text-white font-semibold text-sm">{s.name}</span>
                                        </div>
                                        <span className="text-slate-500 text-xs">{s.time}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
