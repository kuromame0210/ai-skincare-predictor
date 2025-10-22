const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// セッション状態管理
const sessions = new Map();
const results = new Map();

// 画像生成ステータス
const STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  ERROR: 'error'
};

// 最適なサイズを取得
const getOptimalSize = (aspectRatio = 1.0) => {
  if (aspectRatio > 1.2) {
    return "1024x1024";
  } else if (aspectRatio < 0.8) {
    return "1024x1024";
  } else {
    return "512x512";
  }
};

// URLから画像をダウンロードして保存
const downloadImage = (url, filepath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // エラー時はファイル削除
      reject(err);
    });
  });
};

// AI画像生成を実行（フロントエンドの実装をそのまま移植）
const generateImage = async (sessionId, imageFile) => {
  try {
    console.log(`🎨 AI画像生成開始: ${sessionId}`);
    console.log("File size:", imageFile.size);
    console.log("File type:", imageFile.type);

    // セッション状態を更新
    sessions.set(sessionId, {
      status: STATUS.PROCESSING,
      progress: 10,
      message: 'AI画像生成を開始しています...',
      startedAt: new Date().toISOString()
    });

    // プロンプト（フロントエンドと完全に同じ）
    const prompt = `
      Add subtle skin imperfections: light age spots, slightly dull skin, minor pores, faint under-eye circles. Keep natural appearance - same person and age with minor skincare neglect effects only.
    `;

    // プログレス更新
    sessions.set(sessionId, {
      ...sessions.get(sessionId),
      progress: 30,
      message: 'OpenAI API に画像を送信中...'
    });

    let response;
    let modelUsed = "";

    // フロントエンドと同じ：gpt-image-1を試してからdall-e-2にフォールバック
    try {
      console.log(`=== Trying gpt-image-1 ===`);
      response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        n: 1,
        size: "1024x1024",  // gpt-image-1は512x512未対応のため1024x1024を使用
      });
      modelUsed = "gpt-image-1";
      console.log(`✅ gpt-image-1 成功: ${sessionId}`);
    } catch (gptError) {
      console.log(`❌ gpt-image-1 失敗: ${sessionId}`, gptError.message);
      console.log(`=== Falling back to dall-e-2 ===`);

      try {
        response = await openai.images.edit({
          model: "dall-e-2",
          image: imageFile,
          prompt: prompt,
          n: 1,
          size: "512x512",  // dall-e-2は512x512対応
          response_format: "url",
        });
        modelUsed = "dall-e-2";
        console.log(`✅ dall-e-2 成功: ${sessionId}`);
      } catch (dalleError) {
        console.log(`❌ dall-e-2 も失敗: ${sessionId}`, dalleError.message);
        throw dalleError;
      }
    }

    // プログレス更新
    sessions.set(sessionId, {
      ...sessions.get(sessionId),
      progress: 70,
      message: '生成された画像をダウンロード中...'
    });

    // 生成された画像を取得
    const firstItem = response.data?.[0];
    let imageUrl = firstItem?.url;
    
    if (firstItem?.b64_json) {
      // base64の場合はdata URLに変換
      imageUrl = `data:image/png;base64,${firstItem.b64_json}`;
    }

    if (!imageUrl) {
      throw new Error('APIから画像が返されませんでした');
    }

    // 生成画像を保存
    const generatedFilename = `generated_${sessionId}.jpg`;
    const generatedPath = path.join(__dirname, '../public/uploads', generatedFilename);
    const tempPath = `${generatedPath}.temp`;

    if (imageUrl.startsWith('data:')) {
      // base64データの場合
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Sharpで最適化して保存
      await sharp(buffer)
        .jpeg({ quality: 85, progressive: true })
        .toFile(generatedPath);
    } else {
      // URLからダウンロードして最適化
      await downloadImage(imageUrl, tempPath);

      // Sharpで最適化
      await sharp(tempPath)
        .jpeg({ quality: 85, progressive: true })
        .toFile(generatedPath);

      // 一時ファイルを削除
      fs.unlinkSync(tempPath);
    }

    // 最適化後のファイルサイズを確認
    const stats = fs.statSync(generatedPath);
    console.log(`💾 Generated image saved: ${(stats.size / 1024).toFixed(2)}KB`);

    // 結果を保存
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    const result = {
      originalUrl: `${baseUrl}/images/original_${sessionId}.png`,  // .png に修正
      generatedUrl: `${baseUrl}/images/${generatedFilename}`,
      modelUsed: modelUsed,
      createdAt: sessions.get(sessionId).startedAt,
      completedAt: new Date().toISOString()
    };

    results.set(sessionId, result);

    // セッション状態を完了に更新
    sessions.set(sessionId, {
      status: STATUS.COMPLETED,
      progress: 100,
      message: '生成が完了しました！',
      startedAt: sessions.get(sessionId).startedAt,
      completedAt: new Date().toISOString()
    });

    console.log(`🎉 AI画像生成完了: ${sessionId} (${modelUsed})`);
    return result;

  } catch (error) {
    console.error(`💥 AI画像生成エラー: ${sessionId}`, error);
    
    // エラー状態に更新
    sessions.set(sessionId, {
      status: STATUS.ERROR,
      progress: 0,
      message: `生成中にエラーが発生しました: ${error.message}`,
      error: error.message,
      failedAt: new Date().toISOString()
    });
    
    throw error;
  }
};

// セッション状態を取得
const getSessionStatus = (sessionId) => {
  return sessions.get(sessionId) || {
    status: STATUS.PENDING,
    progress: 0,
    message: 'セッションが見つかりません'
  };
};

// 結果を取得
const getResult = (sessionId) => {
  return results.get(sessionId) || null;
};

// セッションを初期化
const initializeSession = (sessionId) => {
  sessions.set(sessionId, {
    status: STATUS.PENDING,
    progress: 0,
    message: 'アップロード完了。AI生成の準備中...',
    createdAt: new Date().toISOString()
  });
};

module.exports = {
  generateImage,
  getSessionStatus,
  getResult,
  initializeSession,
  STATUS
};