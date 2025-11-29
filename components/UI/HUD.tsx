import React from 'react';
import { useStore } from '../../store/useStore';

const HUD: React.FC = () => {
  const { score, fails, maxFails } = useStore();
  const lives = Math.max(0, maxFails - fails);

  return (
    <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none flex justify-between items-start">
      {/* Score */}
      <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Score</p>
        <p className="text-4xl font-mono font-bold text-emerald-400">{score}</p>
      </div>

      {/* Controller Status Indicator (Visual only) */}
      <div className="flex flex-col items-center gap-2 opacity-50">
        <div className="w-12 h-8 rounded-lg border-2 border-white/20 flex items-center justify-center">
            <i className="fa-solid fa-gamepad text-white/50"></i>
        </div>
        <span className="text-[10px] text-white/40">GAMEPAD ACTIVE</span>
      </div>

      {/* Lives / Fails */}
      <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl text-right">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Stability</p>
        <div className="flex gap-2 mt-2 justify-end">
          {Array.from({ length: maxFails }).map((_, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-full ${i < lives ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]' : 'bg-slate-700'}`}
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-1">{lives} attempts remaining</p>
      </div>
    </div>
  );
};

export default HUD;