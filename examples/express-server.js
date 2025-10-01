// Express.js Server Example (requires: npm install express)
const express = require('express');
const app = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <h1>Express.js Server</h1>
    <p>Server is running on port ${PORT}</p>
    <h3>Available API Endpoints:</h3>
    <ul>
      <li><a href="/api/hello">GET /api/hello</a></li>
      <li><a href="/api/users">GET /api/users</a></li>
      <li><a href="/api/health">GET /api/health</a></li>
      <li>POST /api/users (create user)</li>
      <li>GET /api/users/:id (get user by ID)</li>
    </ul>
  `);
});

// Sample data
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', created: new Date() },
  { id: 2, name: 'Bob', email: 'bob@example.com', created: new Date() },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', created: new Date() }
];

// API Routes
app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from Express!',
    timestamp: new Date().toISOString(),
    server: 'Express.js'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

// Users API
app.get('/api/users', (req, res) => {
  res.json({
    users: users,
    count: users.length
  });
});

app.get('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  
  if (!user) {
    return res.status(404).json({ 
      error: 'User not found',
      id: id 
    });
  }
  
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      error: 'Name and email are required',
      required: ['name', 'email']
    });
  }
  
  const newUser = {
    id: Math.max(...users.map(u => u.id)) + 1,
    name,
    email,
    created: new Date()
  };
  
  users.push(newUser);
  res.status(201).json(newUser);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Express server running at http://localhost:${PORT}`);
  console.log(`📋 API endpoints available at http://localhost:${PORT}/api/`);
});

module.exports = app;