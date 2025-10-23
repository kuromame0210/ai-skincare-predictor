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

  // Simple camera page (will be enhanced later)
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>写真撮影</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        video { max-width: 100%; height: auto; border: 2px solid #ddd; }
        canvas { display: none; }
        button { padding: 10px 20px; font-size: 16px; margin: 10px; cursor: pointer; }
        .preview { margin: 20px 0; }
        .preview img { max-width: 300px; border: 2px solid #ddd; }
      </style>
    </head>
    <body>
      <h1>📸 写真を撮影してください</h1>
      <p>セッションID: <code>${sessionId}</code></p>
      
      <video id="video" autoplay playsinline></video>
      <canvas id="canvas"></canvas>
      
      <div>
        <button id="startCamera">カメラを開始</button>
        <button id="capture" disabled>撮影する</button>
        <button id="upload" disabled>アップロードする</button>
      </div>
      
      <div class="preview">
        <img id="preview" style="display: none;" />
      </div>
      
      <div id="status"></div>
      
      <!-- デバッグ情報セクション -->
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #495057;">🔍 デバッグ情報</h3>
        <div id="debug-camera" style="margin: 10px 0; padding: 10px; background: #ffffff; border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
        <div id="debug-upload" style="margin: 10px 0; padding: 10px; background: #ffffff; border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
        <div id="debug-camera-timeline" style="margin: 10px 0; padding: 10px; background: #ffffff; border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
      </div>

      <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const preview = document.getElementById('preview');
        const status = document.getElementById('status');
        const sessionId = '${sessionId}';
        let capturedBlob = null;
        
        // デバッグ用要素
        const debugCamera = document.getElementById('debug-camera');
        const debugUpload = document.getElementById('debug-upload');
        const debugCameraTimeline = document.getElementById('debug-camera-timeline');
        
        // タイムライン管理
        let cameraTimeline = [];
        
        function addToCameraTimeline(event) {
          cameraTimeline.push({
            time: new Date().toLocaleTimeString(),
            event: event
          });
          updateCameraTimeline();
        }
        
        function updateCameraInfo(info) {
          debugCamera.innerHTML = \`
            <strong>📹 カメラ情報:</strong><br>
            セッションID: \${sessionId}<br>
            カメラ状態: \${info.cameraStatus || 'unknown'}<br>
            撮影状態: \${info.captureStatus || 'none'}<br>
            ファイルサイズ: \${info.fileSize || 'unknown'}<br>
            ファイル形式: \${info.fileType || 'unknown'}
          \`;
        }
        
        function updateUploadInfo(info) {
          debugUpload.innerHTML = \`
            <strong>📤 アップロード情報:</strong><br>
            <pre>\${JSON.stringify(info, null, 2)}</pre>
          \`;
        }
        
        function updateCameraTimeline() {
          debugCameraTimeline.innerHTML = \`
            <strong>⏰ タイムライン:</strong><br>
            \${cameraTimeline.slice(-5).map(entry => \`\${entry.time}: \${entry.event}\`).join('<br>')}
          \`;
        }
        
        // 初期化
        addToCameraTimeline('カメラページロード完了');
        updateCameraInfo({
          cameraStatus: 'not_started',
          captureStatus: 'none'
        });

        document.getElementById('startCamera').onclick = async () => {
          try {
            addToCameraTimeline('カメラ開始要求');
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'user' } 
            });
            video.srcObject = stream;
            document.getElementById('capture').disabled = false;
            status.textContent = 'カメラが開始されました。撮影ボタンを押してください。';
            
            addToCameraTimeline('カメラ開始成功');
            updateCameraInfo({
              cameraStatus: 'active',
              captureStatus: 'ready'
            });
          } catch (error) {
            addToCameraTimeline(\`カメラエラー: \${error.message}\`);
            status.textContent = 'カメラへのアクセスに失敗しました: ' + error.message;
            updateCameraInfo({
              cameraStatus: 'error',
              captureStatus: 'failed'
            });
          }
        };

        document.getElementById('capture').onclick = () => {
          addToCameraTimeline('撮影開始');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            capturedBlob = blob;
            preview.src = URL.createObjectURL(blob);
            preview.style.display = 'block';
            document.getElementById('upload').disabled = false;
            status.textContent = '撮影完了！アップロードボタンを押してください。';
            
            addToCameraTimeline('撮影完了');
            updateCameraInfo({
              cameraStatus: 'active',
              captureStatus: 'captured',
              fileSize: \`\${Math.round(blob.size / 1024)}KB\`,
              fileType: blob.type
            });
          }, 'image/jpeg', 0.8);
        };

        document.getElementById('upload').onclick = async () => {
          if (!capturedBlob) return;
          
          addToCameraTimeline('アップロード開始');
          status.textContent = 'アップロード中...';
          
          const formData = new FormData();
          formData.append('image', capturedBlob, 'photo.jpg');
          formData.append('sessionId', sessionId);

          try {
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });

            const result = await response.json();
            
            addToCameraTimeline(\`アップロードレスポンス受信 (status: \${response.status})\`);
            updateUploadInfo(result);
            
            if (result.success) {
              addToCameraTimeline('アップロード成功 - AI生成開始');
              status.innerHTML = \`
                アップロード完了！AI生成を開始しました。<br>
                <a href="/result?session=\${sessionId}">📊 結果ページ</a>で進捗を確認してください。
              \`;
              
              // Notify parent window
              if (window.parent) {
                window.parent.postMessage('upload_complete', '*');
              }
            } else {
              addToCameraTimeline(\`アップロードエラー: \${result.error.message}\`);
              status.textContent = 'エラー: ' + result.error.message;
            }
          } catch (error) {
            addToCameraTimeline(\`ネットワークエラー: \${error.message}\`);
            status.textContent = 'アップロードエラー: ' + error.message;
            updateUploadInfo({ error: error.message, type: 'network_error' });
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
  
  if (!sessionId) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>エラー</title></head>
      <body>
        <h1>エラー</h1>
        <p>セッションIDが指定されていません。</p>
      </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>診断結果</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .comparison { display: flex; justify-content: space-around; margin: 20px 0; }
        .image-container { flex: 1; margin: 0 10px; }
        .image-container img { max-width: 100%; height: auto; border: 2px solid #ddd; }
        .loading { color: #666; }
        .error { color: red; }
        .progress { margin: 20px 0; }
        .progress-bar { width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: #4CAF50; transition: width 0.3s; }
      </style>
    </head>
    <body>
      <h1>📊 肌診断結果</h1>
      <p>セッションID: <code>${sessionId}</code></p>
      
      <div style="margin: 20px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
        <p><strong>テスト用：</strong> セッションが見つからない場合は、まず<a href="/camera?session=${sessionId}">📸 カメラページ</a>で画像をアップロードしてください</p>
      </div>
      
      <div id="status" class="loading">セッション状態を確認中...</div>
      
      <!-- デバッグ情報セクション -->
      <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #495057;">🔍 デバッグ情報</h3>
        <div id="debug-session" style="margin: 10px 0; padding: 10px; background: #ffffff; border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
        <div id="debug-api" style="margin: 10px 0; padding: 10px; background: #ffffff; border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
        <div id="debug-timeline" style="margin: 10px 0; padding: 10px; background: #ffffff; border-radius: 4px; font-family: monospace; font-size: 12px;"></div>
      </div>
      
      <div class="progress">
        <div class="progress-bar">
          <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
        </div>
        <div id="progress-text">0%</div>
      </div>
      
      <div class="comparison" id="comparison" style="display: none;">
        <div class="image-container">
          <h3>現在のあなた</h3>
          <img id="original" alt="オリジナル画像" />
        </div>
        <div class="image-container">
          <h3>ケア不足の肌予測</h3>
          <img id="generated" alt="生成画像" />
        </div>
      </div>

      <script>
        const sessionId = '${sessionId}';
        const status = document.getElementById('status');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const comparison = document.getElementById('comparison');
        const original = document.getElementById('original');
        const generated = document.getElementById('generated');
        
        // デバッグ用要素
        const debugSession = document.getElementById('debug-session');
        const debugAPI = document.getElementById('debug-api');
        const debugTimeline = document.getElementById('debug-timeline');
        
        // タイムライン管理
        let timeline = [];
        
        function addToTimeline(event) {
          timeline.push({
            time: new Date().toLocaleTimeString(),
            event: event
          });
          updateDebugTimeline();
        }
        
        function updateDebugSession(sessionData) {
          debugSession.innerHTML = \`
            <strong>📋 セッション情報:</strong><br>
            セッションID: \${sessionId}<br>
            ステータス: \${sessionData.status || 'unknown'}<br>
            プログレス: \${sessionData.progress || 0}%<br>
            メッセージ: \${sessionData.message || 'なし'}<br>
            エラー: \${sessionData.error || 'なし'}
          \`;
        }
        
        function updateDebugAPI(apiResponse) {
          debugAPI.innerHTML = \`
            <strong>🔌 API レスポンス:</strong><br>
            <pre>\${JSON.stringify(apiResponse, null, 2)}</pre>
          \`;
        }
        
        function updateDebugTimeline() {
          debugTimeline.innerHTML = \`
            <strong>⏰ タイムライン:</strong><br>
            \${timeline.slice(-5).map(entry => \`\${entry.time}: \${entry.event}\`).join('<br>')}
          \`;
        }
        
        // 初期化
        addToTimeline('ページロード完了');

        async function checkStatus() {
          try {
            addToTimeline('API ステータス確認開始');
            const response = await fetch(\`/api/status/\${sessionId}\`);
            const result = await response.json();
            
            // デバッグ情報を更新
            updateDebugAPI(result);
            addToTimeline(\`API レスポンス受信 (status: \${response.status})\`);
            
            if (result.success) {
              const { status: currentStatus, progress, message, error } = result.data;
              
              // セッション情報を更新
              updateDebugSession(result.data);
              addToTimeline(\`セッション状態: \${currentStatus} (\${progress}%)\`);
              
              status.textContent = message || 'ステータスメッセージなし';
              progressFill.style.width = progress + '%';
              progressText.textContent = progress + '%';
              
              if (currentStatus === 'completed') {
                addToTimeline('AI生成完了 - 結果読み込み開始');
                await loadResult();
              } else if (currentStatus === 'error') {
                addToTimeline(\`エラー発生: \${error || message}\`);
                status.textContent = 'エラー: ' + (error || message);
                status.className = 'error';
              } else {
                addToTimeline('処理継続中 - 2秒後に再確認');
                setTimeout(checkStatus, 2000);
              }
            } else {
              addToTimeline(\`API エラー: \${result.error.message}\`);
              status.textContent = 'ステータス確認エラー: ' + result.error.message;
              status.className = 'error';
              
              // セッション情報を更新（エラー状態）
              updateDebugSession({
                status: 'not_found',
                progress: 0,
                message: result.error.message,
                error: result.error.code
              });
              
              if (result.error.message.includes('セッションが見つかりません')) {
                status.innerHTML = \`
                  セッションが見つかりません。<br>
                  <a href="/camera?session=\${sessionId}">📸 カメラページ</a>で画像をアップロードしてセッションを作成してください。
                \`;
              }
            }
          } catch (error) {
            addToTimeline(\`ネットワークエラー: \${error.message}\`);
            status.textContent = 'ネットワークエラー: ' + error.message;
            status.className = 'error';
            updateDebugAPI({ error: error.message, type: 'network_error' });
          }
        }

        async function loadResult() {
          try {
            addToTimeline('結果データ取得開始');
            const response = await fetch(\`/api/result/\${sessionId}\`);
            const result = await response.json();
            
            updateDebugAPI(result);
            addToTimeline(\`結果API レスポンス受信 (status: \${response.status})\`);
            
            if (result.success) {
              addToTimeline('結果取得成功 - 画像表示');
              original.src = result.data.originalUrl;
              generated.src = result.data.generatedUrl;
              comparison.style.display = 'flex';
              status.textContent = \`生成完了！(モデル: \${result.data.modelUsed || 'unknown'})\`;
              status.className = '';
              document.querySelector('.progress').style.display = 'none';
              
              // 完了時のセッション情報更新
              updateDebugSession({
                ...result.data,
                status: 'completed'
              });
            } else {
              addToTimeline(\`結果取得エラー: \${result.error.message}\`);
              status.textContent = '結果取得エラー: ' + result.error.message;
              status.className = 'error';
            }
          } catch (error) {
            addToTimeline(\`結果読み込みエラー: \${error.message}\`);
            status.textContent = '結果読み込みエラー: ' + error.message;
            status.className = 'error';
            updateDebugAPI({ error: error.message, type: 'result_load_error' });
          }
        }

        // Start checking status
        checkStatus();
      </script>
    </body>
    </html>
  `);
});

module.exports = router;