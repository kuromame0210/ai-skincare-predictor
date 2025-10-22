const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const fs = require('fs').promises;
const { generateImage, initializeSession } = require('../services/imageGeneration');
const router = express.Router();

// Multerをメモリストレージに変更（フロントエンドと同じように扱う）
const upload = multer({
  storage: multer.memoryStorage(),  // メモリに保存
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('対応していない画像形式です。JPEG または PNG をアップロードしてください。'), false);
    }
  },
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

    console.log(`📸 Image uploaded: ${req.file.originalname} (Session: ${sessionId})`);
    console.log(`File size: ${(req.file.size / 1024).toFixed(2)}KB`);
    console.log(`File type: ${req.file.mimetype}`);

    // 全ての画像をRGBA PNG形式に変換（OpenAI APIの要求）
    console.log('🔄 Converting to RGBA PNG format...');
    let processedBuffer;
    let finalMimetype = 'image/png';
    let finalFilename = req.file.originalname.replace(/\.(jpe?g|png)$/i, '.png');

    try {
      // SharpでRGBAモード（アルファチャンネル付き）のPNGに変換
      processedBuffer = await sharp(req.file.buffer)
        .ensureAlpha()  // アルファチャンネルを追加（透明度）
        .png()
        .toBuffer();

      console.log(`✅ Converted to RGBA PNG: ${(processedBuffer.length / 1024).toFixed(2)}KB`);
    } catch (conversionError) {
      console.error('❌ Image conversion failed:', conversionError);
      throw new Error('画像の変換に失敗しました。');
    }

    // BufferをBlobに変換し、Fileオブジェクトを作成（Node.js 18+）
    const blob = new Blob([processedBuffer], { type: finalMimetype });

    // BlobをFileオブジェクトに変換
    const imageFile = new File([blob], finalFilename, {
      type: finalMimetype
    });

    console.log(`📝 Created File object:`, {
      name: imageFile.name,
      type: imageFile.type,
      size: imageFile.size
    });

    // オリジナル画像を保存（表示用）
    const originalFilename = `original_${sessionId}.png`;
    const originalPath = path.join(__dirname, '../public/uploads', originalFilename);

    try {
      await fs.writeFile(originalPath, processedBuffer);
      console.log(`💾 Saved original image: ${originalFilename}`);
    } catch (saveError) {
      console.error('⚠️ Failed to save original image:', saveError);
    }

    // セッションを初期化
    initializeSession(sessionId);

    // AI生成をバックグラウンドで開始（Bufferを渡す）
    generateImage(sessionId, imageFile).catch(error => {
      console.error(`❌ Background AI generation failed for ${sessionId}:`, error);
    });

    console.log(`🚀 AI generation started in background for session: ${sessionId}`);

    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        status: 'processing',
        originalUrl: `${baseUrl}/images/${originalFilename}`,
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