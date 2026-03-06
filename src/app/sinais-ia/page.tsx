'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Crown, Lock, TrendingUp, TrendingDown, Star, Radio, RefreshCw, AlertTriangle, Settings, X, Check, ShieldCheck } from 'lucide-react';
import { getFavorites, FavoriteAsset } from '@/lib/favorites';
import { calculateSuggestedLot, calculateTargetProfit, getTickConfig } from '@/lib/riskCalc';
import { supabase } from '@/lib/supabase';

// ─── Sinais Recentes — mock demonstrativo XAU/USD ─────────
const RECENT_SIGNALS: {
    id: number; asset: string; direction: string; badge: string;
    badgeColor: string; stopLoss: string; takeProfit: string; time: string;
    stats: string; positive: boolean;
    entryPrice: number;
    stopLossPrice: number;
}[] = [
        {
            id: 1, asset: 'XAU/USD', direction: 'buy', badge: 'Ativo',
            badgeColor: '#00e5ff', stopLoss: '2325.50', takeProfit: '2345.50', time: 'Agora mesmo',
            stats: 'R:R 1:2', positive: true,
            entryPrice: 2335.50,
            stopLossPrice: 2325.50
        }
    ];

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
const LS_KEY_SNIPER_ACTIVE = 'tickmatrix:sniper:active';
const LS_KEY_RISK_BALANCE = 'tickmatrix:risk:balance';
const LS_KEY_RISK_PERC = 'tickmatrix:risk:percentage';
const LS_KEY_RISK_DRAWDOWN = 'tickmatrix:risk:drawdown';
const LS_KEY_RISK_LOT = 'tickmatrix:risk:lot';

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
    signalStartTime: Date | null;
    // valores brutos calculados pela API (entry ± ATR)
    entryRaw: number;
    stopLossRaw: number;
    takeProfit1Raw: number;
    takeProfit2Raw: number;
    takeProfit3Raw: number;
    takeProfitRaw: number;
};

// ─── Trade rastreado pelo Radar ────────────────────────────────────────────
type ActiveTrade = {
    id: string;
    asset: string;
    direction: 'COMPRA' | 'VENDA';
    entryRaw: number;
    stopLossRaw: number;
    takeProfit1Raw: number;
    takeProfit2Raw: number;
    takeProfit3Raw: number;
    takeProfitRaw: number;
    signalTime: Date; // Quando o sinal apareceu pela primeira vez
    openTime: Date;   // Quando foi gravado (execução)
    stars: number;
    status: 'ACOMPANHANDO' | 'GAIN' | 'STOP';
    closePrice?: number;
    points?: number;
    supabaseId?: string; // UUID retornado pelo INSERT no banco
    maxTargetReached?: number; // 0=none, 1=TP1, 2=TP2, 3=TP3
};

// ─── Audio helper ──────────────────────────────────────────────────────────
function playAlert(stars: number, direction: 'buy' | 'sell') {
    if (direction !== 'buy' && direction !== 'sell') return; // Segurança contra sinais neutros

    try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new AudioCtx();

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
    } catch (e) {
        console.warn('[Audio] Falha ao tocar alerta (bloqueado pelo navegador?):', e);
    }
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

// ─── Timezone BRT Helper ──────────────────────────────────────────────────
const formatBRT = (date: Date | string | null, includeSeconds = true) => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        timeZone: 'America/Sao_Paulo'
    });
};

const fmt = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return '—';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? '—' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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

    // Efeito para carregar o estado salvo (Sniper e Gestão de Risco)
    useEffect(() => {
        console.log('🚀 [TickMatrix] SinaisIA Component Loaded');

        // Hidrata Sniper
        const savedActive = localStorage.getItem(LS_KEY_SNIPER_ACTIVE);
        if (savedActive !== null) setActive(savedActive === 'true');

        // Hidrata Gestão de Risco
        const savedBalance = localStorage.getItem(LS_KEY_RISK_BALANCE);
        if (savedBalance) setAccountBalance(Number(savedBalance));

        const savedPerc = localStorage.getItem(LS_KEY_RISK_PERC);
        if (savedPerc) setRiskPercentage(Number(savedPerc));

        const savedDrawdown = localStorage.getItem(LS_KEY_RISK_DRAWDOWN);
        if (savedDrawdown) setDailyDrawdownLimit(Number(savedDrawdown));

        const savedLot = localStorage.getItem(LS_KEY_RISK_LOT);
        if (savedLot) setLotSizeInput(Number(savedLot));
    }, []);
    const [togglingRadar, setTogglingRadar] = useState(false);
    const [radarData, setRadarData] = useState<Record<string, RadarItem>>({});
    const [favorites, setFavorites] = useState<FavoriteAsset[]>([]);
    const [countdown, setCountdown] = useState(120);
    const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
    const [historico, setHistorico] = useState<Record<string, unknown>[]>([]);
    const [showHistorico, setShowHistorico] = useState(true);
    const [loadingHistorico, setLoadingHistorico] = useState(false);
    const prevSignals = useRef<Record<string, string>>({});
    const prevStarsMap = useRef<Record<string, number>>({});
    const signalTimes = useRef<Record<string, Date>>({}); // Birth time of the current signal
    const lastUpdateMap = useRef<Record<string, number>>({}); // Cache para evitar chamadas excessivas (Twelve Data)

    // ── Construtor de Estratégias (Filtros de Confluência) ──────────────────
    const [activeFilters, setActiveFilters] = useState({
        supertrend: true,
        rsi: false,
        macd: false,
        emas: false,
    });

    // ── Gestão de Risco (Risk Management) ───────────────────────────────────
    const [accountBalance, setAccountBalance] = useState(10000);
    const [riskPercentage, setRiskPercentage] = useState(1.0);
    const [dailyDrawdownLimit, setDailyDrawdownLimit] = useState(500);
    const [lotSizeInput, setLotSizeInput] = useState(0.10);

    // Salvar Gestão de Risco ao mudar
    useEffect(() => { localStorage.setItem(LS_KEY_RISK_BALANCE, String(accountBalance)); }, [accountBalance]);
    useEffect(() => { localStorage.setItem(LS_KEY_RISK_PERC, String(riskPercentage)); }, [riskPercentage]);
    useEffect(() => { localStorage.setItem(LS_KEY_RISK_DRAWDOWN, String(dailyDrawdownLimit)); }, [dailyDrawdownLimit]);
    useEffect(() => { localStorage.setItem(LS_KEY_RISK_LOT, String(lotSizeInput)); }, [lotSizeInput]);

    // ── Filtro Sniper ───────────────────────────────────────────────────────
    const [audioUnlocked, setAudioUnlocked] = useState(false);
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

    const persist = async (selected: string[]) => {
        try { 
            localStorage.setItem(LS_KEY, JSON.stringify(selected)); 
            // Sincroniza com Supabase (Configuração Global)
            await supabase.from('bot_settings').update({
                moedas_ativas: selected,
                updated_at: new Date().toISOString()
            }).eq('id', 1);
        } catch { /* ignore */ }
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

    // ── Hidratar Trades Abertos (Proteção contra F5) ─────────────────────────
    useEffect(() => {
        const hydrateTrades = async () => {
            try {
                const { data, error } = await supabase
                    .from('trading_history')
                    .select('*')
                    .eq('resultado', 'ABERTO');

                if (error || !data) return;

                const hydrated: ActiveTrade[] = data.map(row => ({
                    id: `${row.ativo}_${row.sinal_ia}_M5`,
                    asset: String(row.ativo),
                    direction: row.sinal_ia as 'COMPRA' | 'VENDA',
                    entryRaw: Number(row.entry_price),
                    stopLossRaw: Number(row.stop_loss),
                    takeProfit1Raw: Number(row.take_profit_1),
                    takeProfit2Raw: Number(row.take_profit_2),
                    takeProfit3Raw: Number(row.take_profit_3),
                    takeProfitRaw: Number(row.take_profit),
                    signalTime: new Date(String(row.signal_time)), // Hydrate signalTime
                    openTime: new Date(String(row.open_time)),
                    stars: 3, // Defaults para hidratado do F5
                    status: 'ACOMPANHANDO',
                    supabaseId: String(row.id),
                    maxTargetReached: Number(row.max_target || 0),
                }));

                if (hydrated.length > 0) {
                    setActiveTrades(hydrated);
                    hydrated.forEach(t => {
                        prevSignals.current[t.asset] = t.direction;
                        signalTimes.current[t.asset] = t.signalTime; // Hydrate signalTimes ref
                    });
                }
            } catch (err) {
                console.error('[Radar] Falha ao hidratar trades:', err);
            }
        };
        hydrateTrades();
    }, []);

    // ── Sincronização do Toggle e Moedas com o Supabase (bot_settings) ────────
    useEffect(() => {
        (async () => {
            try {
                // Busca as configurações globais do bot
                const { data: botSettings, error } = await supabase
                    .from('bot_settings')
                    .select('*')
                    .single();

                if (botSettings) {
                    console.log('📦 [bot_settings] Dados carregados:', botSettings);
                    setActive(botSettings.is_sniper_active ?? false);
                    localStorage.setItem(LS_KEY_SNIPER_ACTIVE, String(botSettings.is_sniper_active));
                    
                    if (botSettings.moedas_ativas && Array.isArray(botSettings.moedas_ativas)) {
                        setSelectedSignalAssets(botSettings.moedas_ativas);
                        localStorage.setItem(LS_KEY, JSON.stringify(botSettings.moedas_ativas));
                    }
                } else if (error && error.code === 'PGRST116') {
                    console.log('📦 [bot_settings] Registro não encontrado, criando padrão...');
                    await supabase.from('bot_settings').insert({
                        id: 1,
                        is_sniper_active: true, // Começar ativado por padrão conforme pedido do Erik
                        moedas_ativas: ALL_SNIPER_VALUES
                    });
                    setActive(true);
                }
            } catch (err) {
                console.error('[Supabase] Falha ao carregar bot_settings:', err);
            }
        })();
    }, []);

    const toggleRadarActive = async () => {
        if (togglingRadar) return;
        const next = !active;
        setTogglingRadar(true);
        setActive(next); // optimistic update
        localStorage.setItem(LS_KEY_SNIPER_ACTIVE, String(next));
        try {
            // Salva na bot_settings (Configuração Global do Sniper)
            await supabase.from('bot_settings').update({
                is_sniper_active: next,
                updated_at: new Date().toISOString()
            }).eq('id', 1); // Assumindo ID 1 como o registro único de config

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('profiles').upsert({
                    id: user.id,
                    is_radar_active: next,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });
            }
        } catch (err) {
            console.error('[Radar] Falha ao salvar estado do toggle:', err);
            setActive(!next); // rollback em caso de erro
            localStorage.setItem(LS_KEY_SNIPER_ACTIVE, String(!next));
        } finally {
            setTogglingRadar(false);
        }
    };

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

    // Estado visual para erro de insert (para T.I. debugar)
    const [insertError, setInsertError] = useState<string | null>(null);

    // Insere novo trade no Supabase ao abrir (status ABERTO)
    const openTradeInSupabase = async (trade: ActiveTrade): Promise<string | undefined> => {
        try {
            setInsertError(null); // Limpa erro anterior
            const payload = {
                ativo: trade.asset,
                timeframe: '5m',
                sinal_ia: trade.direction,
                preco: String(trade.entryRaw || 0),
                entry_price: trade.entryRaw,
                stop_loss: trade.stopLossRaw,
                take_profit_1: trade.takeProfit1Raw,
                take_profit_2: trade.takeProfit2Raw,
                take_profit_3: trade.takeProfit3Raw,
                take_profit: trade.takeProfit3Raw, // Alvo 3 como TP principal
                max_target: trade.maxTargetReached ?? 0,
                resultado: 'ABERTO',
                signal_time: trade.signalTime.toISOString(), // Use the signalTime from the trade object
                execution_time: trade.openTime.toISOString(),
                stars_at_entry: trade.stars,
                open_time: trade.openTime.toISOString(),
                atraso: Math.max(0, Math.floor((trade.openTime.getTime() - trade.signalTime.getTime()) / 1000)),
            };

            console.log('[Radar Insert Payload]', payload);

            const { data, error } = await supabase.from('trading_history').insert(payload).select('id').single();

            if (error) {
                const msg = `Supabase Error: ${error.message}`;
                setInsertError(msg);
                console.error(msg);
                return undefined;
            }
            return data?.id as string | undefined;

        } catch (err: any) {
            console.error('[Radar] Falha estrutural ao abrir trade no Supabase:', err);
            setInsertError(err?.message || 'Falha desconhecida no Insert');
            return undefined;
        }
    };

    // Atualiza trade fechado no Supabase (UPDATE usando supabaseId)
    const closeTradeInSupabase = async (trade: ActiveTrade, closePrice: number, resultado: 'GAIN' | 'STOP' | 'BREAKEVEN') => {
        try {
            const payload = {
                close_price: closePrice,
                resultado,
                resultado_pontos: trade.points ?? 0, // novo campo exigido
                pontos: trade.points ?? 0,          // mantido para retrocompatibilidade
                max_target: trade.maxTargetReached ?? 0,
                close_time: new Date().toISOString(),
            };

            if (trade.supabaseId) {
                await supabase.from('trading_history').update(payload).eq('id', trade.supabaseId);
            } else {
                // Fallback: em vez de criar um novo (INSERT), tenta fechar o registro que ainda está ABERTO
                await supabase.from('trading_history').update(payload)
                    .eq('ativo', trade.asset)
                    .eq('resultado', 'ABERTO');
            }
        } catch (err) {
            console.error('[Radar] Falha ao fechar trade no Supabase:', err);
        }
    };

    // Busca histórico do dia do Supabase
    const fetchHistorico = async () => {
        setLoadingHistorico(true);
        try {
            const { data } = await supabase
                .from('trading_history')
                .select('*') // Puxa tudo para evitar erro de coluna específica
                .order('created_at', { ascending: false })
                .limit(20); // Reduzi para 20 para carregar mais rápido

            setHistorico(data ?? []);
        } catch (err) {
            console.error('[Histórico] Falha ao buscar:', err);
        } finally {
            setLoadingHistorico(false);
        }
    };

    // Cálculo de P/L Diário (Hoje)
    const dailyPnl = historico.reduce((acc, row) => {
        if (row.resultado === 'ABERTO') return acc;

        // Verifica se é de hoje (UTC-3 / America/Sao_Paulo)
        const d = new Date(String(row.created_at));
        const now = new Date();
        const isToday = d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();

        if (isToday) {
            let pnlUsd = Number(row.lucro_usd);
            // Se lucro_usd não está no banco, calcula a partir dos pontos (retropatibilidade)
            if (!pnlUsd && pnlUsd !== 0) {
                const pts = Number(row.resultado_pontos ?? row.pontos ?? 0);
                const cfg = getTickConfig(String(row.ativo));
                // Correção do erro ts(2339) para garantir somatória do lucro 515.34
                pnlUsd = (pts / (cfg as any).tickSize) * (cfg as any).tickValue * lotSizeInput;
            }
            return acc + (pnlUsd || 0);
        }
        return acc;
    }, 0);

    const drawdownRestante = Math.max(0, dailyDrawdownLimit + dailyPnl);
    const drawdownPercent = (drawdownRestante / dailyDrawdownLimit) * 100;

    // Subscrição Realtime e Load Inicial
    useEffect(() => {
        fetchHistorico(); // Carrega na inicialização independente do toggle

        const channel = supabase
            .channel('realtime_trading_history')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'trading_history' },
                (payload) => {
                    console.log('[Realtime] Mudança detectada no banco:', payload);
                    fetchHistorico();
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Status da inscrição:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Effect para sincronizar Log de Performance (activeTrades) com o Histórico (banco real)
    useEffect(() => {
        if (historico.length === 0) return;

        setActiveTrades(prev => prev.filter(trade => {
            // Procura se esse trade.asset já foi fechado no histórico mais recente
            // (Assumimos que as inserções mais recentes estão no topo do array)
            const dbRef = trade.supabaseId
                ? historico.find(h => (h as any).id === trade.supabaseId)
                : historico.find(h => {
                    const r = h as Record<string, unknown>;
                    return r.ativo === trade.asset && String(r.resultado).trim().toUpperCase() !== 'ABERTO';
                });

            // Se achou um registro do mesmo ativo não aberto (fechado recentemente por sql ou ui), retira do local log.
            if (dbRef) {
                const isAbertoDb = String((dbRef as any).resultado).trim().toUpperCase() === 'ABERTO';
                if (!isAbertoDb) {
                    // Forcar UI a dropar se o banco considera fechado (GAIN/STOP/BREAKEVEN)
                    return false;
                }
            }
            return true;
        }));
    }, [historico]);

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

            // Registrar nascimento do sinal (Timestamp de Virada)
            const now = new Date();
            const oldStars = prevStarsMap.current[fav.value] || 0;

            // Condição de Virada: 
            // 1. Mudou de NEUTRO para COMPRA/VENDA
            // 2. Ou subiu de < 3 estrelas para 3 estrelas (Elite)
            const isTurnaround = (direction !== 'NEUTRO') && (
                (oldSig === 'NEUTRO' || oldSig === undefined) ||
                (oldStars < 3 && stars === 3)
            );

            if (isTurnaround) {
                signalTimes.current[fav.value] = now;
            }

            const birthDate = signalTimes.current[fav.value] || now;

            // Filtro de Sinais Fantasmas: Se o sinal vier do futuro (API drift), ajusta para agora
            if (birthDate > now) {
                signalTimes.current[fav.value] = now;
            }

            prevSignals.current[fav.value] = direction;
            prevStarsMap.current[fav.value] = stars;

            const changed = oldSig !== undefined && oldSig !== direction;

            const currentPriceRaw: number = m5Data.priceRaw ?? 0;
            const entryRaw: number = m5Data.entryRaw ?? currentPriceRaw;
            const stopLossRaw: number = m5Data.stopLossRaw ?? 0;
            const takeProfit1Raw: number = m5Data.takeProfit1Raw ?? 0;
            const takeProfit2Raw: number = m5Data.takeProfit2Raw ?? 0;
            const takeProfit3Raw: number = m5Data.takeProfit3Raw ?? 0;
            const takeProfitRaw: number = takeProfit2Raw; // Mantém fallback/legacy

            // ── Verificar trades abertos deste ativo ─────────────────────────
            if (currentPriceRaw > 0) {
                setActiveTrades(prev => {
                    const next = prev.map(trade => {
                        if (trade.asset !== fav.value || trade.status !== 'ACOMPANHANDO') return trade;

                        let maxT = trade.maxTargetReached ?? 0;
                        const isBuy = trade.direction === 'COMPRA';

                        let maxPriceRaw = currentPriceRaw;
                        let minPriceRaw = currentPriceRaw;

                        // Captura High e Low caso o preço tenha cruzado o alvo entre os intervalos da API
                        const ext = m5Data as any;
                        if (ext.currentHigh !== undefined && ext.currentLow !== undefined) {
                            maxPriceRaw = ext.currentHigh;
                            minPriceRaw = ext.currentLow;
                        }

                        // Atualiza maior alvo atingido usando MAX PRICE e MIN PRICE para ignorar ruído
                        if (isBuy) {
                            if (maxPriceRaw >= trade.takeProfit3Raw) maxT = Math.max(maxT, 3);
                            else if (maxPriceRaw >= trade.takeProfit2Raw) maxT = Math.max(maxT, 2);
                            else if (maxPriceRaw >= trade.takeProfit1Raw) maxT = Math.max(maxT, 1);
                        } else {
                            if (minPriceRaw <= trade.takeProfit3Raw) maxT = Math.max(maxT, 3);
                            else if (minPriceRaw <= trade.takeProfit2Raw) maxT = Math.max(maxT, 2);
                            else if (minPriceRaw <= trade.takeProfit1Raw) maxT = Math.max(maxT, 1);
                        }

                        // Verifica Full Gain (Target 3)
                        const isFullGain = maxT === 3;

                        // Verifica Stop Loss
                        // Se maxT > 0, o SL vira Breakeven (preço de entrada)
                        const currentStopLoss = maxT > 0 ? trade.entryRaw : trade.stopLossRaw;

                        const isStop = isBuy
                            ? minPriceRaw <= currentStopLoss
                            : maxPriceRaw >= currentStopLoss;

                        if (isFullGain || isStop) {
                            // Definir o resultado
                            let resultado: 'GAIN' | 'STOP' | 'BREAKEVEN';
                            if (isFullGain) {
                                resultado = 'GAIN';
                            } else if (maxT > 0) {
                                resultado = 'BREAKEVEN';
                            } else {
                                resultado = 'STOP';
                            }

                            // Cálculo de pontos
                            let points = 0;
                            if (resultado === 'GAIN') {
                                points = Math.abs(trade.takeProfit3Raw - trade.entryRaw);
                            } else if (resultado === 'STOP') {
                                points = -Math.abs(trade.stopLossRaw - trade.entryRaw);
                            } // BREAKEVEN = 0 pontos

                            const closed: ActiveTrade = {
                                ...trade,
                                maxTargetReached: maxT,
                                status: resultado === 'BREAKEVEN' ? 'STOP' : resultado, // UI trata BREAKEVEN na listagem de recents apenas
                                closePrice: currentPriceRaw,
                                points,
                            };

                            // Fechar no DB preservando o tipo exato incluindo BREAKEVEN
                            closeTradeInSupabase(closed, currentPriceRaw, resultado).then(() => fetchHistorico());
                            return closed;
                        }

                        // Trade segue aberto com atualização do target
                        if (maxT !== trade.maxTargetReached) {
                            return { ...trade, maxTargetReached: maxT };
                        }

                        return trade;
                    });
                    return next;
                });
            }

            // ── Registrar novo trade ao detectar mudança de sinal ────────────
            const uniqueTradeId = `${fav.value}_${direction}_M5`;

            if (changed && (direction === 'COMPRA' || direction === 'VENDA') && stopLossRaw > 0) {
                setActiveTrades(prev => {
                    // Previne duplicatas caso o trade já exista e esteja ativo
                    if (prev.some(t => t.id === uniqueTradeId && t.status === 'ACOMPANHANDO')) {
                        return prev;
                    }

                    const newTrade: ActiveTrade = {
                        id: uniqueTradeId,
                        asset: fav.value,
                        direction: direction as 'COMPRA' | 'VENDA',
                        entryRaw,
                        stopLossRaw,
                        takeProfit1Raw,
                        takeProfit2Raw,
                        takeProfit3Raw,
                        takeProfitRaw,
                        signalTime: signalTimes.current[fav.value] || new Date(),
                        openTime: new Date(),
                        stars,
                        status: 'ACOMPANHANDO',
                    };

                    // Persiste abertura no Supabase e salva o UUID retornado
                    openTradeInSupabase(newTrade).then(supabaseId => {
                        setActiveTrades(current => [
                            { ...newTrade, supabaseId },
                            ...current.filter(t => t.id !== uniqueTradeId).slice(0, 19)
                        ]);
                        fetchHistorico(); // Force refresh local history
                    });

                    return [newTrade, ...prev].slice(0, 19);
                });
            }

            if (changed) {
                if (active) playAlert(stars, direction === 'COMPRA' ? 'buy' : 'sell');
            } else if (stars === 3 && oldSig === undefined) {
                if (active) playAlert(3, direction === 'COMPRA' ? 'buy' : 'sell');
            }

            setRadarData(prev => ({
                ...prev,
                [fav.value]: {
                    asset: fav,
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
                    signalStartTime: signalTimes.current[fav.value] || null,
                    entryRaw,
                    stopLossRaw,
                    takeProfit1Raw,
                    takeProfit2Raw,
                    takeProfit3Raw,
                    takeProfitRaw,
                },
            }));

            lastUpdateMap.current[fav.value] = Date.now();

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
                        entryRaw: 0, stopLossRaw: 0, takeProfit1Raw: 0, takeProfit2Raw: 0, takeProfit3Raw: 0, takeProfitRaw: 0,
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
                        entryRaw: 0, stopLossRaw: 0, takeProfit1Raw: 0, takeProfit2Raw: 0, takeProfit3Raw: 0, takeProfitRaw: 0,
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
        if (favorites.length === 0 || !active) return;
        
        // Watchdog de 10s
        const watchdog = setInterval(async () => {
            console.log(`⏱ Watchdog Check: ${new Date().toLocaleTimeString()}`);
            
            for (const fav of favorites) {
                try {
                    console.log(`🔎 Analisando: [${fav.value}]`);
                    
                    // Sistema de Cache: Só consulta API se o último update tiver > 60s
                    const now = Date.now();
                    const lastUp = lastUpdateMap.current[fav.value] || 0;
                    
                    if (now - lastUp < 60000) {
                        continue; 
                    }

                    await fetchOne(fav);
                    
                } catch (err) {
                    console.error(`❌ Erro no monitoramento de ${fav.value}:`, err);
                    continue; // Garante que o loop não trave
                }
            }
        }, 10000);

        // Chamada inicial
        fetchAll(favorites);
        setCountdown(120);

        return () => clearInterval(watchdog);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [favorites, active, activeFilters]);

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

            {/* ── Dashboard de Gestão de Risco (Risk Management) ── */}
            <div style={{
                background: '#0d1117', border: '1px solid rgba(255,255,204,0.1)',
                borderRadius: '16px', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: '20px',
                marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <ShieldCheck style={{ width: '16px', height: '16px', color: '#ffcc00' }} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffcc00' }}>Gestão de Risco Mesa Proprietária</span>
                </div>

                {/* Saldo da Conta */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Saldo da Conta ($)</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8', fontSize: '13px' }}>$</span>
                        <input
                            type="number"
                            value={accountBalance}
                            onChange={(e) => setAccountBalance(Number(e.target.value))}
                            style={{
                                width: '100%', background: '#0a0f16', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', padding: '8px 12px 8px 24px', color: '#fff', fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Risco Máximo */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Risco por Operação (%)</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number" step="0.1"
                            value={riskPercentage}
                            onChange={(e) => setRiskPercentage(Number(e.target.value))}
                            style={{
                                width: '100%', background: '#0a0f16', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', padding: '8px 24px 8px 12px', color: '#fff', fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8', fontSize: '13px' }}>%</span>
                    </div>
                </div>

                {/* Limite de Perda Diária */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Daily Drawdown Limit</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#f87171', fontSize: '13px' }}>$</span>
                        <input
                            type="number"
                            value={dailyDrawdownLimit}
                            onChange={(e) => setDailyDrawdownLimit(Number(e.target.value))}
                            style={{
                                width: '100%', background: '#0a0f16', border: '1px solid rgba(248,113,113,0.2)',
                                borderRadius: '8px', padding: '8px 12px 8px 24px', color: '#f87171', fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Lote Padrão */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Cálculo de TP (Lote)</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number" step="0.01" min="0.01"
                            value={lotSizeInput}
                            onChange={(e) => setLotSizeInput(Number(e.target.value))}
                            style={{
                                width: '100%', background: '#0a0f16', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', padding: '8px 12px', color: '#00e5ff', fontSize: '13px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Barra de Vida - Drawdown Diário (Prop Firm) */}
                <div style={{ width: '100%', marginTop: '10px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: drawdownPercent > 20 ? '#00e676' : '#ef4444', boxShadow: drawdownPercent > 20 ? '0 0 10px #00e676' : '0 0 10px #ef4444' }} />
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0' }}>VIDA DIÁRIA (DRAWDOWN)</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: drawdownPercent > 20 ? '#00e676' : '#ef4444' }}>
                            ${drawdownRestante.toFixed(2)} / ${dailyDrawdownLimit.toFixed(2)}
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${drawdownPercent}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${drawdownPercent > 50 ? '#00e676' : drawdownPercent > 20 ? '#f59e0b' : '#ef4444'}, #00c853)`,
                            transition: 'width 0.5s ease-out',
                            boxShadow: '0 0 10px rgba(0,230,118,0.3)'
                        }} />
                    </div>
                    <p style={{ fontSize: '10px', color: '#475569', marginTop: '6px', margin: 0 }}>
                        {dailyPnl >= 0 ? `Hoje: +$${dailyPnl.toFixed(2)} (Lucro)` : `Hoje: -$${Math.abs(dailyPnl).toFixed(2)} (Prejuízo)`}
                    </p>
                </div>
            </div>

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

                                        {/* Início do Sinal (Timestamp de Virada) */}
                                        {item.signalStartTime && (
                                            <div style={{
                                                marginLeft: '8px',
                                                background: 'rgba(255,183,0,0.05)',
                                                border: '1px solid rgba(255,183,0,0.15)',
                                                borderRadius: '6px',
                                                padding: '2px 12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                boxShadow: '0 0 10px rgba(0,0,0,0.2)'
                                            }}>
                                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#ffcc00', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Início do Sinal</span>
                                                <span style={{
                                                    fontSize: '13px',
                                                    fontWeight: 900,
                                                    color: '#fff',
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '1px',
                                                    textShadow: '0 0 5px rgba(0,0,0,0.5)'
                                                }}>
                                                    {item.signalStartTime.toLocaleTimeString('pt-BR', { hour12: false })}
                                                </span>
                                            </div>
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

                                        {/* Monitor de Risco Mesa Proprietária */}
                                        {item.signal !== 'NEUTRO' && item.signal !== '—' && (
                                            (() => {
                                                const { tickValueUsd } = getTickConfig(item.asset.value);
                                                const dist = Math.abs(item.entryRaw - item.stopLossRaw);
                                                const riskUsd = dist * tickValueUsd * lotSizeInput;
                                                const riskPct = (riskUsd / accountBalance) * 100;
                                                const isHighRisk = riskPct > 2.5;

                                                return (
                                                    <div style={{
                                                        marginLeft: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '2px 10px',
                                                        borderRadius: '8px',
                                                        background: isHighRisk ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',
                                                        border: `1px solid ${isHighRisk ? '#ef4444' : 'rgba(255,255,255,0.08)'}`,
                                                        boxShadow: isHighRisk ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none',
                                                        animation: isHighRisk ? 'pulseAlert 1.5s infinite' : 'none'
                                                    }}>
                                                        <style>{`
                                                            @keyframes pulseAlert {
                                                                0% { opacity: 1; }
                                                                50% { opacity: 0.6; }
                                                                100% { opacity: 1; }
                                                            }
                                                        `}</style>
                                                        <ShieldCheck style={{ width: '12px', height: '12px', color: isHighRisk ? '#ef4444' : '#64748b' }} />
                                                        <span style={{ fontSize: '11px', fontWeight: 800, color: isHighRisk ? '#ef4444' : '#94a3b8' }}>
                                                            Risco: <span style={{ color: isHighRisk ? '#ef4444' : '#fff' }}>${riskUsd.toFixed(2)}</span> ({riskPct.toFixed(1)}%)
                                                        </span>
                                                        {isHighRisk && <span style={{ fontSize: '9px', fontWeight: 900, color: '#ef4444', marginLeft: '4px' }}>⚠️ RISCO ALTO</span>}
                                                    </div>
                                                );
                                            })()
                                        )}

                                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                            {(() => {
                                                const at = activeTrades.find(t => t.asset === item.asset.value && t.status === 'ACOMPANHANDO');
                                                if (at) {
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                            <div>
                                                                <div style={{ fontSize: '10px', color: '#00e5ff', fontWeight: 700 }}>⏱ Gerado {formatBRT(at.openTime)}</div>
                                                                <div style={{ fontSize: '9px', color: '#64748b' }}>Sinal em andamento...</div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return <span style={{ fontSize: '10px', color: '#334155' }}>
                                                    {formatBRT(item.lastUpdate)}
                                                </span>;
                                            })()}
                                        </div>

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

                                    {/* Linha 3: Dimensionamento da Posição — dados reais da API (entry ± ATR) */}
                                    {!item.loading && item.stopLossRaw > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <ShieldCheck style={{ width: '12px', height: '12px', color: '#00e5ff' }} />
                                                    <span style={{ fontSize: '10px', color: '#64748b' }}>Dimensionamento da Posição</span>
                                                    <span style={{ fontSize: '10px', color: '#334155', fontFamily: 'monospace' }}>
                                                        SL {item.signal === 'COMPRA' ? '+' : '-'}{Math.abs(item.entryRaw - item.stopLossRaw).toFixed(item.stopLossRaw > 100 ? 2 : 4)} pts
                                                    </span>
                                                </div>
                                                {(() => {
                                                    const calc = calculateSuggestedLot(accountBalance, riskPercentage, item.entryRaw, item.stopLossRaw, item.asset.value);
                                                    if (!calc.valid) {
                                                        return <span style={{ fontSize: '10px', color: '#64748b' }}>⏳ {calc.message}</span>;
                                                    }
                                                    return (
                                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '6px' }}>
                                                            <span style={{ color: '#00e5ff' }}>{calc.lotLabel}</span>
                                                            <span style={{ color: '#475569', margin: '0 4px' }}>|</span>
                                                            <span style={{ color: '#f87171' }}>${calc.riskAmountUsd.toFixed(2)}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            {(() => {
                                                const tp1Profit = calculateTargetProfit(lotSizeInput, item.entryRaw, item.takeProfit1Raw, item.asset.value);
                                                const tp2Profit = calculateTargetProfit(lotSizeInput, item.entryRaw, item.takeProfit2Raw, item.asset.value);
                                                const tp3Profit = calculateTargetProfit(lotSizeInput, item.entryRaw, item.takeProfit3Raw, item.asset.value);

                                                if (!tp1Profit) return null;

                                                return (
                                                    <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: '#94a3b8' }}>
                                                        <span style={{ background: 'rgba(0,230,118,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.1)' }}>TP1: <strong style={{ color: '#00e676' }}>${tp1Profit.toFixed(2)}</strong></span>
                                                        <span style={{ background: 'rgba(0,230,118,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.1)' }}>TP2: <strong style={{ color: '#00e676' }}>${tp2Profit.toFixed(2)}</strong></span>
                                                        <span style={{ background: 'rgba(0,230,118,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,230,118,0.1)' }}>TP3: <strong style={{ color: '#00e676' }}>${tp3Profit.toFixed(2)}</strong></span>
                                                        <span style={{ marginLeft: 'auto', color: '#64748b' }}>(Cálculo c/ {lotSizeInput} lotes)</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ════════════════════════════════════════
                LOG DE PERFORMANCE EM TEMPO REAL
                ════════════════════════════════════════ */}
            {activeTrades.length > 0 && (
                <div style={{ margin: '0 0 0', borderRadius: '0' }}>
                    {/* Header do Log */}
                    <div style={{
                        background: '#0a0f1a',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderBottom: 'none',
                        padding: '14px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Radio style={{ width: '14px', height: '14px', color: '#00e5ff' }} />
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0' }}>Log de Performance</span>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                                borderRadius: '20px', background: 'rgba(0,229,255,0.1)',
                                color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)',
                            }}>
                                {activeTrades.filter(t => t.status === 'ACOMPANHANDO').length} aberto(s)
                            </span>
                        </div>
                        <button
                            onClick={() => setActiveTrades([])}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <X style={{ width: '12px', height: '12px' }} /> Limpar Log
                        </button>
                    </div>

                    <div style={{
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderTop: 'none',
                        background: '#080d16',
                        overflowX: 'auto',
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    {['Horário', 'Ativo', 'Direção', 'Entrada', 'SL', 'TP', 'Status', 'Pontos'].map(h => (
                                        <th key={h} style={{ padding: '8px 24px', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activeTrades.filter(t => t.asset !== 'TESTE_TI').map((trade, i) => {
                                    const isOpen = trade.status === 'ACOMPANHANDO';
                                    const isGain = trade.status === 'GAIN';
                                    const accentColor = isOpen ? '#00e5ff' : isGain ? '#00e676' : '#ef4444';
                                    const dirColor = trade.direction === 'COMPRA' ? '#00e676' : '#ef4444';
                                    return (
                                        <tr key={trade.id} style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            background: isOpen ? 'rgba(0,229,255,0.02)' : 'transparent'
                                        }}>
                                            <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap' }}>⏱ {formatBRT(trade.openTime)}</td>
                                            <td style={{ padding: '12px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: 800, color: '#fff' }}>{trade.asset}</span>
                                                    <span style={{ fontSize: '10px', color: '#f59e0b' }}>
                                                        {'★'.repeat(trade.stars)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 24px', fontWeight: 800, color: dirColor }}>{trade.direction}</td>
                                            <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#94a3b8' }}>{fmt(trade.entryRaw)}</td>
                                            <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#f87171' }}>{fmt(trade.stopLossRaw)}</td>
                                            <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#4ade80' }}>{fmt(trade.takeProfitRaw)}</td>
                                            <td style={{ padding: '12px 24px' }}>
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 800, padding: '2px 10px', borderRadius: '12px',
                                                    background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30`,
                                                }}>
                                                    {isOpen ? '● ACOMPANHANDO' : isGain ? '🏆 GAIN' : '🛑 STOP'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 24px', fontWeight: 800, color: accentColor, fontFamily: 'monospace' }}>
                                                {trade.points != null ? `${trade.points >= 0 ? '+' : ''}${trade.points.toFixed(2)} pts` : (isOpen ? '—' : '0.00 pts')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ERROR BANNER DE INSERÇÃO */}
            {
                insertError && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444',
                        padding: '16px 24px', borderRadius: '12px', marginBottom: '16px',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        boxShadow: '0 0 24px rgba(239, 68, 68, 0.4)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <strong style={{ color: '#fca5a5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle style={{ width: '18px', height: '18px' }} /> FALHA CRÍTICA DE GRAVAÇÃO NO HISTÓRICO
                            </strong>
                            <button onClick={() => setInsertError(null)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>
                                <X style={{ width: '16px', height: '16px' }} />
                            </button>
                        </div>
                        <pre style={{ margin: 0, padding: '12px', background: '#000', borderRadius: '8px', color: '#f87171', fontSize: '11px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                            {insertError}
                        </pre>
                    </div>
                )
            }

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
                    {/* Botão Histórico de Hoje */}
                    <button
                        onClick={() => setShowHistorico(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                            border: `1px solid ${showHistorico ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            background: showHistorico ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
                            color: showHistorico ? '#fbbf24' : '#64748b',
                            fontSize: '11px', fontWeight: 700,
                        }}
                    >
                        <RefreshCw
                            onClick={e => { e.stopPropagation(); if (showHistorico) fetchHistorico(); }}
                            style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                        />
                        Histórico de Hoje
                    </button>
                    {/* Botão Testar Áudio */}
                    <button
                        onClick={() => {
                            setAudioUnlocked(true);
                            playAlert(3, 'buy');
                        }}
                        title="Testar alerta de 3 estrelas e liberar áudio"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                            border: `1px solid ${audioUnlocked ? 'rgba(0,230,118,0.25)' : 'rgba(255,204,0,0.3)'}`,
                            background: audioUnlocked ? 'rgba(0,230,118,0.06)' : 'rgba(255,204,0,0.08)',
                            color: audioUnlocked ? '#00e676' : '#ffcc00',
                            fontSize: '11px', fontWeight: 700, transition: 'all 0.2s',
                        }}
                    >
                        {audioUnlocked ? '🔊 Áudio OK' : '🔇 Testar Áudio'}
                    </button>

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
                    <span style={{ fontSize: '12px', color: togglingRadar ? '#334155' : active ? '#00e5ff' : '#475569', fontWeight: 700, transition: 'color 0.2s' }}>
                        {togglingRadar ? 'Salvando...' : active ? 'Ativo' : 'Inativo'}
                    </span>
                    <div
                        onClick={toggleRadarActive}
                        title={togglingRadar ? 'Aguarde...' : active ? 'Desativar Radar' : 'Ativar Radar'}
                        style={{
                            width: '44px', height: '24px', borderRadius: '12px', position: 'relative',
                            cursor: togglingRadar ? 'wait' : 'pointer',
                            transition: 'background 0.2s, opacity 0.2s',
                            background: active ? '#00e5ff' : '#1e293b',
                            opacity: togglingRadar ? 0.55 : 1,
                            pointerEvents: togglingRadar ? 'none' : 'auto',
                        }}
                    >
                        <div style={{
                            position: 'absolute', top: '3px', left: active ? '23px' : '3px',
                            width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                            transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
                        }} />
                    </div>
                </div>
            </div>

            {/* ══ HISTÓRICO DE HOJE ══ */}
            {
                showHistorico && (
                    <div style={{ border: '1px solid rgba(251,191,36,0.15)', background: '#07090f', borderRadius: 0 }}>
                        <div style={{
                            padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📅 Histórico Recente
                                {loadingHistorico && <RefreshCw style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} />}
                                <span style={{ fontSize: '10px', color: '#475569', fontWeight: 400 }}>
                                    Últimos {historico.length}
                                </span>
                            </span>
                            <button onClick={fetchHistorico} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#64748b', fontSize: '10px', padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <RefreshCw style={{ width: '10px', height: '10px' }} /> Atualizar
                            </button>
                        </div>

                        {historico.length === 0 && !loadingHistorico && (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#334155', fontSize: '12px' }}>
                                Nenhum sinal registrado recentemente.
                            </div>
                        )}

                        {historico.length > 0 && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                        <tr style={{ color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            {['Horário', 'Ativo', 'Direção', 'Entrada', 'Atraso', 'Resultado', 'Pontos'].map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historico.filter(r => r.ativo !== 'TESTE_TI').map((row, i) => {
                                            const r = row as Record<string, unknown>;
                                            const res = String(r.resultado ?? '').trim().toUpperCase();
                                            const isGain = res === 'GAIN';
                                            const isStop = res === 'STOP';
                                            const isAberto = res === 'ABERTO';
                                            const resColor = isGain ? '#00e676' : isStop ? '#ef4444' : '#64748b';
                                            const fmt = (v: unknown) => v != null ? Number(v).toFixed(Number(v) > 100 ? 2 : 4) : '—';
                                            const timeRaw = r.close_time || r.open_time || r.execution_time || r.signal_time || r.created_at;
                                            const timeStr = timeRaw ? formatBRT(timeRaw as string) : '—';

                                            // Cálculo de delay
                                            let delayStr = '—';
                                            let delaySecs = 0;
                                            if (r.signal_time && r.execution_time) {
                                                const sT = new Date(String(r.signal_time)).getTime();
                                                const eT = new Date(String(r.execution_time)).getTime();
                                                if (!isNaN(sT) && !isNaN(eT)) {
                                                    const diffMs = Math.max(0, eT - sT);
                                                    delaySecs = diffMs / 1000;

                                                    const m = Math.floor(delaySecs / 60);
                                                    const s = Math.floor(delaySecs % 60);
                                                    delayStr = m > 0 ? `+${m}m ${s}s` : `+${s}s`;
                                                } else if (r.atraso != null) {
                                                    delaySecs = Number(r.atraso);
                                                    const m = Math.floor(delaySecs / 60);
                                                    const s = Math.floor(delaySecs % 60);
                                                    delayStr = m > 0 ? `+${m}m ${s}s` : `+${s}s`;
                                                }
                                            } else if (r.atraso != null) {
                                                delaySecs = Number(r.atraso);
                                                const m = Math.floor(delaySecs / 60);
                                                const s = Math.floor(delaySecs % 60);
                                                delayStr = m > 0 ? `+${m}m ${s}s` : `+${s}s`;
                                            }

                                            // Estilo do Delay
                                            const isFast = delaySecs > 0 && delaySecs < 10;
                                            const isSlow = delaySecs > 60;
                                            const delayColor = isFast ? '#00e676' : isSlow ? '#fbbf24' : '#64748b';
                                            const delayLabel = isFast ? ' (Sinal Rápido)' : isSlow ? ' (Sinal Lento)' : '';

                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap' }}>⏱ {timeStr}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{String(r.ativo ?? '')}</span>
                                                            {Number(r.stars_at_entry) > 0 && (
                                                                <span style={{ fontSize: '10px', color: '#f59e0b' }}>
                                                                    {'★'.repeat(Number(r.stars_at_entry))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: String(r.sinal_ia) === 'COMPRA' ? '#00e676' : '#ef4444' }}>{String(r.sinal_ia ?? '')}</td>
                                                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#94a3b8' }}>{fmt(r.entry_price ?? r.preco)}</td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{ fontSize: '10px', color: delayColor, fontWeight: 700 }}>
                                                            Delay: {delayStr}{delayLabel}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <span style={{
                                                            fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px',
                                                            background: `${resColor}18`, color: resColor, border: `1px solid ${resColor}30`,
                                                        }}>
                                                            {isGain ? '🏆 GAIN' : isStop ? '🛑 STOP' : isAberto ? '● Em andamento' : res}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', fontWeight: 800, color: resColor, fontFamily: 'monospace' }}>
                                                        {(r.resultado_pontos ?? r.pontos) != null ? `${Number(r.resultado_pontos ?? r.pontos) >= 0 ? '+' : ''}${Number(r.resultado_pontos ?? r.pontos).toFixed(2)} pts` : '--'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            }



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
                {historico.length === 0 ? (
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
                                Acompanhando mercado...
                            </p>
                            <p style={{ fontSize: '11px', color: '#334155', margin: '0 0 10px', letterSpacing: '0.02em' }}>
                                Nenhum sinal registrado hoje ainda.
                            </p>
                        </div>
                    </div>
                ) : (
                    historico.filter(r => r.ativo !== 'TESTE_TI').slice(0, 5).map((row, i) => {
                        const sig = row as Record<string, unknown>;
                        const res = String(sig.resultado ?? '').trim().toUpperCase();
                        const maxT = Number(sig.max_target ?? 0);

                        const isGain = res === 'GAIN';
                        const isStop = res === 'STOP';
                        const isAberto = res === 'ABERTO';
                        const isBreakeven = res === 'BREAKEVEN';

                        const dir = String(sig.sinal_ia ?? 'COMPRA');
                        const isBuy = dir === 'COMPRA';
                        const asset = String(sig.ativo ?? '???');
                        const entry = Number(sig.entry_price ?? sig.preco ?? 0);
                        const sl = Number(sig.stop_loss ?? 0);
                        let tp1 = Number(sig.take_profit_1 ?? 0);
                        let tp2 = Number(sig.take_profit_2 ?? 0);
                        let tp3 = Number(sig.take_profit_3 ?? 0);

                        // Fallback calculando dinamicamente alvos antigos que foram zerados
                        if (!tp1 && !tp2 && !tp3 && entry > 0 && sl > 0) {
                            const diff = Math.abs(entry - sl);
                            if (isBuy) {
                                tp1 = entry + diff;
                                tp2 = entry + diff * 2;
                                tp3 = entry + diff * 3;
                            } else {
                                tp1 = entry - diff;
                                tp2 = entry - diff * 2;
                                tp3 = entry - diff * 3;
                            }
                        }

                        const timeRaw = sig.close_time || sig.open_time || sig.execution_time || sig.signal_time || sig.created_at;
                        const timeStr = timeRaw ? formatBRT(timeRaw as string) : '—';

                        const fmt = (v: number) => v.toFixed(v > 100 ? 2 : 4);

                        // Badge logic
                        let badgeText = 'Acompanhando';
                        let badgeColor = '#00e5ff';
                        if (isGain) { badgeText = 'Gain (Alvo 3)'; badgeColor = '#00e676'; }
                        else if (isBreakeven) { badgeText = `Breakeven (Pós Alvo ${maxT})`; badgeColor = '#94a3b8'; }
                        else if (isStop) { badgeText = 'Stop Loss'; badgeColor = '#ef4444'; }

                        // Background row color
                        const bgCol = isGain ? 'rgba(0,230,118,0.04)' : isStop ? 'rgba(239,68,68,0.04)' : isBreakeven ? 'rgba(148,163,184,0.03)' : 'transparent';

                        return (
                            <div key={String(sig.id)} style={{ padding: '16px 24px', background: bgCol, borderBottom: i < historico.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', cursor: 'default' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {isBuy ? <TrendingUp style={{ width: '16px', height: '16px', color: '#00e676' }} /> : <TrendingDown style={{ width: '16px', height: '16px', color: '#ef4444' }} />}
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{asset}</span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: `${badgeColor}20`, color: badgeColor, border: `1px solid ${badgeColor}30` }}>
                                            {badgeText}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px', fontFamily: 'monospace' }}>⏱ {timeStr}</p>
                                        <p style={{ fontSize: '12px', fontWeight: 800, color: isGain ? '#00e676' : isStop ? '#ef4444' : isBreakeven ? '#94a3b8' : '#00e5ff', margin: 0, fontFamily: 'monospace' }}>
                                            {(sig.resultado_pontos ?? sig.pontos) != null ? `${Number(sig.resultado_pontos ?? sig.pontos) >= 0 ? '+' : ''}${fmt(Number(sig.resultado_pontos ?? sig.pontos))} pts` : '--'}
                                        </p>
                                    </div>                              </div>

                                {/* Auditoria de Alvos (Horizontal) */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>

                                    {/* Entrada e SL */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '12px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>Entrada: <strong style={{ color: '#e2e8f0' }}>{fmt(entry)}</strong></span>
                                        <span style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'monospace' }}>SL: <strong style={{ color: '#fca5a5' }}>{fmt(sl)}</strong></span>
                                    </div>

                                    {/* Alvo 1 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: maxT >= 1 || isGain ? '#00e676' : '#64748b' }}>Alvo 1 (1:1) {maxT >= 1 || isGain ? '✓' : ''}</span>
                                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: maxT >= 1 || isGain ? '#fff' : '#475569' }}>{fmt(tp1)}</span>
                                    </div>

                                    {/* Alvo 2 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: maxT >= 2 || isGain ? '#00e676' : '#64748b' }}>Alvo 2 (1:2) {maxT >= 2 || isGain ? '✓' : ''}</span>
                                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: maxT >= 2 || isGain ? '#fff' : '#475569' }}>{fmt(tp2)}</span>
                                    </div>

                                    {/* Alvo 3 */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: maxT >= 3 || isGain ? '#00e676' : '#64748b' }}>Alvo 3 (1:3) {maxT >= 3 || isGain ? '✓' : ''}</span>
                                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: maxT >= 3 || isGain ? '#fff' : '#475569' }}>{fmt(tp3)}</span>
                                    </div>

                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ════════════════════════════════════════
                MODAL — Filtro Sniper
            ════════════════════════════════════════ */}
            {
                filterOpen && (
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

        </div>
    );
}
