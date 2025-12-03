import React, { useState, useEffect } from 'react';
import { CarState, GameMap, Gear } from './types';
import { MAP_REVERSE_PARKING, MAP_SIDE_PARKING, MAP_CURVE, MAP_RIGHT_ANGLE_TURN } from './constants';
import DrivingCanvas from './components/DrivingCanvas';
import Controls from './components/Controls';
import AITutor from './components/AITutor';
import { initializeGemini } from './services/geminiService';
import { Car, Map as MapIcon, ChevronRight } from 'lucide-react';

const MAPS = [MAP_REVERSE_PARKING, MAP_SIDE_PARKING, MAP_CURVE, MAP_RIGHT_ANGLE_TURN];

const App: React.FC = () => {
  // Init Gemini
  useEffect(() => {
    initializeGemini();
  }, []);

  const [currentMap, setCurrentMap] = useState<GameMap>(MAPS[0]);
  const [controlState, setControlState] = useState({
    gas: false,
    brake: false,
    steering: 0,
    gear: Gear.P
  });

  const [gameState, setGameState] = useState<CarState | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleReset = () => {
    setControlState(prev => ({ ...prev, gear: Gear.P, steering: 0, gas: false, brake: false }));
    setResetTrigger(prev => prev + 1);
  };

  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar / Map Selector */}
      <div className="w-full md:w-64 bg-gray-900 border-b md:border-r border-gray-800 flex flex-col z-20 shadow-xl">
        <div className="p-6 border-b border-gray-800 bg-gray-900">
          <h1 className="text-2xl font-black text-blue-500 flex items-center gap-2">
            <Car className="text-white" />
            驾考模拟器
          </h1>
          <p className="text-xs text-gray-500 mt-1">AI 辅助教学系统 - 专业版</p>
        </div>
        
        <div className="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col p-4 gap-2">
          {MAPS.map((m) => (
            <button
              key={m.name}
              onClick={() => {
                setCurrentMap(m);
                handleReset();
              }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all min-w-[160px] md:w-full text-left ${
                currentMap.name === m.name 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${currentMap.name === m.name ? 'bg-blue-500' : 'bg-gray-700'}`}>
                <MapIcon size={18} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{m.name}</div>
                <div className="text-[10px] opacity-70">Project {m.project}</div>
              </div>
              {currentMap.name === m.name && <ChevronRight size={16} />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 hidden md:block">
            <h3 className="font-bold text-gray-400 mb-2">当前项目技巧:</h3>
            <ul className="list-disc pl-4 space-y-1">
                {currentMap.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                ))}
            </ul>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-2 md:p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 to-gray-950">
        
        {/* Game Stats Overlay */}
        {gameState && (
            <div className="absolute top-4 left-4 md:left-8 bg-gray-900/80 backdrop-blur rounded-lg p-2 md:p-4 text-xs md:text-sm border border-gray-700 font-mono text-gray-300 pointer-events-none z-10">
                <div>SPEED: {(gameState.speed * 50).toFixed(1)} km/h</div>
                <div>ANGLE: {(gameState.angle * 57.29).toFixed(1)}°</div>
                <div>X: {gameState.x.toFixed(0)} Y: {gameState.y.toFixed(0)}</div>
            </div>
        )}

        <div className="relative w-full max-w-[600px] flex flex-col gap-4">
            <DrivingCanvas 
                map={currentMap}
                controlState={controlState}
                onStateUpdate={setGameState}
                onCrash={() => {}}
                onSuccess={() => {}}
                resetTrigger={resetTrigger}
            />
            
            <Controls 
                steering={controlState.steering}
                setSteering={(val) => setControlState(prev => ({...prev, steering: val}))}
                gas={controlState.gas}
                setGas={(val) => setControlState(prev => ({...prev, gas: val}))}
                brake={controlState.brake}
                setBrake={(val) => setControlState(prev => ({...prev, brake: val}))}
                gear={controlState.gear}
                setGear={(val) => setControlState(prev => ({...prev, gear: val}))}
                onReset={handleReset}
            />
        </div>

        {/* AI Tutor Floating Window */}
        {gameState && <AITutor carState={gameState} map={currentMap} />}
      </div>
    </div>
  );
};

export default App;