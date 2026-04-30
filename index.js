require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow requests from the frontend (opened via file:// OR a local server)
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8000',
    'http://127.0.0.1:8000',
    'null',        // file:// origin browsers send as 'null'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    message: 'FairShare API is running ✅',
    time: new Date().toISOString(),
    version: '2.0.0',
    endpoints: {
      auth:        ['POST /api/login', 'POST /api/signup', 'GET /api/user'],
      groups:      ['GET /api/groups', 'POST /api/groups', 'GET /api/groups/:id', 'PUT /api/groups/:id', 'DELETE /api/groups/:id'],
      members:     ['POST /api/groups/:id/members', 'DELETE /api/groups/:id/members/:userId'],
      expenses:    ['GET /api/groups/:id/expenses', 'POST /api/groups/:id/expenses', 'PUT /api/expenses/:id', 'DELETE /api/expenses/:id'],
      balances:    ['GET /api/groups/:id/balances'],
      settlements: ['GET /api/groups/:id/settlements', 'POST /api/groups/:id/settlements', 'GET /api/expenses/settlements'],
    },
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api',          require('./routes/auth'));
app.use('/api/groups',   require('./routes/groups'));
app.use('/api/expenses', require('./routes/expenses'));

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` })
);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FairShare server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
