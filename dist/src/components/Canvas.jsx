"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Canvas;
const react_1 = require("react");
const game_1 = require("../types/game");
function Canvas({ isDrawing, onDraw, onClear, clearCanvas, width = undefined, height = undefined, remoteDrawData }) {
    const canvasRef = (0, react_1.useRef)(null);
    const ctxRef = (0, react_1.useRef)(null);
    const [drawing, setDrawing] = (0, react_1.useState)(false);
    const [color, setColor] = (0, react_1.useState)('#000000');
    const [lineWidth, setLineWidth] = (0, react_1.useState)(5);
    const [canvasSize, setCanvasSize] = (0, react_1.useState)({ width: width || 800, height: height || 600 });
    const containerRef = (0, react_1.useRef)(null);
    // Handle responsive sizing
    (0, react_1.useEffect)(() => {
        if (!width || !height) {
            const handleResize = () => {
                if (containerRef.current) {
                    const containerWidth = containerRef.current.clientWidth;
                    // Set canvas dimensions based on container width
                    // Maintain 4:3 aspect ratio
                    setCanvasSize({
                        width: containerWidth - 24, // Subtract padding
                        height: (containerWidth - 24) * 0.75
                    });
                }
            };
            handleResize(); // Initial sizing
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [width, height]);
    console.log('Canvas rendered with isDrawing:', isDrawing, 'size:', canvasSize);
    // Initialize canvas context - only when size changes
    (0, react_1.useEffect)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Store existing image data if we have a context already
        let imageData = null;
        if (ctxRef.current) {
            try {
                // Try to save the current canvas content
                imageData = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
            }
            catch (err) {
                console.log('Could not save canvas state:', err);
            }
        }
        // Set canvas resolution to match display size
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        // Set canvas display size
        canvas.style.width = `${canvasSize.width}px`;
        canvas.style.height = `${canvasSize.height}px`;
        // Set drawing styles
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        // Store context for later use
        ctxRef.current = ctx;
        // Restore previous drawing if available
        if (imageData) {
            try {
                ctx.putImageData(imageData, 0, 0);
            }
            catch (err) {
                console.log('Could not restore canvas state:', err);
            }
        }
        console.log('Canvas initialized with context, size:', canvasSize);
    }, [canvasSize, color, lineWidth]);
    // Update context drawing styles when color or line width changes - without clearing the canvas
    (0, react_1.useEffect)(() => {
        const ctx = ctxRef.current;
        if (!ctx)
            return;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        console.log('Updated drawing styles - color:', color, 'lineWidth:', lineWidth);
    }, [color, lineWidth]);
    // Clear the canvas
    const clearCanvasFunc = (0, react_1.useCallback)(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (!ctx || !canvas) {
            console.error('Cannot clear canvas - context or canvas is null');
            return;
        }
        console.log('Clearing canvas');
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    }, [canvasSize.width, canvasSize.height]);
    // This function is used to handle draw events from other users
    const handleRemoteDraw = (0, react_1.useCallback)((data) => {
        const ctx = ctxRef.current;
        if (!ctx) {
            console.error('Cannot handle remote draw - context is null');
            return;
        }
        console.log('Handling remote draw:', data.type, 'at', data.x, data.y, 'with color:', data.color, 'lineWidth:', data.lineWidth);
        // Save the current local drawing state
        const savedStrokeStyle = ctx.strokeStyle;
        const savedLineWidth = ctx.lineWidth;
        // Apply remote drawing styles
        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.lineWidth;
        // Ensure coordinates are in the correct scale
        const x = data.x;
        const y = data.y;
        if (data.type === 'start') {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
        else if (data.type === 'draw') {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        else if (data.type === 'end') {
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.closePath();
        }
        // Restore the local drawing state to prevent interference
        ctx.strokeStyle = savedStrokeStyle;
        ctx.lineWidth = savedLineWidth;
        console.log('Remote draw completed, restored local styles - color:', savedStrokeStyle, 'lineWidth:', savedLineWidth);
    }, []);
    // Process remote drawing data when it arrives
    (0, react_1.useEffect)(() => {
        if (remoteDrawData) {
            console.log('Received remote draw data:', remoteDrawData.type);
            // Validate the remote draw data before processing
            if (!(0, game_1.validateDrawData)(remoteDrawData)) {
                console.error('Invalid remote draw data received:', remoteDrawData);
                return;
            }
            handleRemoteDraw(remoteDrawData);
        }
    }, [remoteDrawData, handleRemoteDraw]);
    // Setup mouse events
    (0, react_1.useEffect)(() => {
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
        const handleMouseDown = (e) => {
            if (!isDrawing) {
                console.log('Mouse down but not allowed to draw', { isDrawing });
                return;
            }
            console.log('Mouse down - starting to draw', { isDrawing, drawing });
            setDrawing(true);
            const rect = canvas.getBoundingClientRect();
            // Account for scaling properly by considering the display size
            // and the actual canvas style size
            const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
            const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);
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
            console.log('Mouse move - drawing');
            const rect = canvas.getBoundingClientRect();
            // Account for scaling properly
            const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
            const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);
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
            console.log('Mouse up - ending draw');
            setDrawing(false);
            const rect = canvas.getBoundingClientRect();
            // Account for scaling properly
            const x = (e.clientX - rect.left) * (canvasSize.width / rect.width);
            const y = (e.clientY - rect.top) * (canvasSize.height / rect.height);
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
            if (drawing && isDrawing) {
                handleMouseUp(e);
            }
        };
        // Add touch support with the same coordinate calculation fix
        const handleTouchStart = (e) => {
            if (!isDrawing)
                return;
            e.preventDefault();
            console.log('Touch start - starting to draw');
            setDrawing(true);
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            // Account for scaling properly
            const x = (touch.clientX - rect.left) * (canvasSize.width / rect.width);
            const y = (touch.clientY - rect.top) * (canvasSize.height / rect.height);
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
        const handleTouchMove = (e) => {
            if (!drawing || !isDrawing)
                return;
            e.preventDefault();
            console.log('Touch move - drawing');
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            // Account for scaling properly
            const x = (touch.clientX - rect.left) * (canvasSize.width / rect.width);
            const y = (touch.clientY - rect.top) * (canvasSize.height / rect.height);
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
        const handleTouchEnd = (e) => {
            if (!drawing || !isDrawing)
                return;
            e.preventDefault();
            console.log('Touch end - ending draw');
            setDrawing(false);
            const rect = canvas.getBoundingClientRect();
            // Use the last known touch position
            const touches = e.changedTouches;
            if (touches.length > 0) {
                const touch = touches[0];
                // Account for scaling properly
                const x = (touch.clientX - rect.left) * (canvasSize.width / rect.width);
                const y = (touch.clientY - rect.top) * (canvasSize.height / rect.height);
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
    }, [drawing, isDrawing, color, lineWidth, onDraw, canvasSize.height, canvasSize.width]);
    // Handle clear canvas signal
    (0, react_1.useEffect)(() => {
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
        '#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#8B4513', '#ffffff'
    ];
    const lineWidthOptions = [2, 5, 10, 15, 20];
    return (<div className="flex flex-col items-center w-full" ref={containerRef}>
      <div className="mb-4 p-2 bg-white rounded shadow-md w-full flex justify-center">
        <canvas ref={canvasRef} style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            maxWidth: '100%'
        }} className="border border-gray-300 bg-white cursor-crosshair"/>
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
      
      {isDrawing ? (<div className="mt-2 text-white bg-green-600 px-4 py-2 rounded">
          You are drawing! Others can see your drawing in real-time. (isDrawing: {isDrawing.toString()})
        </div>) : (<div className="mt-2 text-white bg-blue-600 px-4 py-2 rounded">
          Viewing mode - wait for your turn to draw. (isDrawing: {isDrawing.toString()})
        </div>)}
    </div>);
}
