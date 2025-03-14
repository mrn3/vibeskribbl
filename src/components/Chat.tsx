'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  isSystemMessage?: boolean;
  isCorrectGuess?: boolean;
}

interface ChatProps {
  playerId: string;
  onSendMessage: (message: string) => void;
  messages: Message[];
  disabled?: boolean;
  placeholder?: string;
}

export default function Chat({ 
  playerId, 
  onSendMessage, 
  messages, 
  disabled = false,
  placeholder = 'Type your guess here...'
}: ChatProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`p-2 rounded ${
              msg.isSystemMessage 
                ? msg.isCorrectGuess
                  ? 'bg-green-500 text-white font-bold animate-pulse border-2 border-yellow-400' 
                  : 'bg-gray-100 text-gray-900 font-medium'
                : msg.isCorrectGuess
                  ? 'bg-green-100 text-green-900 font-bold border-2 border-green-500'
                  : msg.playerId === playerId 
                    ? 'bg-blue-100 text-blue-900 font-medium ml-8' 
                    : 'bg-gray-200 text-gray-900 font-medium mr-8'
            }`}
          >
            {!msg.isSystemMessage && (
              <div className="font-bold text-black">
                {msg.playerId === playerId ? 'You' : msg.playerName}:
              </div>
            )}
            <div>{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="border-t p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 p-2 pr-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300 text-black"
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              disabled 
                ? 'bg-gray-400 text-gray-100 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={disabled}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 