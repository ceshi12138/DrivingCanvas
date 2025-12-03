import React from 'react';
import { Gear } from '../types';
import { Settings, RefreshCw } from 'lucide-react';

interface ControlsProps {
  steering: number;
  setSteering: (val: number) => void;
  gas: boolean;
  setGas: (val: boolean) => void;
  brake: boolean;
  setBrake: (val: boolean) => void;
  gear: Gear;
  setGear: (g: Gear) => void;
  onReset: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  steering, setSteering,
  gas, setGas,
  brake, setBrake,
  gear, setGear,
  onReset
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white p-5 border-t border-gray-200 flex flex-col gap-5 shadow-sm rounded-b-xl">
      
      {/* Top Row: Gears and Reset */}
      <div className="flex justify-between items-center">
        <div className="flex bg-slate-100 rounded-lg p-1 shadow-inner">
          {[Gear.P, Gear.R, Gear.N, Gear.D].map((g) => (
            <button
              key={g}
              onClick={() => setGear(g)}
              className={`px-5 py-2 rounded-md font-bold text-sm transition-all ${
                gear === g 
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200 scale-105' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <button 
          onClick={onReset}
          className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"
          title="重置车辆"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Middle: Steering Wheel Slider */}
      <div className="flex flex-col items-center justify-center space-y-1">
        <div className="relative w-full h-14 flex items-center group">
          {/* Wheel track */}
          <div className="absolute w-full h-3 bg-slate-200 rounded-full shadow-inner"></div>
          
          {/* Ticks */}
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div>
          <div className="absolute left-1/4 -translate-x-1/2 w-0.5 h-3 bg-slate-300"></div>
          <div className="absolute left-3/4 -translate-x-1/2 w-0.5 h-3 bg-slate-300"></div>

          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={steering}
            onChange={(e) => setSteering(parseFloat(e.target.value))}
            className="w-full z-10 opacity-0 cursor-pointer h-14 absolute"
          />
          
          {/* Visual Thumb (Steering Wheel) */}
          <div 
            className="absolute h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-75"
            style={{ 
                left: `${((steering + 1) / 2) * 100}%`,
                transform: `translateX(-50%) rotate(${steering * 540}deg)` // Rotate 1.5 turns (540 deg)
            }}
          >
             <div className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center">
                <div className="w-full h-1 bg-white/50"></div>
             </div>
          </div>
        </div>
        <div className="flex justify-between w-full text-[10px] text-slate-400 font-mono tracking-widest px-1">
            <span>左打死</span>
            <span>回正</span>
            <span>右打死</span>
        </div>
      </div>

      {/* Bottom: Pedals */}
      <div className="flex gap-4 h-24 mt-2">
        <button
          className={`flex-1 rounded-xl flex flex-col items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 ${
             brake 
             ? 'bg-red-500 border-red-700 text-white shadow-lg' 
             : 'bg-slate-200 border-slate-300 text-slate-400 hover:bg-slate-300'
          }`}
          onMouseDown={() => setBrake(true)}
          onMouseUp={() => setBrake(false)}
          onTouchStart={(e) => { e.preventDefault(); setBrake(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setBrake(false); }}
        >
          <span className="text-xl font-black tracking-wider">刹车</span>
        </button>

        <button
          className={`flex-1 rounded-xl flex flex-col items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 ${
             gas 
             ? 'bg-green-500 border-green-700 text-white shadow-lg' 
             : 'bg-slate-200 border-slate-300 text-slate-400 hover:bg-slate-300'
          }`}
          onMouseDown={() => setGas(true)}
          onMouseUp={() => setGas(false)}
          onTouchStart={(e) => { e.preventDefault(); setGas(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setGas(false); }}
        >
          <span className="text-xl font-black tracking-wider">油门</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;