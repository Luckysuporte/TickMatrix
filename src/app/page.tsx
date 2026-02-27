import React from 'react';
import { TrendingUp, Zap, Briefcase, Flame, Copy, Building2, History as HistoryIcon, Activity } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col gap-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Olá, Erik vieira! 👋
          </h1>
          <p className="text-slate-400 text-sm">O que você deseja analisar hoje?</p>
        </div>

        <button className="flex items-center gap-2 bg-[#ffcc00] hover:bg-[#ffb300] text-black px-4 py-2 rounded-xl text-sm font-bold transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5V19L19 12L8 5Z" />
          </svg>
          VORTEX ACADEMY
          <span className="bg-black/10 text-black/80 text-[10px] px-1.5 py-0.5 rounded-md ml-1 -mt-2">0/8</span>
        </button>
      </div>

      {/* Main Action Grid */}
      <div className="flex flex-col gap-4">

        {/* Top Row: 2 Big Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Card 1: Nova Análise */}
          <Link href="/nova-analise" className="vortex-card card-cyan flex flex-col justify-between min-h-[160px] group">
            <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/10 flex items-center justify-center mb-6">
              <TrendingUp className="w-5 h-5 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-[#00e5ff] text-xl font-bold mb-1 group-hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.5)] transition-all">Nova Análise</h2>
              <p className="text-slate-400 text-sm">Analise qualquer ativo com IA avançada</p>
            </div>
            <div className="absolute bottom-4 right-4 text-[#00e5ff]/50 group-hover:text-[#00e5ff] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </div>
          </Link>

          {/* Card 2: Sinais IA */}
          <Link href="/sinais-ia" className="vortex-card card-orange flex flex-col justify-between min-h-[160px] group">
            <div className="w-10 h-10 rounded-xl bg-[#ff9900]/10 flex items-center justify-center mb-6">
              <Zap className="w-5 h-5 text-[#ff9900]" />
            </div>
            <div>
              <h2 className="text-[#ff9900] text-xl font-bold mb-1 flex items-center gap-3">
                Sinais IA
                <span className="v-badge v-badge-green"><TrendingUp className="w-3 h-3" /> 3 sinais lucrativos agora!</span>
              </h2>
              <p className="text-slate-400 text-sm mb-3">Lucre com sinais de alta precisão • Desbloqueie agora</p>
              <div className="v-badge v-badge-green text-[10px] opacity-80 inline-flex">✨ Até 85% de acerto</div>
            </div>
            <div className="absolute bottom-4 right-4 text-[#ff9900]/50 group-hover:text-[#ff9900] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </div>
          </Link>
        </div>

        {/* Card 3: TickMatrix Ações */}
        <Link href="/tickmatrix-acoes" className="vortex-card card-green flex items-center justify-between p-5 group">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-[#00e676]/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-[#00e676]" />
            </div>
            <div>
              <h2 className="text-[#00e676] text-lg font-bold flex items-center gap-2">
                TickMatrix Ações <span className="bg-[#00e676]/10 text-[#00e676] px-1.5 py-0.5 rounded text-[10px] opacity-70">NOVO</span>
              </h2>
              <p className="text-slate-400 text-sm">Análise institucional de ações • 1 crédito PRO por análise</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border border-[#ff9900]/30 bg-[#ff9900]/10 text-[#ff9900] px-3 py-1 rounded-full text-xs font-bold">
            👑 1 PRO <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1"><path d="m9 18 6-6-6-6" /></svg>
          </div>
        </Link>

        {/* Card 4: Heatmap */}
        <Link href="/heatmap" className="vortex-card card-red flex items-center p-5 group">
          <div className="w-10 h-10 rounded-xl bg-[#ff3d00]/10 flex items-center justify-center mr-5">
            <Flame className="w-5 h-5 text-[#ff3d00]" />
          </div>
          <div className="flex-1">
            <h2 className="text-[#ff3d00] text-lg font-bold">Heatmap</h2>
            <p className="text-slate-400 text-sm">Melhores horários para operar</p>
          </div>
          <div className="text-[#ff3d00]/50 group-hover:text-[#ff3d00] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </div>
        </Link>
      </div>

      {/* Tools Row (Small disabled cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Copy Trading', desc: 'Robôs automáticos', icon: Copy },
          { label: 'Corretoras', desc: 'Conecte contas', icon: Building2 },
          { label: 'Histórico', desc: 'Análises anteriores', icon: HistoryIcon },
          { label: 'Trades', desc: 'Histórico de operações', icon: Activity },
        ].map((tool, i) => (
          <div key={i} className="bg-[#121212] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center opacity-70 relative min-h-[110px]">
            <span className="absolute top-2 right-2 bg-white/5 text-slate-400 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1">
              🔒 Em breve
            </span>
            <tool.icon className="w-6 h-6 text-[#ff9900] mb-2 opacity-60" />
            <span className="text-slate-300 font-bold text-sm">{tool.label}</span>
            <span className="text-slate-500 text-[11px]">{tool.desc}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-10">

        {/* Recent Analysis Table */}
        <div className="flex-1 bg-[#121212] border border-white/5 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-[#00e5ff]" />
              Análises Recentes
            </h2>
            <Link href="#" className="text-[#00e5ff] text-sm hover:underline">Ver todas</Link>
          </div>

          <div className="flex flex-col">
            {[
              { asset: 'BTC/USD', type: 'Crypto', timeframe: '1H', status: 'COMPRA', color: 'text-[#00e676]', bg: 'bg-[#00e676]/10', border: 'border-[#00e676]/20' },
              { asset: 'EUR/USD', type: 'Forex', timeframe: '15M', status: 'VENDA FORTE', color: 'text-[#ff3d00]', bg: 'bg-[#ff3d00]/10', border: 'border-[#ff3d00]/20' },
              { asset: 'AAPL', type: 'Ações', timeframe: '1D', status: 'NEUTRO', color: 'text-slate-400', bg: 'bg-white/5', border: 'border-white/10' },
              { asset: 'XAU/USD', type: 'Commodity', timeframe: '4H', status: 'COMPRA FRACA', color: 'text-[#ff9900]', bg: 'bg-[#ff9900]/10', border: 'border-[#ff9900]/20' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                    {item.asset.split('/')[0].substring(0, 3)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{item.asset}</h4>
                    <span className="text-slate-500 text-xs">{item.type} • {item.timeframe}</span>
                  </div>
                </div>

                <div className={`px-3 py-1 rounded border ${item.bg} ${item.color} ${item.border} text-xs font-bold tracking-wider`}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Footer (Comprar Créditos) */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <Link href="/planos" className="flex items-center justify-between bg-gradient-to-r from-[#121212] to-[#121212] border border-[#00e5ff]/20 rounded-xl p-5 hover:border-[#00e5ff]/50 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00e5ff]/5 rounded-full blur-2xl group-hover:bg-[#00e5ff]/10 transition-colors"></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
              </div>
              <div>
                <h3 className="text-white font-bold">Comprar Créditos</h3>
                <p className="text-[#00e5ff] text-xs mt-0.5">Adquira mais análises PRO</p>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-white relative z-10"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        </div>

      </div>

    </div>
  );
}
