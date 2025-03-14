"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WordSelector;
function WordSelector({ words, onSelect, timeLeft = 15 }) {
    return (<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-4">Choose a word to draw</h2>
        <p className="text-center text-gray-600 mb-6">
          You have {timeLeft} seconds to choose
        </p>
        
        <div className="grid gap-4">
          {words.map((word) => (<button key={word} className="py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-lg transition-colors" onClick={() => onSelect(word)}>
              {word}
            </button>))}
        </div>
      </div>
    </div>);
}
