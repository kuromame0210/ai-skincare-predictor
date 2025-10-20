const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { generateImage, initializeSession } = require('../services/imageGeneration');
const router = express.Router();

// Multer configuration for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const sessionId = req.body.sessionId || uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `original_${sessionId}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('対応していない画像形式です。JPEG または PNG をアップロードしてください。'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// POST /api/upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: '画像ファイルがアップロードされていません。'
        }
      });
    }

    const sessionId = req.body.sessionId || uuidv4();
    const originalUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;

    // セッションを初期化
    initializeSession(sessionId);

    // AI生成をバックグラウンドで開始
    generateImage(sessionId, req.file.path).catch(error => {
      console.error(`❌ Background AI generation failed for ${sessionId}:`, error);
    });

    console.log(`📸 Image uploaded: ${req.file.filename} (Session: ${sessionId})`);
    console.log(`🚀 AI generation started in background for session: ${sessionId}`);

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        status: 'processing',
        originalUrl: originalUrl,
        message: '画像をアップロードしました。AI生成を開始します。'
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'アップロード処理中にエラーが発生しました。'
      }
    });
  }
});

module.exports = router;