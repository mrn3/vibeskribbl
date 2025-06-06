"use strict";
// Shared types for the drawing game
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidHexColor = isValidHexColor;
exports.validateDrawData = validateDrawData;
// Color validation utility
function isValidHexColor(color) {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    return colorRegex.test(color);
}
// DrawData validation utility
function validateDrawData(data) {
    return (data !== null &&
        typeof data === 'object' &&
        'type' in data &&
        'x' in data &&
        'y' in data &&
        'color' in data &&
        'lineWidth' in data &&
        typeof data.type === 'string' &&
        ['start', 'draw', 'end'].includes(data.type) &&
        typeof data.x === 'number' &&
        typeof data.y === 'number' &&
        typeof data.color === 'string' &&
        isValidHexColor(data.color) &&
        typeof data.lineWidth === 'number' &&
        data.lineWidth > 0);
}
