"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WordSelector;
const react_1 = require("react");
function WordSelector({ words, onSelect, timeLeft = 10 }) {
    const [countdown, setCountdown] = (0, react_1.useState)(timeLeft);
    // Handle countdown and auto-select
    (0, react_1.useEffect)(() => {
        if (countdown <= 0) {
            // Time's up, select a random word
            const randomIndex = Math.floor(Math.random() * words.length);
            onSelect(words[randomIndex]);
            return;
        }
        const timer = setTimeout(() => {
            setCountdown(countdown - 1);
        }, 1000);
        return () => clearTimeout(timer);
    }, [countdown, words, onSelect]);
    return (<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-4">Choose a word to draw</h2>
        <div className="text-center mb-6">
          <p className="text-gray-600">
            You have <span className="font-bold text-red-500">{countdown}</span> seconds to choose
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${(countdown / timeLeft) * 100}%` }}></div>
          </div>
        </div>
        
        <div className="grid gap-4">
          {words.map((word) => (<button key={word} className="py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-lg transition-colors" onClick={() => onSelect(word)}>
              {word}
            </button>))}
        </div>
      </div>
    </div>);
}
