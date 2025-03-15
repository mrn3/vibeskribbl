const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { setupSocketServer } = require('./dist/src/lib/socketServer');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const port = process.env.PORT || 3001;

// Prepare Next.js app
const app = next({ dev, hostname: 'localhost', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Set up socket.io
  setupSocketServer(server);

  // Listen on all interfaces in production, or localhost in development
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> Mode:', dev ? 'development' : 'production');
  });
}); 