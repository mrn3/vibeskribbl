"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Canvas;
const react_1 = require("react");
function Canvas({ isDrawing, onDraw, onClear, clearCanvas, width = 800, height = 600 }) {
    const canvasRef = (0, react_1.useRef)(null);
    const [drawing, setDrawing] = (0, react_1.useState)(false);
    const [color, setColor] = (0, react_1.useState)('#000000');
    const [lineWidth, setLineWidth] = (0, react_1.useState)(5);
    // Clear the canvas
    const clearCanvasFunc = (0, react_1.useCallback)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.clearRect(0, 0, width, height);
    }, [width, height]);
    // This function would be used to handle draw events from other users
    // through a socket connection in a real implementation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleRemoteDraw = (0, react_1.useCallback)((data) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.lineWidth;
        if (data.type === 'start') {
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
        }
        else if (data.type === 'draw') {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
        }
        else if (data.type === 'end') {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
            ctx.closePath();
        }
    }, []);
    // Setup mouse events
    (0, react_1.useEffect)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const handleMouseDown = (e) => {
            if (!isDrawing)
                return;
            setDrawing(true);
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
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
        const handleMouseMove = (e) => {
            if (!drawing || !isDrawing)
                return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
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
        const handleMouseUp = (e) => {
            if (!drawing || !isDrawing)
                return;
            setDrawing(false);
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
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
        const handleMouseLeave = (e) => {
            handleMouseUp(e);
        };
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [drawing, isDrawing, color, lineWidth, onDraw]);
    // Handle external draw events
    (0, react_1.useEffect)(() => {
        // This is where we handle drawing data from other users
        return () => { };
    }, []);
    // Handle clear canvas signal
    (0, react_1.useEffect)(() => {
        if (clearCanvas) {
            clearCanvasFunc();
        }
    }, [clearCanvas, clearCanvasFunc]);
    // Set up the drawable area
    const handleClearClick = () => {
        clearCanvasFunc();
        onClear();
    };
    const colorOptions = [
        '#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'
    ];
    const lineWidthOptions = [2, 5, 10, 15, 20];
    return (<div className="flex flex-col items-center">
      <div className="mb-4 p-2 bg-white rounded shadow-md">
        <canvas ref={canvasRef} width={width} height={height} className="border border-gray-300 bg-white cursor-crosshair"/>
      </div>
      
      {isDrawing && (<div className="flex space-x-4 items-center p-2 bg-white rounded shadow-md">
          <div className="flex space-x-2">
            {colorOptions.map((c) => (<button key={c} className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-blue-500' : ''}`} style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #ddd' : 'none' }} onClick={() => setColor(c)} aria-label={`Set color to ${c}`}/>))}
          </div>
          
          <div className="flex space-x-2">
            {lineWidthOptions.map((w) => (<button key={w} className={`w-8 h-8 flex items-center justify-center rounded ${lineWidth === w ? 'bg-blue-100' : 'bg-gray-100'}`} onClick={() => setLineWidth(w)} aria-label={`Set line width to ${w}`}>
                <div className="rounded-full bg-black" style={{ width: `${w}px`, height: `${w}px` }}/>
              </button>))}
          </div>
          
          <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" onClick={handleClearClick} aria-label="Clear canvas">
            Clear
          </button>
        </div>)}
    </div>);
}
