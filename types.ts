export enum Gear {
  P = 'P', // Park
  D = 'D', // Drive
  R = 'R', // Reverse
  N = 'N'  // Neutral
}

export enum ExamProject {
  ReverseParking = 'ReverseParking', // 倒车入库
  SideParking = 'SideParking', // 侧方停车
  CurveDriving = 'CurveDriving', // 曲线行驶
  RightAngleTurn = 'RightAngleTurn' // 直角转弯
}

export interface Point {
  x: number;
  y: number;
}

export interface CarState {
  x: number;
  y: number;
  angle: number; // in radians
  steeringAngle: number; // in radians, negative = left, positive = right
  speed: number;
  gear: Gear;
  crashed: boolean;
  success: boolean;
}

export interface MapObstacle {
  points: Point[]; // Polygon vertices
  type: 'wall' | 'line' | 'target';
  label?: string;
}

export interface GameMap {
  name: string;
  project: ExamProject;
  startPosition: { x: number; y: number; angle: number };
  obstacles: MapObstacle[];
  targetZone: Point[]; // Polygon defining the success area
  description: string;
  tips: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
