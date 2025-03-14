"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Chat;
const react_1 = require("react");
function Chat({ playerId, onSendMessage, messages, disabled = false, placeholder = 'Type your guess here...' }) {
    const [message, setMessage] = (0, react_1.useState)('');
    const messagesEndRef = (0, react_1.useRef)(null);
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
    return (<div className="flex flex-col h-full bg-white border rounded-lg shadow-md">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (<div key={msg.id} className={`p-2 rounded ${msg.isSystemMessage
                ? 'bg-gray-100 text-gray-700'
                : msg.isCorrectGuess
                    ? 'bg-green-100 text-green-800'
                    : msg.playerId === playerId
                        ? 'bg-blue-100 text-blue-800 ml-8'
                        : 'bg-gray-200 text-gray-800 mr-8'}`}>
            {!msg.isSystemMessage && (<div className="font-bold">
                {msg.playerId === playerId ? 'You' : msg.playerName}:
              </div>)}
            <div>{msg.content}</div>
          </div>))}
        <div ref={messagesEndRef}/>
      </div>
      
      <form onSubmit={handleSubmit} className="border-t p-2">
        <div className="flex items-center">
          <input type="text" className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder={placeholder} value={message} onChange={(e) => setMessage(e.target.value)} disabled={disabled}/>
          <button type="submit" className={`px-4 py-2 rounded-r ${disabled
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'}`} disabled={disabled}>
            Send
          </button>
        </div>
      </form>
    </div>);
}
