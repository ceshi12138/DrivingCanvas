import React, { useEffect, useRef, useState } from 'react';
import { CarState, GameMap, Gear, Point, MapObstacle, Difficulty, BlinkerState } from '../types';
import { CAR_LENGTH, CAR_WIDTH, WHEELBASE, MAX_STEERING_ANGLE, MAX_SPEED, ACCELERATION, FRICTION } from '../constants';

interface DrivingCanvasProps {
  map: GameMap;
  controlState: {
    gas: boolean;
    brake: boolean;
    steering: number; // -1 to 1
    gear: Gear;
    blinker: BlinkerState;
  };
  difficulty: Difficulty;
  onStateUpdate: (state: CarState) => void;
  onCrash: (reason: string) => void;
  onSuccess: () => void;
  resetTrigger: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
    color: string;
}

interface TireTrack {
    x: number;
    y: number;
    angle: number;
    id: number; // to group segments
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
  
  // Visual Effects State
  const tracksRef = useRef<TireTrack[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const confettiRef = useRef<Particle[]>([]);
  const frameCount = useRef(0);

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
    tracksRef.current = [];
    particlesRef.current = [];
    confettiRef.current = [];
  }, [map, resetTrigger]);

  // Physics & VFX Loop
  useEffect(() => {
    let animationFrameId: number;

    const updatePhysics = () => {
      frameCount.current++;
      
      // Update Particles
      // Exhaust
      if (!car.crashed && !car.success && car.gear !== Gear.P && Math.random() > 0.7) {
          const cos = Math.cos(car.angle);
          const sin = Math.sin(car.angle);
          // Eject from rear
          const exX = car.x - (CAR_LENGTH/2) * cos;
          const exY = car.y - (CAR_LENGTH/2) * sin;
          particlesRef.current.push({
              x: exX, y: exY,
              vx: -cos * car.speed + (Math.random()-0.5),
              vy: -sin * car.speed + (Math.random()-0.5),
              life: 1.0,
              size: 2 + Math.random() * 3,
              color: 'rgba(100,100,100,'
          });
      }
      
      // Update particles physics
      particlesRef.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
          p.size += 0.1;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Confetti logic
      if (car.success) {
          if (confettiRef.current.length < 100) {
              // Spawn confetti
              confettiRef.current.push({
                  x: 300, y: 300,
                  vx: (Math.random() - 0.5) * 10,
                  vy: (Math.random() - 0.5) * 10,
                  life: 1.0,
                  size: 5 + Math.random() * 5,
                  color: `hsl(${Math.random()*360}, 80%, 60%)`
              });
          }
          confettiRef.current.forEach(p => {
              p.x += p.vx;
              p.y += p.vy;
              p.vy += 0.2; // gravity
              p.life -= 0.005;
          });
          confettiRef.current = confettiRef.current.filter(p => p.life > 0);
      }

      setCar(prevCar => {
        // If crashed or success, stop physics but allow VFX to render
        if (prevCar.crashed || prevCar.success) return prevCar;

        let newSpeed = prevCar.speed;
        let newAngle = prevCar.angle;
        let newX = prevCar.x;
        let newY = prevCar.y;

        // 1. Calculate Target Speed
        let targetSpeed = 0;
        if (controlState.gear === Gear.D) {
            if (controlState.gas) targetSpeed = MAX_SPEED;
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

            // Add Tire Tracks
            if (frameCount.current % 3 === 0) {
                 tracksRef.current.push({ x: newX, y: newY, angle: newAngle, id: 0 });
                 if (tracksRef.current.length > 500) tracksRef.current.shift(); // Limit history
            }
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
  }, [controlState, map, onCrash, onSuccess, car.crashed, car.success, difficulty, car.gear, car.angle, car.speed, car.x, car.y]);

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
    ctx.fillStyle = '#e2e8f0'; // Concrete color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<600; i+=50) {
        ctx.moveTo(i, 0); ctx.lineTo(i, 600);
        ctx.moveTo(0, i); ctx.lineTo(600, i);
    }
    ctx.stroke();

    // --- Tire Tracks ---
    if (tracksRef.current.length > 0) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 6;
        
        // Rear Left Path
        ctx.beginPath();
        tracksRef.current.forEach((t, i) => {
            const lx = t.x + Math.cos(t.angle + Math.PI/2) * (CAR_WIDTH/2 - 5);
            const ly = t.y + Math.sin(t.angle + Math.PI/2) * (CAR_WIDTH/2 - 5);
            // Move back to rear axle
            const rlx = lx - Math.cos(t.angle) * (WHEELBASE/2);
            const rly = ly - Math.sin(t.angle) * (WHEELBASE/2);
            if (i===0) ctx.moveTo(rlx, rly); else ctx.lineTo(rlx, rly);
        });
        ctx.stroke();

        // Rear Right Path
        ctx.beginPath();
        tracksRef.current.forEach((t, i) => {
            const rx = t.x + Math.cos(t.angle - Math.PI/2) * (CAR_WIDTH/2 - 5);
            const ry = t.y + Math.sin(t.angle - Math.PI/2) * (CAR_WIDTH/2 - 5);
             // Move back to rear axle
            const rrx = rx - Math.cos(t.angle) * (WHEELBASE/2);
            const rry = ry - Math.sin(t.angle) * (WHEELBASE/2);
            if (i===0) ctx.moveTo(rrx, rry); else ctx.lineTo(rrx, rry);
        });
        ctx.stroke();
        ctx.restore();
    }

    // --- Map Elements ---
    map.obstacles.forEach(obs => {
      if (obs.type === 'line') {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 6;
        obs.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x+1, p.y+1); else ctx.lineTo(p.x+1, p.y+1); });
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#facc15';
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

    if (map.targetZone.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        map.targetZone.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        ctx.fill();
    }

    if (difficulty === 'easy' && !car.crashed) {
        drawTrajectory(ctx, car);
    }

    // --- Particles (Exhaust) ---
    particlesRef.current.forEach(p => {
        ctx.beginPath();
        ctx.fillStyle = `${p.color}${p.life})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    });

    // --- Car ---
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    // Body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    roundRect(ctx, -CAR_LENGTH/2, -CAR_WIDTH/2, CAR_LENGTH, CAR_WIDTH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    // Roof / Windows
    ctx.fillStyle = '#bae6fd'; 
    ctx.fillRect(5, -CAR_WIDTH/2 + 2, 10, CAR_WIDTH - 4);
    ctx.fillRect(-CAR_LENGTH/2 + 5, -CAR_WIDTH/2 + 2, 8, CAR_WIDTH - 4);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(-15, -CAR_WIDTH/2 + 2, 18, CAR_WIDTH - 4);

    ctx.fillStyle = '#3b82f6'; 
    ctx.fillRect(-10, -CAR_WIDTH/2 + 2, 30, CAR_WIDTH - 4);

    // Lights
    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(CAR_LENGTH/2 - 2, -CAR_WIDTH/2 + 3, 2, 8);
    ctx.fillRect(CAR_LENGTH/2 - 2, CAR_WIDTH/2 - 11, 2, 8);
    // Tail lights (Brake Logic)
    ctx.fillStyle = controlState.brake ? '#ff0000' : '#880000';
    ctx.shadowColor = controlState.brake ? '#ff0000' : 'transparent';
    ctx.shadowBlur = controlState.brake ? 10 : 0;
    ctx.fillRect(-CAR_LENGTH/2, -CAR_WIDTH/2 + 3, 2, 8);
    ctx.fillRect(-CAR_LENGTH/2, CAR_WIDTH/2 - 11, 2, 8);
    ctx.shadowBlur = 0;

    // Blinkers
    const blinkOn = Math.floor(Date.now() / 300) % 2 === 0;
    if (blinkOn) {
        ctx.fillStyle = '#fbbf24'; // Amber
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        
        if (controlState.blinker === 'left') {
            // Front Left
            ctx.fillRect(CAR_LENGTH/2 - 4, -CAR_WIDTH/2, 4, 4);
            // Rear Left
            ctx.fillRect(-CAR_LENGTH/2, -CAR_WIDTH/2, 4, 4);
        } else if (controlState.blinker === 'right') {
             // Front Right
             ctx.fillRect(CAR_LENGTH/2 - 4, CAR_WIDTH/2 - 4, 4, 4);
             // Rear Right
             ctx.fillRect(-CAR_LENGTH/2, CAR_WIDTH/2 - 4, 4, 4);
        }
        ctx.shadowBlur = 0;
    }

    // Wheels
    ctx.fillStyle = '#1e293b'; 
    const wheelL = 14;
    const wheelW = 7;
    const wheelOffX = WHEELBASE / 2;
    const wheelOffY = CAR_WIDTH / 2 - 2; 
    
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

    ctx.fillRect(-wheelOffX - wheelL/2, -wheelOffY - wheelW/2, wheelL, wheelW);
    ctx.fillRect(-wheelOffX - wheelL/2, wheelOffY - wheelW/2, wheelL, wheelW);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#94a3b8';
    ctx.fillRect(wheelOffX - 8, -wheelOffY - 8, 8, 5);
    ctx.strokeRect(wheelOffX - 8, -wheelOffY - 8, 8, 5);
    ctx.fillRect(wheelOffX - 8, wheelOffY + 3, 8, 5); 
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

    // --- Confetti ---
    confettiRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

  }, [car, map, crashPoint, difficulty, controlState.brake, controlState.blinker]);

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
        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.angle);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.moveTo(WHEELBASE/2, -CAR_WIDTH/2);
        ctx.lineTo(WHEELBASE/2 + 100, -CAR_WIDTH/2);
        ctx.moveTo(WHEELBASE/2, CAR_WIDTH/2);
        ctx.lineTo(WHEELBASE/2 + 100, CAR_WIDTH/2);
        
        ctx.stroke();
        ctx.restore();
        return;
    }

    const R = WHEELBASE / Math.tan(car.steeringAngle);
    
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    const cx = -WHEELBASE / 2;
    const cy = R;

    const frX = WHEELBASE/2;
    const frY = CAR_WIDTH/2;
    const radiusFR = Math.sqrt(Math.pow(frX - cx, 2) + Math.pow(frY - cy, 2));
    
    const flX = WHEELBASE/2;
    const flY = -CAR_WIDTH/2;
    const radiusFL = Math.sqrt(Math.pow(flX - cx, 2) + Math.pow(flY - cy, 2));

    const angleFR = Math.atan2(frY - cy, frX - cx);
    const angleFL = Math.atan2(flY - cy, flX - cx);

    const arcLen = car.gear === Gear.R ? -1.0 : 1.0; 

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.arc(cx, cy, radiusFR, angleFR, angleFR + (car.steeringAngle > 0 ? arcLen : -arcLen) * (car.steeringAngle > 0 ? 1 : -1), car.gear === Gear.R ? car.steeringAngle > 0 : car.steeringAngle < 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radiusFL, angleFL, angleFL + (car.steeringAngle > 0 ? arcLen : -arcLen) * (car.steeringAngle > 0 ? 1 : -1), car.gear === Gear.R ? car.steeringAngle > 0 : car.steeringAngle < 0);
    ctx.stroke();

    ctx.restore();
}

function checkCollision(car: CarState, obstacles: MapObstacle[], tolerance: number): Point | null {
    const carCorners = getCarCorners(car, -tolerance);
    
    for (const obs of obstacles) {
        if (obs.type === 'line') {
            for (let i = 0; i < obs.points.length - 1; i++) {
                const p1 = obs.points[i];
                const p2 = obs.points[i+1];
                for (let j = 0; j < 4; j++) {
                    const c1 = carCorners[j];
                    const c2 = carCorners[(j+1)%4];
                    if (linesIntersect(p1, p2, c1, c2)) {
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