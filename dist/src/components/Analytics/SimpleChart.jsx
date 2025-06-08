"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SimpleChart;
// Simple chart component using HTML5 Canvas
const react_1 = __importStar(require("react"));
function SimpleChart({ data, type, title, width = 400, height = 300 }) {
    const canvasRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        // Set up dimensions and padding
        const padding = 60;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        // Find max value for scaling
        const maxValue = Math.max(...data.datasets.flatMap(dataset => dataset.data));
        const scale = chartHeight / (maxValue * 1.1); // Add 10% padding at top
        // Draw background
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, width, height);
        // Draw chart area
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(padding, padding, chartWidth, chartHeight);
        // Draw grid lines
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
            // Y-axis labels
            const value = Math.round((maxValue * (5 - i)) / 5);
            ctx.fillStyle = '#6b7280';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(value.toString(), padding - 10, y + 4);
        }
        // Vertical grid lines and X-axis labels
        const barWidth = chartWidth / data.labels.length;
        data.labels.forEach((label, index) => {
            const x = padding + barWidth * index + barWidth / 2;
            // Grid line
            ctx.strokeStyle = '#e5e7eb';
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + chartHeight);
            ctx.stroke();
            // X-axis label
            ctx.fillStyle = '#6b7280';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, height - padding + 20);
        });
        // Draw data
        data.datasets.forEach((dataset, datasetIndex) => {
            if (type === 'bar') {
                // Draw bars
                const barPadding = barWidth * 0.2;
                const actualBarWidth = barWidth - barPadding;
                dataset.data.forEach((value, index) => {
                    const x = padding + barWidth * index + barPadding / 2;
                    const barHeight = value * scale;
                    const y = padding + chartHeight - barHeight;
                    ctx.fillStyle = dataset.backgroundColor || '#3b82f6';
                    ctx.fillRect(x, y, actualBarWidth, barHeight);
                    // Draw border
                    if (dataset.borderColor) {
                        ctx.strokeStyle = dataset.borderColor;
                        ctx.lineWidth = dataset.borderWidth || 1;
                        ctx.strokeRect(x, y, actualBarWidth, barHeight);
                    }
                    // Draw value on top of bar
                    ctx.fillStyle = '#374151';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(value.toString(), x + actualBarWidth / 2, y - 5);
                });
            }
            else if (type === 'line') {
                // Draw line
                ctx.strokeStyle = dataset.borderColor || '#3b82f6';
                ctx.lineWidth = dataset.borderWidth || 2;
                ctx.beginPath();
                dataset.data.forEach((value, index) => {
                    const x = padding + barWidth * index + barWidth / 2;
                    const y = padding + chartHeight - (value * scale);
                    if (index === 0) {
                        ctx.moveTo(x, y);
                    }
                    else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.stroke();
                // Draw points
                ctx.fillStyle = dataset.backgroundColor || '#3b82f6';
                dataset.data.forEach((value, index) => {
                    const x = padding + barWidth * index + barWidth / 2;
                    const y = padding + chartHeight - (value * scale);
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                    // Draw value near point
                    ctx.fillStyle = '#374151';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(value.toString(), x, y - 10);
                    ctx.fillStyle = dataset.backgroundColor || '#3b82f6';
                });
            }
        });
        // Draw axes
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.stroke();
        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();
        // Draw title
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(title, width / 2, 30);
    }, [data, type, title, width, height]);
    return (<div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <canvas ref={canvasRef} width={width} height={height} className="max-w-full h-auto"/>
      {data.datasets.length > 1 && (<div className="mt-4 flex flex-wrap justify-center gap-4">
          {data.datasets.map((dataset, index) => (<div key={index} className="flex items-center">
              <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: dataset.backgroundColor || '#3b82f6' }}/>
              <span className="text-sm text-gray-600">{dataset.label}</span>
            </div>))}
        </div>)}
    </div>);
}
