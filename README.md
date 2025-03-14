# VibeSkribbl

A fun multiplayer drawing and guessing game inspired by Skribbl.io, built with Next.js, Socket.IO, and TypeScript.

## Features

- Create or join game rooms
- Real-time drawing with different colors and brush sizes
- Chat with other players
- Guess words based on drawings
- Score tracking and game rounds
- Responsive design for desktop and mobile

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Socket.IO
- **Deployment**: Can be deployed on Vercel, Netlify, or any Node.js hosting

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/vibeskribbl.git
cd vibeskribbl
```

2. Install dependencies
```bash
npm install
```

3. Build the application
```bash
npm run build
```

4. Start the server
```bash
npm start
```

The application will be available at http://localhost:3000

### Development

To run the application in development mode with the custom server:

```bash
npm run dev:server
```

## How to Play

1. Visit the homepage and enter your name
2. Create a new room or join an existing one with a room ID
3. Share the room ID with friends so they can join
4. When enough players join (at least 2), the game will start automatically
5. Take turns drawing and guessing words
6. Score points by guessing correctly
7. The player with the highest score at the end wins!

## License

MIT

## Acknowledgements

- Inspired by [Skribbl.io](https://skribbl.io/)
- Built with [Next.js](https://nextjs.org/) and [Socket.IO](https://socket.io/)
