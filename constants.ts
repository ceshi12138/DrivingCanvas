import { ExamProject, GameMap, Gear } from './types';

// Adjusted Scale: Approx 1px = 7-8cm. 
// Car approx 4.8m x 2.4m visual footprint (incl mirrors).

export const CAR_WIDTH = 34;
export const CAR_LENGTH = 70;
export const WHEELBASE = 48;
export const MAX_STEERING_ANGLE = Math.PI / 4; // 45 degrees
export const MAX_SPEED = 1.5; // Slower, precision focused
export const ACCELERATION = 0.04;
export const FRICTION = 0.03;

// Helper to create walls from rects
const createRectWall = (x: number, y: number, w: number, h: number) => {
    return {
        type: 'line' as const,
        points: [
            { x, y },
            { x: x + w, y },
            { x: x + w, y: y + h },
            { x, y: y + h },
            { x, y }
        ]
    };
};

// 1. Reverse Parking (Dao Che Ru Ku) - TIGHTER & HARDER
// Lane width ~1.5x car width. Garage width ~ car width + 60cm scaled.
export const MAP_REVERSE_PARKING: GameMap = {
  name: "倒车入库",
  project: ExamProject.ReverseParking,
  startPosition: { x: 150, y: 350, angle: 0 }, // Starting on left, facing right
  description: "考场级难度。车库仅比车宽多60cm，需精准控制点位。",
  tips: [
    "起点：左后视镜下沿压控制线停车",
    "倒库：向右打死，观察右后视镜与库角距离",
    "修整：哪边宽往哪边打",
    "入库：车身平行立即回正",
    "出库：车头盖线向左/右打死"
  ],
  targetZone: [
    { x: 275, y: 150 },
    { x: 325, y: 150 },
    { x: 325, y: 240 },
    { x: 275, y: 240 }
  ],
  obstacles: [
    // Top boundary line (Control Line)
    { type: 'line', points: [{ x: 50, y: 300 }, { x: 550, y: 300 }] },
    
    // The Garage (Centered horizontally roughly)
    // Garage Width: 50px (Car is 34px). Very tight.
    // Garage Depth: 90px.
    
    // Garage Walls (U-shape)
    {
      type: 'line',
      points: [
        { x: 275, y: 300 }, // Front Left
        { x: 275, y: 150 }, // Back Left
        { x: 325, y: 150 }, // Back Right
        { x: 325, y: 300 }  // Front Right
      ]
    },
    
    // Side limits (Simulating the road curbs)
    { type: 'line', points: [{ x: 50, y: 400 }, { x: 550, y: 400 }] }, // Bottom road edge
    { type: 'line', points: [{ x: 50, y: 300 }, { x: 275, y: 300 }] }, // Top road edge Left
    { type: 'line', points: [{ x: 325, y: 300 }, { x: 550, y: 300 }] }, // Top road edge Right
  ]
};

// 2. Side Parking (Ce Fang Ting Che)
export const MAP_SIDE_PARKING: GameMap = {
  name: "侧方停车",
  project: ExamProject.SideParking,
  startPosition: { x: 100, y: 450, angle: -Math.PI / 2 },
  description: "标准库位。车头入库需压线，倒车注意对角线。",
  tips: [
    "领线：车身距右库边线30cm",
    "一倒：右后视镜见库角消失，右打死",
    "二倒：左后视镜见内库角，回正",
    "三倒：左后轮压库边线，左打死"
  ],
  targetZone: [
    { x: 350, y: 150 },
    { x: 400, y: 150 },
    { x: 400, y: 250 },
    { x: 350, y: 250 }
  ],
  obstacles: [
    // Road
    { type: 'line', points: [{ x: 50, y: 50 }, { x: 50, y: 550 }] }, // Left curb
    { type: 'line', points: [{ x: 350, y: 50 }, { x: 350, y: 150 }] }, // Right curb top
    { type: 'line', points: [{ x: 350, y: 250 }, { x: 350, y: 550 }] }, // Right curb bottom
    
    // Parking Box (Inside curb)
    // Width: 50px, Length: 100px
    { 
      type: 'line', 
      points: [
          { x: 350, y: 150 }, 
          { x: 400, y: 150 }, // Top Right
          { x: 400, y: 250 }, // Bottom Right
          { x: 350, y: 250 } 
      ] 
    },
    // Dashed line logic handled in renderer via targetZone generally, but we need collision line for back
    // { type: 'line', points: [{ x: 400, y: 150 }, { x: 400, y: 250 }] } // Back wall
  ]
};

// 3. Curve Driving (S-Curve)
export const MAP_CURVE: GameMap = {
  name: "曲线行驶",
  project: ExamProject.CurveDriving,
  startPosition: { x: 300, y: 550, angle: -Math.PI / 2 },
  description: "S弯路宽仅3.5米。遵循'左弯贴右，右弯贴左'原则。",
  tips: [
    "进弯：靠右行驶，车头左角对准右边线",
    "左转：保持车头沿边线划弧",
    "换向：回正方向，看车头右角对准左边线",
    "出弯：适时回正"
  ],
  targetZone: [
    { x: 260, y: 20 }, { x: 340, y: 20 }, { x: 340, y: 60 }, { x: 260, y: 60 }
  ],
  obstacles: [
    // Left Boundary (Complex Polygon to make a smooth-ish S)
    {
      type: 'line',
      points: [
        { x: 240, y: 600 },
        { x: 240, y: 450 }, // Straight start
        { x: 140, y: 350 }, // Bulge Left
        { x: 140, y: 250 }, 
        { x: 260, y: 50 }   // Exit Left
      ]
    },
    // Right Boundary (Narrow channel, approx 60px width)
    {
      type: 'line',
      points: [
        { x: 360, y: 600 },
        { x: 360, y: 450 },
        { x: 260, y: 350 }, // Inner curve for first turn
        { x: 260, y: 250 },
        { x: 380, y: 50 }
      ]
    }
  ]
};

// 4. Right Angle Turn (New)
export const MAP_RIGHT_ANGLE_TURN: GameMap = {
  name: "直角转弯",
  project: ExamProject.RightAngleTurn,
  startPosition: { x: 300, y: 550, angle: -Math.PI / 2 },
  description: "看似简单最易压角。需贴外线行驶，门把手对齐内角打死。",
  tips: [
    "准备：靠右行驶，右车身距边线30cm",
    "点位：左后视镜/门把手与内直角平齐",
    "动作：向左打死方向盘",
    "完成：车身摆正后回正"
  ],
  targetZone: [
    { x: 50, y: 250 }, { x: 100, y: 250 }, { x: 100, y: 310 }, { x: 50, y: 310 }
  ],
  obstacles: [
    // Outer Wall (Top and Right)
    {
      type: 'line',
      points: [
        { x: 360, y: 600 }, // Start Right Wall
        { x: 360, y: 250 }, // Corner Outer
        { x: 50, y: 250 }   // End Top Wall
      ]
    },
    // Inner Wall (Bottom and Left) - Creates a 60px wide lane (Car 34px)
    {
      type: 'line',
      points: [
        { x: 240, y: 600 }, // Start Left Wall
        { x: 240, y: 370 }, // Corner Inner Start
        { x: 240, y: 370 }, // Just a point
        { x: 240, y: 310 }, // Inner Corner Y
        { x: 50, y: 310 }   // End Bottom Wall
      ]
    },
    // The Inner Corner "Death Point"
    {
      type: 'target', // Visual marker only
      points: [{x: 240, y: 310}]
    }
  ]
};