import { ExamProject, GameMap, Gear } from './types';

// Scale: 1px = ~1.5cm
// Car: Jetta/Santana size (approx 4.5m x 1.8m)
// Scaled: Length ~ 76px, Width ~ 34px
export const CAR_WIDTH = 34;
export const CAR_LENGTH = 76;
export const WHEELBASE = 52;
export const MAX_STEERING_ANGLE = Math.PI / 3.8; // Allow slightly sharper turns for tight maneuvers
export const MAX_SPEED = 1.2; // Slow, creep speed
export const ACCELERATION = 0.03;
export const FRICTION = 0.04;

// 1. Reverse Parking (Dao Che Ru Ku) - STRICT STANDARD
// Garage Width = Car Width + 0.6m (~40px spacing total, 20px each side) -> 34 + 40 = 74px
// Garage Length = Car Length + 0.7m (~46px) -> 76 + 46 = 122px
// Road Width = 1.5 * Car Length = 1.5 * 76 = 114px
const RP_GARAGE_W = 74;
const RP_GARAGE_L = 122;
const RP_ROAD_W = 120; // Slightly rounded
const RP_CONTROL_LINE_Y = 250;
const RP_GARAGE_Y_START = 250 + RP_ROAD_W; // Garage starts after road

export const MAP_REVERSE_PARKING: GameMap = {
  name: "倒车入库",
  project: ExamProject.ReverseParking,
  startPosition: { x: 100, y: 310, angle: 0 }, // Start on left control line
  description: "科目二核心项目。库宽仅车宽+60cm，极度考验点位。",
  tips: [
    "起点：左后视镜下沿压控制线停车",
    "倒库：向右打死，观察右后视镜与库角30cm",
    "入库：车身平行立即回正",
    "微调：哪边宽往哪边打",
    "出库：肩膀/车头盖线向左/右打死"
  ],
  targetZone: [
    { x: 300 - RP_GARAGE_W/2 + 5, y: RP_GARAGE_Y_START + 10 },
    { x: 300 + RP_GARAGE_W/2 - 5, y: RP_GARAGE_Y_START + 10 },
    { x: 300 + RP_GARAGE_W/2 - 5, y: RP_GARAGE_Y_START + RP_GARAGE_L - 10 },
    { x: 300 - RP_GARAGE_W/2 + 5, y: RP_GARAGE_Y_START + RP_GARAGE_L - 10 }
  ],
  obstacles: [
    // Top Control Line (Visual + Hitbox)
    { type: 'line', points: [{ x: 50, y: RP_CONTROL_LINE_Y }, { x: 550, y: RP_CONTROL_LINE_Y }] },
    
    // Road Bottom / Garage Front Line
    { type: 'line', points: [{ x: 50, y: RP_GARAGE_Y_START }, { x: 300 - RP_GARAGE_W/2, y: RP_GARAGE_Y_START }] },
    { type: 'line', points: [{ x: 300 + RP_GARAGE_W/2, y: RP_GARAGE_Y_START }, { x: 550, y: RP_GARAGE_Y_START }] },

    // Garage Walls (U-Shape)
    { 
      type: 'line', 
      points: [
        { x: 300 - RP_GARAGE_W/2, y: RP_GARAGE_Y_START },
        { x: 300 - RP_GARAGE_W/2, y: RP_GARAGE_Y_START + RP_GARAGE_L },
        { x: 300 + RP_GARAGE_W/2, y: RP_GARAGE_Y_START + RP_GARAGE_L },
        { x: 300 + RP_GARAGE_W/2, y: RP_GARAGE_Y_START }
      ]
    },
    
    // Road Top Boundary (Invisible wall usually, but let's draw curb)
    { type: 'line', points: [{ x: 50, y: RP_CONTROL_LINE_Y + 10 }, { x: 550, y: RP_CONTROL_LINE_Y + 10 }] }, 
  ]
};

// 2. Side Parking (Ce Fang Ting Che)
// Garage L = 1.5 * Car Length = 114px
// Garage W = Car Width + 0.8m (~50px spacing) = 84px
const SP_GARAGE_L = 120;
const SP_GARAGE_W = 80;

export const MAP_SIDE_PARKING: GameMap = {
  name: "侧方停车",
  project: ExamProject.SideParking,
  startPosition: { x: 100, y: 500, angle: -Math.PI / 2 },
  description: "标准库位。必须车头完全越过库位再倒车。",
  tips: [
    "领线：右车身距库边线30-50cm",
    "一倒：右后视镜见库前角消失，右打死",
    "二倒：左后视镜见内库角，回正",
    "三倒：左后轮压库边线，左打死"
  ],
  targetZone: [
    { x: 380, y: 150 },
    { x: 380 + SP_GARAGE_W - 10, y: 150 },
    { x: 380 + SP_GARAGE_W - 10, y: 150 + SP_GARAGE_L },
    { x: 380, y: 150 + SP_GARAGE_L }
  ],
  obstacles: [
    // Left Curb (Road edge)
    { type: 'line', points: [{ x: 50, y: 50 }, { x: 50, y: 550 }] },
    
    // Right Curb (Garage Side)
    { type: 'line', points: [{ x: 380, y: 50 }, { x: 380, y: 150 }] }, // Top section
    { type: 'line', points: [{ x: 380, y: 150 + SP_GARAGE_L }, { x: 380, y: 550 }] }, // Bottom section
    
    // The Garage Box
    { 
      type: 'line', 
      points: [
          { x: 380, y: 150 }, 
          { x: 380 + SP_GARAGE_W, y: 150 }, // TR
          { x: 380 + SP_GARAGE_W, y: 150 + SP_GARAGE_L }, // BR
          { x: 380, y: 150 + SP_GARAGE_L } // BL
      ] 
    }
  ]
};

// 3. Curve Driving (S-Curve)
// Lane Width 3.5m ~ 60px
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
    { x: 250, y: 20 }, { x: 350, y: 20 }, { x: 350, y: 60 }, { x: 250, y: 60 }
  ],
  obstacles: [
    // Left Boundary
    {
      type: 'line',
      points: [
        { x: 240, y: 600 },
        { x: 240, y: 450 }, // Straight start
        { x: 120, y: 320 }, // Bulge Left
        { x: 120, y: 220 }, 
        { x: 240, y: 50 }   // Exit Left
      ]
    },
    // Right Boundary (Width ~60px)
    {
      type: 'line',
      points: [
        { x: 360, y: 600 },
        { x: 360, y: 450 },
        { x: 240, y: 320 }, // Inner curve
        { x: 240, y: 220 },
        { x: 360, y: 50 }
      ]
    }
  ]
};

// 4. Right Angle Turn
// Lane Width 3.5m ~ 60px. Left Wall x=300, Right Wall x=360.
// Center = 330.
export const MAP_RIGHT_ANGLE_TURN: GameMap = {
  name: "直角转弯",
  project: ExamProject.RightAngleTurn,
  startPosition: { x: 330, y: 550, angle: -Math.PI / 2 }, // Centered in lane (300+360)/2
  description: "最易压角项目。需贴外线行驶，门把手对齐内角打死。",
  tips: [
    "准备：靠右行驶，右车身距边线30cm",
    "点位：左后视镜/门把手与内直角平齐",
    "动作：向左打死方向盘",
    "完成：车身摆正后回正"
  ],
  targetZone: [
    { x: 50, y: 240 }, { x: 100, y: 240 }, { x: 100, y: 300 }, { x: 50, y: 300 }
  ],
  obstacles: [
    // Outer Wall (Top and Right)
    {
      type: 'line',
      points: [
        { x: 360, y: 600 }, // Start Right Wall
        { x: 360, y: 240 }, // Corner Outer
        { x: 50, y: 240 }   // End Top Wall
      ]
    },
    // Inner Wall (Bottom and Left)
    // Lane width 60px
    {
      type: 'line',
      points: [
        { x: 300, y: 600 }, // Start Left Wall
        { x: 300, y: 300 }, // Corner Inner Start
        { x: 50, y: 300 }   // End Bottom Wall
      ]
    },
    // The Inner Corner Marker for reference
    {
      type: 'target', 
      points: [{x: 300, y: 300}]
    }
  ]
};