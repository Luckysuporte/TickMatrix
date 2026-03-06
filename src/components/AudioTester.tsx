'use client';

import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';

export default function AudioTester() {
    const [unlocked, setUnlocked] = useState(false);

    useEffect(() => {
        console.log('🔊 [AudioTester] Componente de áudio carregado e pronto.');
    }, []);

    function playTestSound() {
        try {
            const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
            const ctx = new AudioCtx();
            
            // Som Elite 3 estrelas simulado
            [0, 0.18, 0.36].forEach((offset, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = 660 + i * 220;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.18, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.15);
            });
            setUnlocked(true);
        } catch (e) {
            console.error('[AudioTester] Erro ao tocar som:', e);
        }
    }

    return (
        <div
            id="audio-tester-floating-button"
            onClick={playTestSound}
            style={{
                position: 'fixed',
                bottom: '30px',
                right: '30px',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00e676, #00c853)',
                boxShadow: '0 0 20px rgba(0, 230, 118, 0.5), 0 0 40px rgba(0, 230, 118, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 99999, // Garantindo o topo absoluto
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                border: '3px solid rgba(255, 255, 255, 0.2)',
            }}
        >
            <div style={{ fontSize: '28px' }}>🔊</div>
            
            {!unlocked && (
                <div style={{
                    position: 'absolute',
                    top: '-45px',
                    right: '0',
                    background: '#000',
                    color: '#00e676',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    border: '1px solid #00e676',
                    pointerEvents: 'none'
                }}>
                    Aperte para liberar o som! 👈
                </div>
            )}
        </div>
    );
}
