'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gift, Crown, Sparkles, LogOut } from 'lucide-react';

const Navbar = () => {
    const pathname = usePathname();

    return (
        <nav className="w-full bg-[#0a0a0a] border-b border-white/5 px-6 py-5">
            <div className="relative flex items-center justify-between h-14">

                {/* Left: Logo Vortex Style or Breadcrumb */}
                {pathname === '/nova-analise' || pathname === '/tickmatrix-acoes' || pathname === '/sinais-ia' || pathname === '/planos' ? (
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-white transition-all group">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m15 18-6-6 6-6" /></svg>
                            <span className="text-[13px] font-semibold tracking-wide uppercase">Dashboard</span>
                        </Link>
                        <span className="text-white/10 font-light text-xl -mt-0.5">|</span>
                        {pathname === '/nova-analise' ? (
                            <span className="text-white font-extrabold text-sm uppercase tracking-[0.05em]">Nova Análise</span>
                        ) : pathname === '/sinais-ia' ? (
                            <span className="flex items-center gap-2 text-[#ff9900] font-extrabold text-sm uppercase tracking-[0.05em]">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                                Sinais IA
                            </span>
                        ) : pathname === '/planos' ? (
                            <span className="flex items-center gap-2 text-white font-extrabold text-sm uppercase tracking-[0.05em]">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                Créditos & Assinatura
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 text-white font-extrabold text-sm uppercase tracking-[0.05em]">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                                TickMatrix Ações
                                <span className="bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20 text-[9px] font-black px-2 py-0.5 rounded-md tracking-wider">BETA</span>
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 bg-[#001824] rounded-lg flex items-center justify-center border border-[#00e5ff]/20">
                                {/* Simple V or T shape */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L2 22H7L12 12L17 22H22L12 2Z" fill="#00e5ff" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-white tracking-wide hidden sm:block">TickMatrix</span>
                        </Link>
                    </div>
                )}

                {/* Right: Vortex Pills & User Actions */}
                <div className="flex items-center gap-3 relative z-20">

                    {/* Oferta Especial Pill */}
                    <button className="hidden md:flex items-center gap-2 bg-[#ff9900]/10 border border-[#ff9900]/30 hover:bg-[#ff9900]/20 transition-colors px-4 py-1.5 rounded-full">
                        <Gift className="w-4 h-4 text-[#ff9900]" />
                        <span className="text-[#ff9900] text-xs font-bold tracking-wide">Oferta Especial</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff9900] ml-1 shadow-[0_0_5px_#ff9900]"></div>
                    </button>

                    {/* Pro Credits (Crown) */}
                    <div className="flex items-center gap-2 bg-[#ff9900]/10 border border-[#ff9900]/30 px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#ff9900]/20 transition-colors">
                        <Crown className="w-4 h-4 text-[#ff9900]" />
                        <span className="text-[#ff9900] text-sm font-bold">4</span>
                    </div>

                    {/* Simple Credits (Stars) */}
                    <div className="flex items-center gap-2 bg-[#00e5ff]/10 border border-[#00e5ff]/30 px-3 py-1.5 rounded-full cursor-pointer hover:bg-[#00e5ff]/20 transition-colors">
                        <Sparkles className="w-4 h-4 text-[#00e5ff]" />
                        <span className="text-[#00e5ff] text-sm font-bold">5</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block"></div>

                    {/* Logout / Exit */}
                    <button className="p-2 text-slate-400 hover:text-white transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>

                </div>
            </div>
        </nav>
    );
};

export default Navbar;
