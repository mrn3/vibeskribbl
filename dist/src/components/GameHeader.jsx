"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GameHeader;
const react_1 = require("react");
function GameHeader({ round, maxRounds, timeLeft, drawer, word, wordHint, isDrawer }) {
    const [timer, setTimer] = (0, react_1.useState)(timeLeft || 0);
    (0, react_1.useEffect)(() => {
        setTimer(timeLeft || 0);
        if (!timeLeft)
            return;
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);
    return (<div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="text-lg font-bold text-gray-900">
          Round {round} of {maxRounds}
        </div>
        
        <div className={`text-xl font-bold px-4 py-2 rounded-lg ${timer <= 10 ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'}`}>
          {timer}s
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="font-medium text-gray-900">
          {drawer && (isDrawer ? (<span>You are drawing now!</span>) : (<span><b className="text-black">{drawer.name}</b> is drawing</span>))}
        </div>
        
        <div className="text-lg font-bold tracking-wider">
          {isDrawer && word ? (<span className="text-green-700">{word}</span>) : (<span className="text-gray-900">{wordHint || ''}</span>)}
        </div>
      </div>
    </div>);
}
