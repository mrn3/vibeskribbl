"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WordAnalyticsCard;
// Word analytics component showing word difficulty and usage patterns
const react_1 = __importDefault(require("react"));
function WordAnalyticsCard({ words, title = "Word Analytics", maxWords = 10 }) {
    // Calculate difficulty based on average guess time
    const wordsWithDifficulty = words.map(word => {
        let difficulty = 'Medium';
        if (word.averageGuessTime <= 10)
            difficulty = 'Easy';
        else if (word.averageGuessTime >= 20)
            difficulty = 'Hard';
        return Object.assign(Object.assign({}, word), { difficulty });
    });
    // Sort by usage frequency
    const sortedWords = wordsWithDifficulty
        .sort((a, b) => b.timesUsed - a.timesUsed)
        .slice(0, maxWords);
    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Easy': return 'bg-green-100 text-green-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Hard': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getDifficultyIcon = (difficulty) => {
        switch (difficulty) {
            case 'Easy':
                return (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>);
            case 'Medium':
                return (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>);
            case 'Hard':
                return (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>);
            default:
                return null;
        }
    };
    if (sortedWords.length === 0) {
        return (<div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z"/>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No word data</h3>
          <p className="mt-1 text-sm text-gray-500">Play some games to see word analytics.</p>
        </div>
      </div>);
    }
    return (<div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">Word usage and difficulty analysis</p>
      </div>
      
      <div className="p-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{words.length}</div>
            <div className="text-sm text-gray-500">Total Words</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {(words.reduce((sum, w) => sum + w.averageGuessTime, 0) / words.length).toFixed(1)}s
            </div>
            <div className="text-sm text-gray-500">Avg Guess Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {words.reduce((sum, w) => sum + w.timesUsed, 0)}
            </div>
            <div className="text-sm text-gray-500">Total Usage</div>
          </div>
        </div>

        {/* Word list */}
        <div className="space-y-3">
          {sortedWords.map((word, index) => (<div key={word.word} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 text-center">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{word.word}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(word.difficulty)}`}>
                      {getDifficultyIcon(word.difficulty)}
                      <span className="ml-1">{word.difficulty}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-500">
                      Used {word.timesUsed} time{word.timesUsed !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      Avg: {word.averageGuessTime.toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {/* Usage frequency bar */}
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{
                width: `${Math.min(100, (word.timesUsed / Math.max(...sortedWords.map(w => w.timesUsed))) * 100)}%`
            }}/>
                </div>
              </div>
            </div>))}
        </div>

        {/* Difficulty distribution */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Difficulty Distribution</h4>
          <div className="grid grid-cols-3 gap-4">
            {['Easy', 'Medium', 'Hard'].map(difficulty => {
            const count = wordsWithDifficulty.filter(w => w.difficulty === difficulty).length;
            const percentage = words.length > 0 ? (count / words.length) * 100 : 0;
            return (<div key={difficulty} className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(difficulty)}`}>
                    {getDifficultyIcon(difficulty)}
                    <span className="ml-1">{difficulty}</span>
                  </div>
                  <div className="mt-1">
                    <div className="text-lg font-semibold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
                  </div>
                </div>);
        })}
          </div>
        </div>
      </div>
    </div>);
}
