import { GoogleGenAI } from "@google/genai";
import { CarState, GameMap, Gear } from '../types';

let genAI: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
};

export const getInstructorFeedback = async (
  carState: CarState,
  map: GameMap,
  recentAction: string
): Promise<string> => {
  if (!genAI) {
    return "AI 教练未连接 (请检查 API Key)";
  }

  // Optimize token usage by sending concise data
  const prompt = `
    你是中国驾校的"科目二"严厉教练。
    当前项目：${map.name}。
    车辆状态：
    - 档位: ${carState.gear}
    - 速度: ${carState.speed.toFixed(1)}
    - 方向盘角度: ${Math.round(carState.steeringAngle * (180 / Math.PI))}度 (负左正右)
    - 车头角度: ${Math.round(carState.angle * (180 / Math.PI))}度
    - 是否压线/碰撞: ${carState.crashed ? "是 (已挂科)" : "否"}
    - 任务是否完成: ${carState.success ? "是 (通过)" : "进行中"}

    用户最近的操作: ${recentAction}

    请给出简短、犀利的指导意见（不超过50字）。如果挂科了，严厉指出原因。如果操作正确，给出下一步提示。使用中文。
  `;

  try {
    const model = 'gemini-2.5-flash';
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      }
    });

    return response.text || "保持专注，观察后视镜。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "信号不好，听不清教练说什么...";
  }
};
