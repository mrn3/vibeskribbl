# VibeSkribbl Analytics Dashboard

## Overview

The VibeSkribbl analytics dashboard provides comprehensive insights into player response times and game performance metrics. This feature tracks detailed statistics about games, rounds, and player performance to help understand gameplay patterns and player behavior.

## Features

### 📊 Real-time Analytics Collection
- **Game Tracking**: Automatically tracks game start/end times, player counts, and winners
- **Round Analytics**: Records round duration, word difficulty, and completion rates
- **Player Response Times**: Measures time from round start to correct guess
- **Scoring Analytics**: Tracks points earned and scoring patterns

### 📈 Performance Metrics
- **Overall Game Statistics**: Total games, players, average game duration
- **Player Performance**: Individual player stats including win rates, average response times
- **Word Analytics**: Most popular words and their average guess times
- **Response Time Distribution**: Breakdown of guess times across different time ranges

### 🎯 Key Metrics Tracked

#### Game Level
- Total number of games played
- Average game duration
- Average players per game
- Game completion rates

#### Round Level
- Round duration and completion
- Word selection and difficulty
- Player participation rates
- Drawing effectiveness

#### Player Level
- Individual response times
- Accuracy and success rates
- Points earned per game/round
- Win/loss ratios
- Fastest and average guess times

## Analytics Dashboard Components

### 1. Overview Cards
- **Total Games**: Number of completed games
- **Total Players**: Unique players across all games
- **Average Game Duration**: Mean time per game
- **Average Players/Game**: Mean player count per game

### 2. Response Time Distribution Chart
- Bar chart showing distribution of guess times
- Time ranges: 0-5s, 5-10s, 10-15s, 15-20s, 20+s
- Helps identify optimal difficulty levels

### 3. Most Popular Words
- List of frequently used words
- Average guess time for each word
- Word difficulty analysis

### 4. Player Performance Table
- Sortable table with detailed player statistics
- Metrics include games played, correct guesses, response times
- Win rate and total points earned

## API Endpoints

### GET `/api/analytics`

Query parameters:
- `type=overview` - Returns overall game statistics
- `type=players` - Returns player performance data
- `type=response-times` - Returns response time chart data
- `type=all-games` - Returns raw game data
- `type=generate-sample` - Generates sample data for testing

### DELETE `/api/analytics`
Clears all analytics data (useful for testing/reset)

## Data Models

### GameAnalytics
```typescript
interface GameAnalytics {
  gameId: string;
  roomId: string;
  startTime: number;
  endTime?: number;
  totalRounds: number;
  totalPlayers: number;
  winner?: Player;
  rounds: RoundAnalytics[];
}
```

### RoundAnalytics
```typescript
interface RoundAnalytics {
  gameId: string;
  roundNumber: number;
  word: string;
  drawerId: string;
  drawerName: string;
  roundDuration: number;
  totalPlayers: number;
  playersWhoGuessed: number;
  averageGuessTime: number;
  fastestGuessTime: number;
  slowestGuessTime: number;
  guesses: PlayerGuessAnalytics[];
}
```

### PlayerGuessAnalytics
```typescript
interface PlayerGuessAnalytics {
  playerId: string;
  playerName: string;
  word: string;
  guessTime: number;
  pointsEarned: number;
  roundNumber: number;
  gameId: string;
  timestamp: number;
}
```

## Usage

### Accessing the Dashboard
1. Navigate to `/analytics` from the main page
2. Click "View Analytics" link on the homepage
3. Direct URL: `http://localhost:3001/analytics`

### Generating Sample Data
For testing purposes, click the "Generate Sample Data" button on the analytics page. This creates:
- 3 sample games with 4 players each
- 3 rounds per game with realistic response times
- Varied scoring patterns and word selections

### Real Game Data
Analytics are automatically collected during actual gameplay:
- Data collection starts when a game begins
- Round analytics track each drawing/guessing phase
- Player response times are measured from round start to correct guess
- Game completion triggers final analytics processing

## Technical Implementation

### Data Collection
- **Server-side tracking**: Analytics collection integrated into socket server
- **Real-time processing**: Statistics calculated as games progress
- **In-memory storage**: Current implementation uses Map-based storage
- **Extensible design**: Easy to add database persistence

### Chart Rendering
- **Custom Canvas Charts**: HTML5 Canvas-based chart components
- **No external dependencies**: Lightweight implementation
- **Responsive design**: Charts adapt to different screen sizes

### Performance Considerations
- **Efficient data structures**: Optimized for real-time updates
- **Minimal overhead**: Analytics collection doesn't impact game performance
- **Scalable architecture**: Ready for database integration

## Future Enhancements

### Planned Features
- **Database persistence**: PostgreSQL/MongoDB integration
- **Advanced filtering**: Date ranges, player groups, game types
- **Export functionality**: CSV/JSON data export
- **Real-time updates**: Live dashboard updates during games
- **Comparative analytics**: Player vs. player comparisons
- **Trend analysis**: Performance trends over time

### Potential Metrics
- **Drawing quality scores**: Based on guess success rates
- **Word difficulty ratings**: Dynamic difficulty based on guess times
- **Player skill levels**: Calculated from performance history
- **Room analytics**: Performance by room/group
- **Time-based patterns**: Peak playing times, session lengths

## Development Notes

### File Structure
```
src/
├── types/analytics.ts          # TypeScript interfaces
├── lib/analytics.ts            # Core analytics logic
├── lib/generateSampleData.ts   # Sample data generation
├── components/Analytics/       # UI components
│   ├── StatsCard.tsx          # Metric display cards
│   ├── SimpleChart.tsx        # Canvas-based charts
│   └── PlayerPerformanceTable.tsx # Player statistics table
├── app/analytics/page.tsx      # Main dashboard page
└── app/api/analytics/route.ts  # API endpoints
```

### Integration Points
- **Socket Server**: `src/lib/socketServer.ts` - Game event tracking
- **Game Types**: `src/types/game.ts` - Extended with analytics fields
- **Main Page**: `src/app/page.tsx` - Analytics navigation link

This analytics system provides valuable insights into game performance and player behavior, helping to understand engagement patterns and optimize the gaming experience.
