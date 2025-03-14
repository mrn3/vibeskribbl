"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GamePage;
const react_1 = require("react");
const GamePageContent_1 = __importDefault(require("./GamePageContent"));
function GamePage() {
    return (<react_1.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-400 to-purple-500">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Loading game...</h1>
          <p>Please wait while we set up the game.</p>
        </div>
      </div>}>
      <GamePageContent_1.default />
    </react_1.Suspense>);
}
