'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface CanvasProps {
  isDrawing: boolean;
  onDraw: (data: DrawData) => void;
  onClear: () => void;
  clearCanvas: boolean;
  width?: number;
  height?: number;
  remoteDrawData?: DrawData;
}

export interface DrawData {
  type: 'start' | 'draw' | 'end';
  x: number;
  y: number;
  color: string;
  lineWidth: number;
}

export default function Canvas({ 
  isDrawing, 
  onDraw, 
  onClear,
  clearCanvas, 
  width = 800, 
  height = 600,
  remoteDrawData
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [drawing, setDrawing] = useState<boolean>(false);
  const [color, setColor] = useState<string>('#000000');
  const [lineWidth, setLineWidth] = useState<number>(5);
  
  console.log('Canvas rendered with isDrawing:', isDrawing);
  
  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas resolution to match display size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Scale all drawing operations
    ctx.scale(dpr, dpr);
    
    // Set canvas display size
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Set drawing styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Store context for later use
    ctxRef.current = ctx;
    
    console.log('Canvas initialized with context');
  }, [width, height, color, lineWidth]);
  
  // Clear the canvas
  const clearCanvasFunc = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    
    if (!ctx || !canvas) {
      console.error('Cannot clear canvas - context or canvas is null');
      return;
    }
    
    console.log('Clearing canvas');
    ctx.clearRect(0, 0, width, height);
  }, [width, height]);
  
  // This function is used to handle draw events from other users
  const handleRemoteDraw = useCallback((data: DrawData) => {
    const ctx = ctxRef.current;
    if (!ctx) {
      console.error('Cannot handle remote draw - context is null');
      return;
    }
    
    console.log('Handling remote draw:', data.type, data.x, data.y);
    
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    
    if (data.type === 'start') {
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
    } else if (data.type === 'draw') {
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    } else if (data.type === 'end') {
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
      ctx.closePath();
    }
  }, []);
  
  // Process remote drawing data when it arrives
  useEffect(() => {
    if (remoteDrawData) {
      console.log('Received remote draw data:', remoteDrawData.type);
      handleRemoteDraw(remoteDrawData);
    }
  }, [remoteDrawData, handleRemoteDraw]);
  
  // Update context when color or line width changes
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
  }, [color, lineWidth]);
  
  // Setup mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas ref is null');
      return;
    }
    
    const ctx = ctxRef.current;
    if (!ctx) {
      console.error('Canvas context is null');
      return; 
    }
    
    const handleMouseDown = (e: MouseEvent) => {
      if (!isDrawing) {
        console.log('Mouse down but not allowed to draw', { isDrawing });
        return;
      }
      
      console.log('Mouse down - starting to draw', { isDrawing, drawing });
      setDrawing(true);
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) / scaleX;
      const y = (e.clientY - rect.top) / scaleY;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      onDraw({
        type: 'start',
        x,
        y,
        color,
        lineWidth
      });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!drawing || !isDrawing) return;
      
      console.log('Mouse move - drawing');
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) / scaleX;
      const y = (e.clientY - rect.top) / scaleY;
      
      ctx.lineTo(x, y);
      ctx.stroke();
      
      onDraw({
        type: 'draw',
        x,
        y,
        color,
        lineWidth
      });
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!drawing || !isDrawing) return;
      
      console.log('Mouse up - ending draw');
      setDrawing(false);
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) / scaleX;
      const y = (e.clientY - rect.top) / scaleY;
      
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.closePath();
      
      onDraw({
        type: 'end',
        x,
        y,
        color,
        lineWidth
      });
    };
    
    const handleMouseLeave = (e: MouseEvent) => {
      if (drawing && isDrawing) {
        handleMouseUp(e);
      }
    };
    
    // Add touch support
    const handleTouchStart = (e: TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      
      console.log('Touch start - starting to draw');
      setDrawing(true);
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / scaleX;
      const y = (touch.clientY - rect.top) / scaleY;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      onDraw({
        type: 'start',
        x,
        y,
        color,
        lineWidth
      });
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!drawing || !isDrawing) return;
      e.preventDefault();
      
      console.log('Touch move - drawing');
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const touch = e.touches[0];
      const x = (touch.clientX - rect.left) / scaleX;
      const y = (touch.clientY - rect.top) / scaleY;
      
      ctx.lineTo(x, y);
      ctx.stroke();
      
      onDraw({
        type: 'draw',
        x,
        y,
        color,
        lineWidth
      });
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (!drawing || !isDrawing) return;
      e.preventDefault();
      
      console.log('Touch end - ending draw');
      setDrawing(false);
      
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      // Use the last known touch position
      const touches = e.changedTouches;
      if (touches.length > 0) {
        const touch = touches[0];
        const x = (touch.clientX - rect.left) / scaleX;
        const y = (touch.clientY - rect.top) / scaleY;
        
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.closePath();
        
        onDraw({
          type: 'end',
          x,
          y,
          color,
          lineWidth
        });
      }
    };
    
    console.log('Setting up canvas event listeners, isDrawing:', isDrawing);
    
    // Add mouse event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      // Remove mouse event listeners
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      
      // Remove touch event listeners
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [drawing, isDrawing, color, lineWidth, onDraw]);
  
  // Handle clear canvas signal
  useEffect(() => {
    if (clearCanvas) {
      console.log('Clear canvas signal received');
      clearCanvasFunc();
    }
  }, [clearCanvas, clearCanvasFunc]);
  
  // Set up the drawable area
  const handleClearClick = () => {
    console.log('Clear button clicked');
    clearCanvasFunc();
    onClear();
  };
  
  const colorOptions = [
    '#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'
  ];
  
  const lineWidthOptions = [2, 5, 10, 15, 20];
  
  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 p-2 bg-white rounded shadow-md">
        <canvas
          ref={canvasRef}
          style={{width: `${width}px`, height: `${height}px`}}
          className="border border-gray-300 bg-white cursor-crosshair"
        />
      </div>
      
      {isDrawing && (
        <div className="flex space-x-4 items-center p-2 bg-white rounded shadow-md">
          <div className="flex space-x-2">
            {colorOptions.map((c) => (
              <button
                key={c}
                className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #ddd' : 'none' }}
                onClick={() => setColor(c)}
                aria-label={`Set color to ${c}`}
              />
            ))}
          </div>
          
          <div className="flex space-x-2">
            {lineWidthOptions.map((w) => (
              <button
                key={w}
                className={`w-8 h-8 flex items-center justify-center rounded ${lineWidth === w ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => setLineWidth(w)}
                aria-label={`Set line width to ${w}`}
              >
                <div 
                  className="rounded-full bg-black" 
                  style={{ width: `${w}px`, height: `${w}px` }}
                />
              </button>
            ))}
          </div>
          
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={handleClearClick}
            aria-label="Clear canvas"
          >
            Clear
          </button>
        </div>
      )}
      
      {isDrawing ? (
        <div className="mt-2 text-white bg-green-600 px-4 py-2 rounded">
          You are drawing! Others can see your drawing in real-time. (isDrawing: {isDrawing.toString()})
        </div>
      ) : (
        <div className="mt-2 text-white bg-blue-600 px-4 py-2 rounded">
          Viewing mode - wait for your turn to draw. (isDrawing: {isDrawing.toString()})
        </div>
      )}
    </div>
  );
} 