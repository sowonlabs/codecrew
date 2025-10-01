// Simple Node.js HTTP Server Example
const http = require('http');
const url = require('url');

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle different routes
  if (path === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1>Welcome to Simple Node.js Server!</h1>
      <p>Server is running on port 3000</p>
      <ul>
        <li><a href="/api/hello">GET /api/hello</a></li>
        <li><a href="/api/time">GET /api/time</a></li>
        <li><a href="/api/users">GET /api/users</a></li>
      </ul>
    `);
  } 
  else if (path === '/api/hello' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Hello, World!',
      timestamp: new Date().toISOString()
    }));
  }
  else if (path === '/api/time' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      currentTime: new Date().toLocaleString(),
      timestamp: Date.now()
    }));
  }
  else if (path === '/api/users' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
      { id: 3, name: 'Charlie', email: 'charlie@example.com' }
    ]));
  }
  else if (method === 'POST' && path === '/api/echo') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Echo response',
        receivedData: body,
        method: method,
        path: path
      }));
    });
  }
  else {
    // 404 Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not Found',
      message: `Path ${path} not found`,
      availableRoutes: ['/', '/api/hello', '/api/time', '/api/users', 'POST /api/echo']
    }));
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📋 Available routes:`);
  console.log(`   GET  /              - Home page`);
  console.log(`   GET  /api/hello     - Hello message`);
  console.log(`   GET  /api/time      - Current time`);
  console.log(`   GET  /api/users     - Sample users`);
  console.log(`   POST /api/echo      - Echo request data`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});