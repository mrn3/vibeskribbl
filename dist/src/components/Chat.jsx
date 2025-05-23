"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Chat;
const react_1 = require("react");
function Chat({ playerId, onSendMessage, messages, disabled = false, placeholder = 'Type your guess here...' }) {
    const [message, setMessage] = (0, react_1.useState)('');
    const messagesEndRef = (0, react_1.useRef)(null);
    const messagesContainerRef = (0, react_1.useRef)(null);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');
        }
    };
    (0, react_1.useEffect)(() => {
        var _a;
        // Scroll to bottom when new messages arrive
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    return (<div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent" style={{ overscrollBehavior: 'contain' }}>
        {messages.map((msg) => (<div key={msg.id} className={`p-2 rounded ${msg.isSystemMessage
                ? msg.isCorrectGuess
                    ? 'bg-green-500 text-white font-bold animate-pulse border-2 border-yellow-400'
                    : 'bg-gray-100 text-gray-900 font-medium'
                : msg.isCorrectGuess
                    ? 'bg-green-100 text-green-900 font-bold border-2 border-green-500'
                    : msg.playerId === playerId
                        ? 'bg-blue-100 text-blue-900 font-medium ml-8'
                        : 'bg-gray-200 text-gray-900 font-medium mr-8'}`}>
            {!msg.isSystemMessage && (<div className="font-bold text-black">
                {msg.playerId === playerId ? 'You' : msg.playerName}:
              </div>)}
            <div>{msg.content}</div>
          </div>))}
        <div ref={messagesEndRef}/>
      </div>
      
      <form onSubmit={handleSubmit} className="border-t p-2">
        <div className="flex items-center gap-2">
          <input type="text" className="flex-1 p-2 pr-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-black" placeholder={placeholder} value={message} onChange={(e) => setMessage(e.target.value)} disabled={disabled}/>
          <button type="submit" className={`px-4 py-2 rounded ${disabled
            ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'}`} disabled={disabled}>
            Send
          </button>
        </div>
      </form>
    </div>);
}
