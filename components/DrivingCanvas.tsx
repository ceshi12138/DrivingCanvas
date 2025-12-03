import React, { useEffect, useRef, useState } from 'react';
import { CarState, GameMap, Gear, Point, MapObstacle, Difficulty } from '../types';
import { CAR_LENGTH, CAR_WIDTH, WHEELBASE, MAX_STEERING_ANGLE, MAX_SPEED, ACCELERATION, FRICTION } from '../constants';

interface DrivingCanvasProps {
  map: GameMap;
  controlState: {
    gas: boolean;
    brake: boolean;
    steering: number; // -1 to 1
    gear: Gear;
  };
  difficulty: Difficulty;
  onStateUpdate: (state: CarState) => void;
  onCrash: (reason: string) => void;
  onSuccess: () => void;
  resetTrigger: number;
}

const DrivingCanvas: React.FC<DrivingCanvasProps> = ({
  map,
  controlState,
  difficulty,
  onStateUpdate,
  onCrash,
  onSuccess,
  resetTrigger
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [car, setCar] = useState<CarState>({
    ...map.startPosition,
    steeringAngle: 0,
    speed: 0,
    gear: Gear.P,
    crashed: false,
    success: false
  });
  const [crashPoint, setCrashPoint] = useState<Point | null>(null);

  // Reset logic
  useEffect(() => {
    setCar({
      ...map.startPosition,
      steeringAngle: 0,
      speed: 0,
      gear: Gear.P,
      crashed: false,
      success: false
    });
    setCrashPoint(null);
  }, [map, resetTrigger]);

  // Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const updatePhysics = () => {
      setCar(prevCar => {
        // If crashed or success, stop physics (freeze)
        if (prevCar.crashed || prevCar.success) return prevCar;

        let newSpeed = prevCar.speed;
        let newAngle = prevCar.angle;
        let newX = prevCar.x;
        let newY = prevCar.y;

        // 1. Calculate Target Speed
        let targetSpeed = 0;
        if (controlState.gear === Gear.D) {
            if (controlState.gas) targetSpeed = MAX_SPEED;
            // No auto-creep if gas is off for easier control, or very slight friction
            else targetSpeed = 0; 
        } else if (controlState.gear === Gear.R) {
            if (controlState.gas) targetSpeed = -MAX_SPEED;
            else targetSpeed = 0;
        }

        // 2. Acceleration
        if (controlState.brake) {
          if (newSpeed > 0) newSpeed = Math.max(0, newSpeed - ACCELERATION * 3);
          else if (newSpeed < 0) newSpeed = Math.min(0, newSpeed + ACCELERATION * 3);
        } else {
          if (newSpeed < targetSpeed) newSpeed = Math.min(targetSpeed, newSpeed + ACCELERATION);
          else if (newSpeed > targetSpeed) newSpeed = Math.max(targetSpeed, newSpeed - ACCELERATION);
        }

        // Friction to stop
        if (!controlState.gas && !controlState.brake) {
           if (newSpeed > 0) newSpeed = Math.max(0, newSpeed - FRICTION);
           else if (newSpeed < 0) newSpeed = Math.min(0, newSpeed + FRICTION);
        }

        // 3. Steering (Ackermann simplified)
        const targetSteeringAngle = controlState.steering * MAX_STEERING_ANGLE;
        
        if (Math.abs(newSpeed) > 0.01) {
            const angularVelocity = (newSpeed * Math.tan(targetSteeringAngle)) / WHEELBASE;
            newAngle += angularVelocity;
            newX += Math.cos(newAngle) * newSpeed;
            newY += Math.sin(newAngle) * newSpeed;
        }

        const nextState = {
          ...prevCar,
          x: newX,
          y: newY,
          angle: newAngle,
          speed: newSpeed,
          steeringAngle: targetSteeringAngle,
          gear: controlState.gear
        };

        // Collision Check
        // Difficulty adjustment: Easy mode allows 2px tolerance
        const tolerance = difficulty === 'easy' ? 2 : 0;
        const collision = checkCollision(nextState, map.obstacles, tolerance);
        
        if (collision) {
           nextState.crashed = true;
           setCrashPoint(collision);
           onCrash("压实线 / 撞墙");
        }

        // Success Check
        if (checkSuccess(nextState, map.targetZone)) {
            nextState.success = true;
            onSuccess();
        }

        return nextState;
      });
      
      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    animationFrameId = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(animationFrameId);
  }, [controlState, map, onCrash, onSuccess, car.crashed, car.success, difficulty]);

  // Report state
  useEffect(() => {
    onStateUpdate(car);
  }, [car.x, car.y, car.angle, car.crashed, car.success]);


  // Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Background ---
    ctx.fillStyle = '#e2e8f0'; // Concrete color (Tailwind slate-200)
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<600; i+=50) {
        ctx.moveTo(i, 0); ctx.lineTo(i, 600);
        ctx.moveTo(0, i); ctx.lineTo(600, i);
    }
    ctx.stroke();

    // --- Map Elements ---
    map.obstacles.forEach(obs => {
      if (obs.type === 'line') {
        // Shadow for depth
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 6;
        obs.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x+1, p.y+1); else ctx.lineTo(p.x+1, p.y+1); });
        ctx.stroke();

        // Actual line (Yellow like Chinese exam lines)
        ctx.beginPath();
        ctx.strokeStyle = '#facc15'; // Yellow-400
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        obs.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();
      } else if (obs.type === 'target') {
         ctx.fillStyle = '#ef4444';
         obs.points.forEach(p => ctx.fillRect(p.x - 3, p.y - 3, 6, 6));
      }
    });

    // Target Zone (Green dash)
    if (map.targetZone.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#22c55e'; // Green-500
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        map.targetZone.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.fill();
    }

    // --- Trajectory Lines (Easy Mode Only) ---
    if (difficulty === 'easy' && !car.crashed) {
        drawTrajectory(ctx, car);
    }

    // --- Car ---
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    // Body (White "Training Car")
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8'; // slate-400 border
    ctx.lineWidth = 1;
    // Main chassis
    roundRect(ctx, -CAR_LENGTH/2, -CAR_WIDTH/2, CAR_LENGTH, CAR_WIDTH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // Roof / Windows
    ctx.fillStyle = '#bae6fd'; // light blue tint
    // Windshield
    ctx.fillRect(5, -CAR_WIDTH/2 + 2, 10, CAR_WIDTH - 4);
    // Rear window
    ctx.fillRect(-CAR_LENGTH/2 + 5, -CAR_WIDTH/2 + 2, 8, CAR_WIDTH - 4);
    // Side windows
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(-15, -CAR_WIDTH/2 + 2, 18, CAR_WIDTH - 4);

    // Training Car Stripe (Blue/Orange usually)
    ctx.fillStyle = '#3b82f6'; // Blue stripe
    ctx.fillRect(-10, -CAR_WIDTH/2 + 2, 30, CAR_WIDTH - 4);

    // Lights
    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(CAR_LENGTH/2 - 2, -CAR_WIDTH/2 + 3, 2, 8);
    ctx.fillRect(CAR_LENGTH/2 - 2, CAR_WIDTH/2 - 11, 2, 8);
    // Tail lights
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-CAR_LENGTH/2, -CAR_WIDTH/2 + 3, 2, 8);
    ctx.fillRect(-CAR_LENGTH/2, CAR_WIDTH/2 - 11, 2, 8);

    // Wheels
    ctx.fillStyle = '#1e293b'; // slate-800
    const wheelL = 14;
    const wheelW = 7;
    const wheelOffX = WHEELBASE / 2;
    const wheelOffY = CAR_WIDTH / 2 - 2; // Tucked in slightly
    
    // Front Wheels (Steering)
    ctx.save();
    ctx.translate(wheelOffX, -wheelOffY);
    ctx.rotate(car.steeringAngle);
    ctx.fillRect(-wheelL/2, -wheelW/2, wheelL, wheelW);
    ctx.restore();

    ctx.save();
    ctx.translate(wheelOffX, wheelOffY);
    ctx.rotate(car.steeringAngle);
    ctx.fillRect(-wheelL/2, -wheelW/2, wheelL, wheelW);
    ctx.restore();

    // Rear Wheels
    ctx.fillRect(-wheelOffX - wheelL/2, -wheelOffY - wheelW/2, wheelL, wheelW);
    ctx.fillRect(-wheelOffX - wheelL/2, wheelOffY - wheelW/2, wheelL, wheelW);

    // Mirrors
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8';
    ctx.fillRect(wheelOffX - 8, -wheelOffY - 8, 8, 5); // L
    ctx.strokeRect(wheelOffX - 8, -wheelOffY - 8, 8, 5);
    ctx.fillRect(wheelOffX - 8, wheelOffY + 3, 8, 5); // R
    ctx.strokeRect(wheelOffX - 8, wheelOffY + 3, 8, 5);

    ctx.restore();

    // --- Crash Marker ---
    if (crashPoint) {
        ctx.save();
        ctx.translate(crashPoint.x, crashPoint.y);
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
        ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
        ctx.stroke();
        ctx.restore();
    }

  }, [car, map, crashPoint, difficulty]);

  return (
    <canvas 
        ref={canvasRef} 
        width={600} 
        height={600} 
        className="w-full max-w-[600px] aspect-square bg-slate-200 cursor-crosshair touch-none"
    />
  );
};

// --- Physics Helper Functions ---

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTrajectory(ctx: CanvasRenderingContext2D, car: CarState) {
    if (Math.abs(car.steeringAngle) < 0.05) {
        // Straight lines
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // Blue semi-transparent
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Front Left Wheel Path
        ctx.moveTo(WHEELBASE/2, -CAR_WIDTH/2);
        ctx.lineTo(WHEELBASE/2 + 100, -CAR_WIDTH/2);
        
        // Front Right Wheel Path
        ctx.moveTo(WHEELBASE/2, CAR_WIDTH/2);
        ctx.lineTo(WHEELBASE/2 + 100, CAR_WIDTH/2);
        
        ctx.stroke();
        ctx.restore();
        return;
    }

    // Curved Path (Ackermann)
    // Radius from center of rear axle
    const R = WHEELBASE / Math.tan(car.steeringAngle);
    // Center of rotation (relative to car center)
    // Rear axle is at x = -WHEELBASE/2 (relative to car center)
    // Center of rotation is at ( -WHEELBASE/2, R ) relative to car center
    
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    const cx = -WHEELBASE / 2;
    const cy = R;

    ctx.beginPath();
    ctx.strokeStyle = car.steeringAngle > 0 ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Draw arc for Front Right Wheel
    // Position relative to car center: (WHEELBASE/2, CAR_WIDTH/2)
    const frX = WHEELBASE/2;
    const frY = CAR_WIDTH/2;
    const radiusFR = Math.sqrt(Math.pow(frX - cx, 2) + Math.pow(frY - cy, 2));
    
    // Draw arc for Front Left Wheel
    const flX = WHEELBASE/2;
    const flY = -CAR_WIDTH/2;
    const radiusFL = Math.sqrt(Math.pow(flX - cx, 2) + Math.pow(flY - cy, 2));

    // Determine start/end angles for arc
    // We want to draw 'forward' from the car
    // Car points +X. 
    // If Turning Left (Angle < 0, R < 0): Center is below car (Positive Y in canvas? No, Y is down). 
    // Wait, standard canvas: Y down.
    // If Steer < 0 (Left), tan < 0 -> R < 0. Center is at (RearX, Negative). Up in canvas.
    // If Steer > 0 (Right), tan > 0 -> R > 0. Center is at (RearX, Positive). Down in canvas.
    
    // Let's just draw circle sections
    const startAngle = car.steeringAngle > 0 ? -Math.PI/2 : Math.PI/2;
    const endAngle = startAngle + (car.steeringAngle > 0 ? 1 : -1); 

    // Because we are in car local space, we need to calculate angles relative to the Center of Rotation
    // Vector from Center to Wheel
    const angleFR = Math.atan2(frY - cy, frX - cx);
    const angleFL = Math.atan2(flY - cy, flX - cx);

    // Draw forward arc (approx 1.5 radians length)
    const arcLen = car.gear === Gear.R ? -1.0 : 1.0; 

    ctx.beginPath();
    ctx.arc(cx, cy, radiusFR, angleFR, angleFR + (car.steeringAngle > 0 ? arcLen : -arcLen) * (car.steeringAngle > 0 ? 1 : -1), car.gear === Gear.R ? car.steeringAngle > 0 : car.steeringAngle < 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radiusFL, angleFL, angleFL + (car.steeringAngle > 0 ? arcLen : -arcLen) * (car.steeringAngle > 0 ? 1 : -1), car.gear === Gear.R ? car.steeringAngle > 0 : car.steeringAngle < 0);
    ctx.stroke();

    ctx.restore();
}

// Returns the point of collision or null
function checkCollision(car: CarState, obstacles: MapObstacle[], tolerance: number): Point | null {
    const carCorners = getCarCorners(car, -tolerance); // Shrink car hitbox by tolerance
    
    for (const obs of obstacles) {
        if (obs.type === 'line') {
            for (let i = 0; i < obs.points.length - 1; i++) {
                const p1 = obs.points[i];
                const p2 = obs.points[i+1];
                for (let j = 0; j < 4; j++) {
                    const c1 = carCorners[j];
                    const c2 = carCorners[(j+1)%4];
                    if (linesIntersect(p1, p2, c1, c2)) {
                        // Return approximate intersection point
                        return { x: (c1.x + c2.x)/2, y: (c1.y + c2.y)/2 };
                    }
                }
            }
        }
    }
    return null;
}

function checkSuccess(car: CarState, zone: Point[]): boolean {
    if (zone.length < 3) return false;
    if (Math.abs(car.speed) > 0.1) return false;
    const corners = getCarCorners(car);
    return corners.every(c => isPointInPolygon(c, zone));
}

function getCarCorners(car: CarState, margin: number = 0): Point[] {
    const halfL = CAR_LENGTH / 2 + margin;
    const halfW = CAR_WIDTH / 2 + margin;
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);

    const cornersRel = [
        { x: halfL, y: -halfW },
        { x: halfL, y: halfW },
        { x: -halfL, y: halfW },
        { x: -halfL, y: -halfW }
    ];

    return cornersRel.map(p => ({
        x: car.x + (p.x * cos - p.y * sin),
        y: car.y + (p.x * sin + p.y * cos)
    }));
}

function linesIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
    const det = (b.x - a.x) * (d.y - c.y) - (d.x - c.x) * (b.y - a.y);
    if (det === 0) return false;
    const lambda = ((d.y - c.y) * (d.x - a.x) + (c.x - d.x) * (d.y - a.y)) / det;
    const gamma = ((a.y - b.y) * (d.x - a.x) + (b.x - a.x) * (d.y - a.y)) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

function isPointInPolygon(p: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export default DrivingCanvas;