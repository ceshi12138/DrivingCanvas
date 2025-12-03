import React, { useEffect, useState, useRef } from 'react';
import { Bot, Volume2, VolumeX } from 'lucide-react';
import { CarState, GameMap, ChatMessage } from '../types';
import { getInstructorFeedback } from '../services/geminiService';

interface AITutorProps {
  carState: CarState;
  map: GameMap;
}

const AITutor: React.FC<AITutorProps> = ({ carState, map }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `你好！我是你的科目二AI教练。我们现在开始练习【${map.name}】。${map.description}` }
  ]);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  
  // Ref to track last advice time/state to prevent spamming API
  const lastCallTime = useRef<number>(0);
  const lastStateHash = useRef<string>("");

  // Auto-scroll
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting when map changes
  useEffect(() => {
     setMessages([{ role: 'model', text: `准备好了吗？现在开始【${map.name}】。请系好安全带，挂D档或R档出发。` }]);
  }, [map]);

  // Trigger feedback based on events
  useEffect(() => {
    const checkAndAskAI = async () => {
      const now = Date.now();
      
      // Conditions to trigger AI:
      // 1. Crash
      // 2. Success
      // 3. Significant movement interval (e.g. every 5 seconds if moving)
      // 4. Manual request (not impl here, auto only)

      let triggerReason = "";
      if (carState.crashed && !lastStateHash.current.includes("crash")) {
          triggerReason = "车撞墙/压线了";
      } else if (carState.success && !lastStateHash.current.includes("success")) {
          triggerReason = "任务成功";
      } else if (carState.speed !== 0 && now - lastCallTime.current > 5000) {
          triggerReason = "正常行驶检查";
      }

      if (triggerReason) {
        lastCallTime.current = now;
        lastStateHash.current = `${carState.crashed ? 'crash' : ''}-${carState.success ? 'success' : ''}`;
        
        setLoading(true);
        const advice = await getInstructorFeedback(carState, map, triggerReason);
        setMessages(prev => [...prev, { role: 'model', text: advice }]);
        setLoading(false);

        // Simple TTS
        if (!muted && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(advice);
            utterance.lang = 'zh-CN';
            utterance.rate = 1.2;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }
      }
    };

    checkAndAskAI();
  }, [carState, map, muted]);

  return (
    <div className="absolute top-4 right-4 w-64 md:w-80 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[40vh] md:max-h-[60vh] z-50 transition-all">
      {/* Header */}
      <div className="bg-blue-600 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold">
            <Bot size={20} />
            <span>AI 教练</span>
        </div>
        <button 
            onClick={() => setMuted(!muted)}
            className="text-white/80 hover:text-white"
        >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Chat Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-2 text-sm ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-100 border border-gray-600'
                }`}>
                    {msg.text}
                </div>
            </div>
        ))}
        {loading && (
            <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg p-2 text-xs text-gray-400 animate-pulse">
                    正在分析你的操作...
                </div>
            </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="p-2 bg-gray-800 text-xs text-gray-500 text-center border-t border-gray-700">
        AI基于Gemini模型实时指导
      </div>
    </div>
  );
};

export default AITutor;
