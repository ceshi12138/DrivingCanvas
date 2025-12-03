import React, { useRef, useEffect } from 'react';
import { CarState, GameMap, Point } from '../types';
import { CAR_LENGTH } from '../constants';

interface DriverViewProps {
  carState: CarState;
  map: GameMap;
}

const DriverView: React.FC<DriverViewProps> = ({ carState, map }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const FOV = 180; 
    const CAMERA_HEIGHT = 12; // Lower is more realistic for sedan
    
    // Driver position relative to car center (Left hand drive)
    // Car faces 0 rads = East. 
    // Driver is at x: -5 (slightly back), y: -10 (Left side)
    const DRIVER_OFFSET_X = -5;
    const DRIVER_OFFSET_Y = -10;

    const project = (px: number, py: number): Point | null => {
        // Transform world point to camera local space
        const dx = px - carState.x;
        const dy = py - carState.y;
        
        // Rotate to match car heading
        // Car angle is rotation from East.
        // We want X to be Forward, Y to be Left/Right for calculations initially
        const cos = Math.cos(carState.angle);
        const sin = Math.sin(carState.angle);
        
        // Forward component (Project onto car forward vector)
        // Vector is (cos, sin)
        const forwardDist = dx * cos + dy * sin;
        
        // Right component (Project onto car right vector)
        // Right vector is (sin, -cos)
        const rightDist = dx * sin - dy * cos;

        // Apply Driver Offset
        const localZ = forwardDist - DRIVER_OFFSET_X;
        const localX = rightDist - DRIVER_OFFSET_Y;

        // Clip objects behind camera or too close
        if (localZ < 5) return null;

        // Perspective Projection
        // Screen X = (localX / localZ) * scale
        // Screen Y = (height / localZ) * scale
        const scale = FOV / localZ;
        
        // Canvas Coord System: Center is (W/2, H/2)
        // localX is Right+, so add to W/2
        // Camera Height is Up+, so subtract from H/2 (screen Y goes down)
        const screenX = W / 2 + localX * scale;
        const screenY = H / 2 + (CAMERA_HEIGHT * scale); 

        return { x: screenX, y: screenY };
    };

    // --- Render ---
    ctx.clearRect(0, 0, W, H);

    // Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, H/2);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#93c5fd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H/2);
    
    // Ground
    ctx.fillStyle = '#9ca3af'; // Concrete
    ctx.fillRect(0, H/2, W, H/2);

    // Horizon
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(0, H/2); ctx.lineTo(W, H/2);
    ctx.stroke();

    // Map Objects
    ctx.lineCap = 'round';
    map.obstacles.forEach(obs => {
        // Draw Lines
        if (obs.type === 'line') {
             ctx.beginPath();
             ctx.strokeStyle = '#fbbf24'; // Yellow line
             ctx.lineWidth = 3;
             let started = false;

             for (let i = 0; i < obs.points.length; i++) {
                 const p = project(obs.points[i].x, obs.points[i].y);
                 if (p) {
                     if (!started) { ctx.moveTo(p.x, p.y); started = true; }
                     else { ctx.lineTo(p.x, p.y); }
                 } else {
                     started = false; // Break line if point is behind
                 }
             }
             ctx.stroke();
        }
        // Draw Target Marker (The Inner Corner)
        if (obs.type === 'target') {
             const p = project(obs.points[0].x, obs.points[0].y);
             if (p) {
                 ctx.fillStyle = '#ef4444';
                 ctx.beginPath();
                 ctx.arc(p.x, p.y - 5, 4, 0, Math.PI*2); // Float slightly
                 ctx.fill();
             }
        }
    });

    // Car Hood (Static overlay)
    ctx.fillStyle = '#f8fafc'; // White
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    // Hood shape roughly matching perspective
    ctx.moveTo(0, H);
    ctx.quadraticCurveTo(W * 0.2, H - 30, W * 0.4, H - 35); // Left bump
    ctx.lineTo(W * 0.6, H - 35);
    ctx.quadraticCurveTo(W * 0.8, H - 30, W, H); // Right bump
    ctx.fill();
    ctx.stroke();

    // Dashboard
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, H - 15, W, 15);
    
    // Wipers hint
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W*0.2, H-10); ctx.lineTo(W*0.4, H-30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*0.5, H-10); ctx.lineTo(W*0.75, H-30); ctx.stroke();


  }, [carState, map]);

  return (
    <div className="absolute top-4 right-4 z-30 w-56 h-36 bg-gray-800 rounded-lg border-2 border-gray-600 shadow-2xl overflow-hidden hidden md:block transition-opacity hover:opacity-100 opacity-90">
        <canvas ref={canvasRef} width={224} height={144} className="w-full h-full" />
        <div className="absolute top-1 left-1 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
            驾驶视角 (车头)
        </div>
        <div className="absolute bottom-1 right-1 text-[8px] text-white/50 px-1">
             参考引擎盖遮线
        </div>
    </div>
  );
};

export default DriverView;