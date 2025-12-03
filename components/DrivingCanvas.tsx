import React, { useEffect, useRef, useState } from 'react';
import { CarState, GameMap, Gear, Point, MapObstacle } from '../types';
import { CAR_LENGTH, CAR_WIDTH, WHEELBASE, MAX_STEERING_ANGLE, MAX_SPEED, ACCELERATION, FRICTION } from '../constants';

interface DrivingCanvasProps {
  map: GameMap;
  controlState: {
    gas: boolean;
    brake: boolean;
    steering: number; // -1 to 1
    gear: Gear;
  };
  onStateUpdate: (state: CarState) => void;
  onCrash: () => void;
  onSuccess: () => void;
  resetTrigger: number;
}

const DrivingCanvas: React.FC<DrivingCanvasProps> = ({
  map,
  controlState,
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
  }, [map, resetTrigger]);

  // Physics Loop
  useEffect(() => {
    let animationFrameId: number;

    const updatePhysics = () => {
      // Stop physics loop updates if crashed/success to freeze the moment, 
      // but we still want to render the red car, so we just return car state.
      // However, to allow re-render, we do setCar but with no position change logic if crashed.
      
      setCar(prevCar => {
        if (prevCar.crashed || prevCar.success) return prevCar;

        let newSpeed = prevCar.speed;
        let newAngle = prevCar.angle;
        let newX = prevCar.x;
        let newY = prevCar.y;

        // 1. Calculate Target Speed
        let targetSpeed = 0;
        if (controlState.gear === Gear.D) {
            if (controlState.gas) targetSpeed = MAX_SPEED;
            else targetSpeed = 0; // Auto-brake/creep logic could go here, simplified to stop without gas
        } else if (controlState.gear === Gear.R) {
            if (controlState.gas) targetSpeed = -MAX_SPEED;
            else targetSpeed = 0;
        }

        // 2. Apply Acceleration/Friction
        if (controlState.brake) {
          if (newSpeed > 0) newSpeed = Math.max(0, newSpeed - ACCELERATION * 2);
          else if (newSpeed < 0) newSpeed = Math.min(0, newSpeed + ACCELERATION * 2);
        } else {
          if (newSpeed < targetSpeed) newSpeed = Math.min(targetSpeed, newSpeed + ACCELERATION);
          else if (newSpeed > targetSpeed) newSpeed = Math.max(targetSpeed, newSpeed - ACCELERATION);
        }

        // Apply friction if no input
        if (!controlState.gas && !controlState.brake) {
           if (newSpeed > 0) newSpeed = Math.max(0, newSpeed - FRICTION);
           else if (newSpeed < 0) newSpeed = Math.min(0, newSpeed + FRICTION);
        }

        // 3. Steering Geometry (Ackermann simplified)
        // Actual steering angle from input
        const targetSteeringAngle = controlState.steering * MAX_STEERING_ANGLE;
        
        // Move car
        if (Math.abs(newSpeed) > 0.01) {
            // Angular velocity = speed / turning_radius
            // turning_radius = wheelbase / tan(steering_angle)
            // angular_velocity = (speed * tan(steering_angle)) / wheelbase
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

        // Collision Detection
        if (checkCollision(nextState, map.obstacles)) {
           nextState.crashed = true;
           onCrash();
        }

        // Success Detection
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
  }, [controlState, map, onCrash, onSuccess, car.crashed, car.success]);

  // Report state up to parent for AI analysis periodically or on change
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

    // Draw Map Background
    ctx.fillStyle = '#374151'; // Asphalt color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle) to help judge speed
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<600; i+=50) {
        ctx.moveTo(i, 0); ctx.lineTo(i, 600);
        ctx.moveTo(0, i); ctx.lineTo(600, i);
    }
    ctx.stroke();

    // Draw Obstacles/Lines
    map.obstacles.forEach(obs => {
      ctx.beginPath();
      ctx.lineWidth = 4;
      if (obs.type === 'line') {
        ctx.strokeStyle = '#FCD34D'; // Yellow lines
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        obs.points.forEach((p, i) => {
           if (i === 0) ctx.moveTo(p.x, p.y);
           else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      } else if (obs.type === 'target') {
         ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
         obs.points.forEach(p => {
             ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
         });
      }
    });

    // Draw Target Zone (Ghost)
    if (map.targetZone.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)'; // Green transparent
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        map.targetZone.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';
        ctx.fill();
    }

    // Draw Car
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Car Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // Car Body
    ctx.fillStyle = car.crashed ? '#EF4444' : (car.success ? '#10B981' : '#3B82F6');
    ctx.fillRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH);
    
    // Windshield (Front)
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(0, -CAR_WIDTH/2 + 2, CAR_LENGTH/4, CAR_WIDTH - 4);
    
    // Rear Window
    ctx.fillRect(-CAR_LENGTH/2 + 5, -CAR_WIDTH/2 + 2, 8, CAR_WIDTH - 4);

    ctx.shadowColor = 'transparent';

    // Headlights
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(CAR_LENGTH/2 - 2, -CAR_WIDTH/2 + 2, 2, 6);
    ctx.fillRect(CAR_LENGTH/2 - 2, CAR_WIDTH/2 - 8, 2, 6);

    // Tail lights
    ctx.fillStyle = '#991B1B';
    ctx.fillRect(-CAR_LENGTH/2, -CAR_WIDTH/2 + 2, 2, 6);
    ctx.fillRect(-CAR_LENGTH/2, CAR_WIDTH/2 - 8, 2, 6);

    // Wheels
    ctx.fillStyle = '#111827';
    // Front Wheels (Rotate with steering)
    const wheelL = CAR_LENGTH / 5;
    const wheelW = CAR_WIDTH / 5;
    const wheelOffX = WHEELBASE / 2;
    const wheelOffY = CAR_WIDTH / 2;
    
    // Front Left
    ctx.save();
    ctx.translate(wheelOffX, -wheelOffY);
    ctx.rotate(car.steeringAngle);
    ctx.fillRect(-wheelL/2, -wheelW/2, wheelL, wheelW);
    ctx.restore();

    // Front Right
    ctx.save();
    ctx.translate(wheelOffX, wheelOffY);
    ctx.rotate(car.steeringAngle);
    ctx.fillRect(-wheelL/2, -wheelW/2, wheelL, wheelW);
    ctx.restore();

    // Rear Wheels (Fixed)
    ctx.fillRect(-wheelOffX - wheelL/2, -wheelOffY - wheelW/2, wheelL, wheelW); // RL
    ctx.fillRect(-wheelOffX - wheelL/2, wheelOffY - wheelW/2, wheelL, wheelW); // RR

    // Side Mirrors (Tiny boxes)
    ctx.fillStyle = car.crashed ? '#EF4444' : '#3B82F6';
    ctx.fillRect(wheelOffX - 10, -wheelOffY - 4, 6, 4); // Left mirror
    ctx.fillRect(wheelOffX - 10, wheelOffY, 6, 4); // Right mirror

    ctx.restore();

  }, [car, map]);

  return (
    <canvas 
        ref={canvasRef} 
        width={600} 
        height={600} 
        className="w-full max-w-[600px] aspect-square bg-gray-800 rounded-lg shadow-xl touch-none ring-1 ring-gray-700"
    />
  );
};

// --- Physics Helper Functions ---

function checkCollision(car: CarState, obstacles: MapObstacle[]): boolean {
    const carCorners = getCarCorners(car);
    
    // 1. Check if car corners hit any lines
    for (const obs of obstacles) {
        if (obs.type === 'line') {
            for (let i = 0; i < obs.points.length - 1; i++) {
                const p1 = obs.points[i];
                const p2 = obs.points[i+1];
                // Check intersection between car edges and line segment p1-p2
                for (let j = 0; j < 4; j++) {
                    const c1 = carCorners[j];
                    const c2 = carCorners[(j+1)%4];
                    if (linesIntersect(p1, p2, c1, c2)) return true;
                }
            }
        }
    }
    return false;
}

function checkSuccess(car: CarState, zone: Point[]): boolean {
    if (zone.length < 3) return false;
    // Check if car is stopped and mostly inside the polygon
    // For simplicity: Check if center is inside and speed is near 0
    if (Math.abs(car.speed) > 0.1) return false;

    // Strict mode: Check all corners
    const corners = getCarCorners(car);
    return corners.every(c => isPointInPolygon(c, zone));
}

function getCarCorners(car: CarState): Point[] {
    const halfL = CAR_LENGTH / 2;
    const halfW = CAR_WIDTH / 2;
    
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);

    // FL, FR, BR, BL relative to center unrotated
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
        
        const intersect = ((yi > p.y) !== (yj > p.y))
            && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export default DrivingCanvas;