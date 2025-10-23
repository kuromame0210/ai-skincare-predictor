const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists (for Render.com ephemeral storage)
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for images and HTML pages)
app.use('/images', express.static(path.join(__dirname, 'public/uploads')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// Routes
const uploadRoutes = require('./routes/upload');
const statusRoutes = require('./routes/status');
const resultRoutes = require('./routes/result');
const pageRoutes = require('./routes/pages');

app.use('/api', uploadRoutes);
app.use('/api', statusRoutes);
app.use('/api', resultRoutes);
app.use('/', pageRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Skin Care Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'サーバー内部エラーが発生しました。'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'リクエストされたリソースが見つかりません。'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 Camera page: http://localhost:${PORT}/camera`);
  console.log(`📊 Result page: http://localhost:${PORT}/result`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});