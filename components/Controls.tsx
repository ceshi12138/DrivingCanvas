import React from 'react';
import { Gear } from '../types';
import { Settings, RefreshCw, Power } from 'lucide-react';

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
    <div className="w-full max-w-[600px] bg-gray-800 p-4 rounded-xl border-t border-gray-700 flex flex-col gap-4 shadow-2xl">
      
      {/* Top Row: Gears and Reset */}
      <div className="flex justify-between items-center">
        <div className="flex bg-gray-900 rounded-lg p-1">
          {[Gear.P, Gear.R, Gear.N, Gear.D].map((g) => (
            <button
              key={g}
              onClick={() => setGear(g)}
              className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${
                gear === g 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <button 
          onClick={onReset}
          className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600 hover:text-white transition-colors"
          title="Reset Car"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Middle: Steering Wheel Slider */}
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="relative w-full h-12 flex items-center">
          {/* Wheel track */}
          <div className="absolute w-full h-2 bg-gray-700 rounded-full"></div>
          {/* Center Mark */}
          <div className="absolute left-1/2 -translate-x-1/2 w-1 h-4 bg-yellow-500/50"></div>
          
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={steering}
            onChange={(e) => setSteering(parseFloat(e.target.value))}
            className="w-full z-10 opacity-0 cursor-pointer h-12 absolute"
            // Reset to center on release is NOT done in real cars for slow maneuvers, 
            // but for gameplay it might be annoying. Let's keep it sticky (no auto-reset).
          />
          
          {/* Visual Thumb */}
          <div 
            className="absolute h-10 w-10 bg-blue-500 rounded-full shadow-lg border-2 border-white flex items-center justify-center pointer-events-none transition-transform duration-75"
            style={{ 
                left: `${((steering + 1) / 2) * 100}%`,
                transform: `translateX(-50%) rotate(${steering * 90}deg)`
            }}
          >
             <Settings className="text-white w-6 h-6 animate-spin-slow" />
          </div>
        </div>
        <div className="flex justify-between w-full text-xs text-gray-500 font-mono">
            <span>FULL LEFT</span>
            <span>CENTER</span>
            <span>FULL RIGHT</span>
        </div>
      </div>

      {/* Bottom: Pedals */}
      <div className="flex gap-4 h-24">
        <button
          className={`flex-1 rounded-xl flex flex-col items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 ${
             brake 
             ? 'bg-red-600 border-red-800 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]' 
             : 'bg-gray-700 border-gray-900 text-gray-400'
          }`}
          onMouseDown={() => setBrake(true)}
          onMouseUp={() => setBrake(false)}
          onTouchStart={(e) => { e.preventDefault(); setBrake(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setBrake(false); }}
        >
          <span className="text-2xl font-black">刹车</span>
          <span className="text-xs opacity-75">BRAKE</span>
        </button>

        <button
          className={`flex-1 rounded-xl flex flex-col items-center justify-center border-b-4 transition-all active:border-b-0 active:translate-y-1 ${
             gas 
             ? 'bg-green-600 border-green-800 text-white shadow-[0_0_15px_rgba(22,163,74,0.6)]' 
             : 'bg-gray-700 border-gray-900 text-gray-400'
          }`}
          onMouseDown={() => setGas(true)}
          onMouseUp={() => setGas(false)}
          onTouchStart={(e) => { e.preventDefault(); setGas(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setGas(false); }}
        >
          <span className="text-2xl font-black">油门</span>
          <span className="text-xs opacity-75">GAS</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;
