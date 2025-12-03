import React, { useState, useEffect } from 'react';
import { CarState, GameMap, Gear, Difficulty, BlinkerState } from './types';
import { MAP_REVERSE_PARKING, MAP_SIDE_PARKING, MAP_CURVE, MAP_RIGHT_ANGLE_TURN } from './constants';
import DrivingCanvas from './components/DrivingCanvas';
import Controls from './components/Controls';
import { Car, Map as MapIcon, ChevronRight, RotateCcw, Trophy, AlertTriangle, Gauge } from 'lucide-react';

const MAPS = [MAP_REVERSE_PARKING, MAP_SIDE_PARKING, MAP_CURVE, MAP_RIGHT_ANGLE_TURN];

const App: React.FC = () => {
  const [currentMap, setCurrentMap] = useState<GameMap>(MAPS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('hard');
  const [controlState, setControlState] = useState<{
    gas: boolean;
    brake: boolean;
    steering: number;
    gear: Gear;
    blinker: BlinkerState;
  }>({
    gas: false,
    brake: false,
    steering: 0,
    gear: Gear.P,
    blinker: 'off'
  });

  const [gameState, setGameState] = useState<CarState | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [examResult, setExamResult] = useState<'passed' | 'failed' | null>(null);
  const [failReason, setFailReason] = useState<string>("");

  const handleReset = () => {
    setControlState(prev => ({ 
        ...prev, 
        gear: Gear.P, 
        steering: 0, 
        gas: false, 
        brake: false, 
        blinker: 'off' 
    }));
    setExamResult(null);
    setFailReason("");
    setResetTrigger(prev => prev + 1);
  };

  const handleCrash = (reason: string) => {
    if (examResult) return;
    setExamResult('failed');
    setFailReason(reason);
  };

  const handleSuccess = () => {
    if (examResult) return;
    setExamResult('passed');
  };

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col md:flex-row overflow-hidden text-slate-800">
      
      {/* Sidebar / Map Selector */}
      <div className="w-full md:w-64 bg-white border-b md:border-r border-gray-200 flex flex-col z-20 shadow-lg">
        <div className="p-5 border-b border-gray-100 bg-white">
          <h1 className="text-xl font-black text-blue-600 flex items-center gap-2">
            <Car className="text-blue-600" />
            科目二模拟
          </h1>
          <p className="text-xs text-gray-400 mt-1 pl-8">真实考场比例还原</p>
        </div>
        
        {/* Difficulty Selector */}
        <div className="p-3 border-b border-gray-100">
            <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                    onClick={() => { setDifficulty('easy'); handleReset(); }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-md transition-all ${difficulty === 'easy' ? 'bg-white shadow text-green-600' : 'text-gray-400'}`}
                >
                    <Gauge size={14} /> 练习模式
                </button>
                <button 
                    onClick={() => { setDifficulty('hard'); handleReset(); }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-md transition-all ${difficulty === 'hard' ? 'bg-white shadow text-red-600' : 'text-gray-400'}`}
                >
                    <AlertTriangle size={14} /> 考试模式
                </button>
            </div>
            {difficulty === 'easy' && (
                <div className="mt-2 text-[10px] text-green-600 text-center bg-green-50 py-1 rounded">
                    已开启辅助线，压线容错增加
                </div>
            )}
        </div>
        
        <div className="flex-1 overflow-x-auto md:overflow-y-auto flex md:flex-col p-2 gap-2">
          {MAPS.map((m) => (
            <button
              key={m.name}
              onClick={() => {
                setCurrentMap(m);
                handleReset();
              }}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all min-w-[150px] md:w-full text-left border ${
                currentMap.name === m.name 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className={`p-2 rounded-md ${currentMap.name === m.name ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                <MapIcon size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{m.name}</div>
              </div>
              {currentMap.name === m.name && <ChevronRight size={14} />}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 text-xs text-gray-600 hidden md:block bg-gray-50">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-1">
                <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                通关秘籍:
            </h3>
            <ul className="list-disc pl-4 space-y-2 leading-relaxed opacity-80">
                {currentMap.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                ))}
            </ul>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-2 md:p-6 bg-slate-200">
        
        {/* Game Stats Overlay */}
        {gameState && (
            <div className="absolute top-4 left-4 md:left-8 bg-white/90 backdrop-blur rounded-lg p-3 text-xs md:text-sm border border-gray-200 font-mono text-gray-600 shadow-sm pointer-events-none z-10 flex gap-4">
                <span>速度: <span className="font-bold text-slate-900">{(Math.abs(gameState.speed) * 30).toFixed(1)}</span> km/h</span>
                <span>角度: <span className="font-bold text-slate-900">{(gameState.angle * 57.29 % 360).toFixed(0)}</span>°</span>
            </div>
        )}

        {/* Result Overlay */}
        {examResult && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10 max-w-sm w-full text-center animate-in zoom-in duration-200">
                    {examResult === 'passed' ? (
                        <>
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trophy size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">考试合格</h2>
                            <p className="text-gray-500 mb-6">完美操作！该项目已掌握。</p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">考试不合格</h2>
                            <p className="text-red-500 font-medium mb-6 bg-red-50 p-2 rounded">{failReason || "压线 / 撞墙"}</p>
                        </>
                    )}
                    
                    <button 
                        onClick={handleReset}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                        <RotateCcw size={20} />
                        重新开始
                    </button>
                </div>
            </div>
        )}

        <div className="relative w-full max-w-[600px] flex flex-col gap-4 shadow-2xl rounded-xl overflow-hidden bg-white">
            <DrivingCanvas 
                map={currentMap}
                controlState={controlState}
                difficulty={difficulty}
                onStateUpdate={setGameState}
                onCrash={handleCrash}
                onSuccess={handleSuccess}
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
                blinker={controlState.blinker}
                setBlinker={(val) => setControlState(prev => ({...prev, blinker: val}))}
                onReset={handleReset}
            />
        </div>
      </div>
    </div>
  );
};

export default App;