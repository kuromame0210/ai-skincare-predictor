const express = require('express');
const path = require('path');
const sessionManager = require('../utils/sessionManager');
const router = express.Router();

// GET / - Home page - redirect to camera with new session
router.get('/', (req, res) => {
  const sessionId = sessionManager.generateUniqueSessionId();
  res.redirect(`/camera?session=${sessionId}`);
});

// GET /new-session - Generate new session and redirect to camera
router.get('/new-session', (req, res) => {
  const sessionId = sessionManager.generateUniqueSessionId();
  res.redirect(`/camera?session=${sessionId}`);
});

// GET /camera - Camera capture page
router.get('/camera', (req, res) => {
  let sessionId = req.query.session;
  
  if (!sessionId) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>エラー</title></head>
      <body>
        <h1>エラー</h1>
        <p>セッションIDが指定されていません。</p>
        <p><a href="/new-session">新しいセッションを開始する</a></p>
      </body>
      </html>
    `);
  }

  // セッション有効性チェック（新規セッションの場合は自動登録）
  if (!sessionManager.isValidSession(sessionId)) {
    sessionManager.activeSessions.add(sessionId);
    sessionManager.sessionData.set(sessionId, {
      createdAt: new Date(),
      lastActivity: new Date()
    });
  } else {
    sessionManager.updateSessionActivity(sessionId);
  }

  // Camera capture page - optimized for iframe embedding
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>写真撮影</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 30px;
          max-width: 500px;
          width: 100%;
        }

        h1 {
          font-size: 24px;
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }

        .video-container {
          position: relative;
          width: 100%;
          border-radius: 15px;
          overflow: hidden;
          background: #000;
          margin-bottom: 20px;
        }

        video, .preview img {
          width: 100%;
          height: auto;
          display: block;
        }

        canvas {
          display: none;
        }

        .controls {
          display: flex;
          gap: 10px;
          flex-direction: column;
        }

        button {
          padding: 15px 30px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }

        .preview {
          margin: 20px 0;
          display: none;
        }

        .preview.show {
          display: block;
        }

        .status {
          text-align: center;
          margin-top: 15px;
          padding: 10px;
          border-radius: 8px;
          font-size: 14px;
        }

        .status.info {
          background: #e3f2fd;
          color: #1976d2;
        }

        .status.success {
          background: #e8f5e9;
          color: #388e3c;
        }

        .status.error {
          background: #ffebee;
          color: #c62828;
        }

        @media (max-width: 480px) {
          .container {
            padding: 20px;
          }

          h1 {
            font-size: 20px;
          }

          button {
            padding: 12px 24px;
            font-size: 14px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📸 写真撮影</h1>

        <div class="video-container">
          <video id="video" autoplay playsinline></video>
        </div>

        <div class="preview" id="previewContainer">
          <div class="video-container">
            <img id="preview" />
          </div>
        </div>

        <canvas id="canvas"></canvas>

        <div class="controls">
          <button id="startCamera">カメラを起動</button>
          <button id="capture" disabled>撮影する</button>
          <button id="upload" disabled>アップロード</button>
        </div>

        <div id="status" class="status"></div>
      </div>

      <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const preview = document.getElementById('preview');
        const previewContainer = document.getElementById('previewContainer');
        const statusDiv = document.getElementById('status');
        const sessionId = '${sessionId}';
        let capturedBlob = null;

        // Save session ID to localStorage for later retrieval
        localStorage.setItem('skincare_session_id', sessionId);

        function setStatus(message, type = 'info') {
          statusDiv.textContent = message;
          statusDiv.className = 'status ' + type;
        }

        document.getElementById('startCamera').onclick = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' }
            });
            video.srcObject = stream;
            document.getElementById('capture').disabled = false;
            document.getElementById('startCamera').style.display = 'none';
            setStatus('カメラが起動しました', 'success');
          } catch (error) {
            setStatus('カメラへのアクセスに失敗しました', 'error');
          }
        };

        document.getElementById('capture').onclick = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);

          canvas.toBlob((blob) => {
            capturedBlob = blob;
            preview.src = URL.createObjectURL(blob);
            previewContainer.classList.add('show');
            document.getElementById('upload').disabled = false;
            setStatus('撮影完了！アップロードしてください', 'success');
          }, 'image/jpeg', 0.8);
        };

        document.getElementById('upload').onclick = async () => {
          if (!capturedBlob) return;

          setStatus('アップロード中...', 'info');
          document.getElementById('upload').disabled = true;

          const formData = new FormData();
          formData.append('image', capturedBlob, 'photo.jpg');
          formData.append('sessionId', sessionId);

          try {
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });

            const result = await response.json();

            if (result.success) {
              setStatus('アップロード完了！AI解析を開始しました', 'success');

              // Notify parent window to navigate to result page
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'upload_complete',
                  sessionId: sessionId
                }, '*');
              }
            } else {
              setStatus('エラー: ' + result.error.message, 'error');
              document.getElementById('upload').disabled = false;
            }
          } catch (error) {
            setStatus('アップロードエラー: ' + error.message, 'error');
            document.getElementById('upload').disabled = false;
          }
        };
      </script>
    </body>
    </html>
  `);
});

// GET /result - Result display page
router.get('/result', (req, res) => {
  const sessionId = req.query.session;

  // Result display page - optimized for iframe embedding
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>診断結果</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .container {
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 30px;
          max-width: 900px;
          width: 100%;
        }

        h1 {
          font-size: 24px;
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }

        .status {
          text-align: center;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 16px;
        }

        .status.loading {
          background: #e3f2fd;
          color: #1976d2;
        }

        .status.success {
          background: #e8f5e9;
          color: #388e3c;
        }

        .status.error {
          background: #ffebee;
          color: #c62828;
        }

        .progress-container {
          margin: 20px 0;
        }

        .progress-bar {
          width: 100%;
          height: 30px;
          background: #f0f0f0;
          border-radius: 15px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.5s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .comparison {
          display: none;
          gap: 20px;
          margin-top: 30px;
        }

        .comparison.show {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .image-container {
          text-align: center;
        }

        .image-container h3 {
          font-size: 18px;
          color: #555;
          margin-bottom: 15px;
        }

        .image-container img {
          width: 100%;
          height: auto;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .comparison.show {
            grid-template-columns: 1fr;
          }

          .container {
            padding: 20px;
          }

          h1 {
            font-size: 20px;
          }

          .image-container h3 {
            font-size: 16px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 肌診断結果</h1>

        <div id="status" class="status loading">
          <div class="spinner"></div>
          AI解析中...
        </div>

        <div class="progress-container" id="progressContainer">
          <div class="progress-bar">
            <div id="progressFill" class="progress-fill">0%</div>
          </div>
        </div>

        <div class="comparison" id="comparison">
          <div class="image-container">
            <h3>現在のあなた</h3>
            <img id="original" alt="オリジナル画像" />
          </div>
          <div class="image-container">
            <h3>ケア不足の肌予測</h3>
            <img id="generated" alt="生成画像" />
          </div>
        </div>
      </div>

      <script>
        // Get session ID from URL parameter or localStorage
        let sessionId = '${sessionId}' || null;
        if (!sessionId || sessionId === 'null' || sessionId === 'undefined') {
          sessionId = localStorage.getItem('skincare_session_id');
        }

        const statusDiv = document.getElementById('status');
        const progressFill = document.getElementById('progressFill');
        const progressContainer = document.getElementById('progressContainer');
        const comparison = document.getElementById('comparison');
        const original = document.getElementById('original');
        const generated = document.getElementById('generated');

        function setStatus(message, type = 'loading', showSpinner = false) {
          statusDiv.className = 'status ' + type;
          statusDiv.innerHTML = showSpinner
            ? '<div class="spinner"></div>' + message
            : message;
        }

        // Check if session ID exists
        if (!sessionId) {
          setStatus('セッションが見つかりません。先に写真を撮影してください。', 'error');
          progressContainer.style.display = 'none';
        } else {
          // Start checking status
          checkStatus();
        }

        async function checkStatus() {
          try {
            const response = await fetch(\`/api/status/\${sessionId}\`);
            const result = await response.json();

            if (result.success) {
              const { status: currentStatus, progress, message } = result.data;

              progressFill.style.width = progress + '%';
              progressFill.textContent = progress + '%';

              if (currentStatus === 'completed') {
                await loadResult();
              } else if (currentStatus === 'error') {
                setStatus('エラーが発生しました: ' + message, 'error');
                progressContainer.style.display = 'none';
              } else {
                setStatus(message || 'AI解析中...', 'loading', true);
                setTimeout(checkStatus, 2000);
              }
            } else {
              setStatus('セッションが見つかりません', 'error');
              progressContainer.style.display = 'none';
            }
          } catch (error) {
            setStatus('通信エラーが発生しました', 'error');
            progressContainer.style.display = 'none';
          }
        }

        async function loadResult() {
          try {
            const response = await fetch(\`/api/result/\${sessionId}\`);
            const result = await response.json();

            if (result.success) {
              original.src = result.data.originalUrl;
              generated.src = result.data.generatedUrl;
              comparison.classList.add('show');
              setStatus('解析完了！', 'success');
              progressContainer.style.display = 'none';

              // Notify parent window that result is ready
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'result_ready',
                  sessionId: sessionId
                }, '*');
              }
            } else {
              setStatus('結果の取得に失敗しました', 'error');
              progressContainer.style.display = 'none';
            }
          } catch (error) {
            setStatus('結果の読み込みに失敗しました', 'error');
            progressContainer.style.display = 'none';
          }
        }

      </script>
    </body>
    </html>
  `);
});

module.exports = router;