const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config({ path: '../.env' });
dotenv.config(); // Vercel/production env vars

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// DB bağlantısı (serverless için lazy connect)
let isConnected = false;
app.use(async (_req, _res, next) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/fixtures', require('./routes/fixtureRouter'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/analysis', require('./routes/analysis'));

// Error handler (en sona eklenmeli)
app.use(errorHandler);

// Local development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  const start = async () => {
    await connectDB();
    isConnected = true;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  };
  start();
}

// Vercel serverless export
module.exports = app;
