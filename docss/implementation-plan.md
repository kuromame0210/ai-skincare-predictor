# 実装プラン - スキンケア肌トラブル予測システム

## 実装ステップ

### Phase 1: 基盤構築 🏗️

#### 1-1. Railway プロジェクト作成
- [ ] Railway アカウント作成
- [ ] 新規プロジェクト作成
- [ ] PostgreSQL アドオン追加
- [ ] 環境変数設定（OPENAI_API_KEY）

#### 1-2. 基本サーバー構築
- [ ] Express サーバー作成
- [ ] 基本ルーティング設定
- [ ] PostgreSQL 接続設定
- [ ] 初回デプロイ確認

### Phase 2: データベース・API基盤 🗄️

#### 2-1. データベース設計
- [ ] sessions テーブル作成
- [ ] images テーブル作成
- [ ] マイグレーションスクリプト作成

#### 2-2. 基本API実装
- [ ] POST /api/upload (画像アップロード)
- [ ] GET /api/status/:sessionId (状況確認)
- [ ] GET /api/result/:sessionId (結果取得)
- [ ] GET /images/:filename (画像配信)

### Phase 3: 画像処理・AI機能 🤖

#### 3-1. 画像アップロード機能
- [ ] Multer 設定（ファイルアップロード）
- [ ] 画像形式・サイズバリデーション
- [ ] ファイル保存・URL生成
- [ ] セッション管理機能

#### 3-2. AI生成機能
- [ ] OpenAI API 統合
- [ ] 非同期処理（バックグラウンド生成）
- [ ] エラーハンドリング
- [ ] 進捗管理システム

### Phase 4: フロントエンド埋め込みコンポーネント 📱

#### 4-1. カメラ撮影コンポーネント
- [ ] HTML/CSS/JS 作成
- [ ] Camera API 実装
- [ ] 撮影・プレビュー機能
- [ ] アップロード処理
- [ ] 親ページとの通信

#### 4-2. 結果表示コンポーネント
- [ ] 結果画面 HTML/CSS 作成
- [ ] ポーリング機能実装
- [ ] 画像比較表示
- [ ] ローディング・エラー処理

### Phase 5: 統合テスト・最適化 ⚡

#### 5-1. 統合テスト
- [ ] エンドツーエンドテスト
- [ ] 異なるデバイスでの動作確認
- [ ] 埋め込み動作確認
- [ ] パフォーマンステスト

#### 5-2. 最適化・改善
- [ ] 画像圧縮最適化
- [ ] API レスポンス時間改善
- [ ] UI/UX 改善
- [ ] エラーメッセージ日本語化

## 詳細実装ガイド

### 1. プロジェクト構成

```
skin-care-backend/
├── package.json
├── server.js              # メインサーバー
├── routes/
│   ├── upload.js          # 画像アップロード
│   ├── status.js          # 状況確認
│   ├── result.js          # 結果取得
│   └── pages.js           # HTML ページ配信
├── models/
│   ├── database.js        # DB接続・クエリ
│   └── session.js         # セッション管理
├── services/
│   ├── imageProcessor.js  # 画像処理
│   ├── aiGenerator.js     # AI生成
│   └── fileManager.js     # ファイル管理
├── middleware/
│   ├── multer.js          # ファイルアップロード
│   └── validation.js      # バリデーション
├── public/
│   ├── camera.html        # カメラ撮影画面
│   ├── result.html        # 結果表示画面
│   ├── css/
│   ├── js/
│   └── uploads/           # アップロード画像
└── migrations/
    └── init.sql           # DB初期化
```

### 2. 重要な実装ポイント

#### セッション管理
```javascript
// UUID v4 でセッション作成
const { v4: uuidv4 } = require('uuid');
const sessionId = uuidv4();

// LocalStorage でクライアント管理
localStorage.setItem('skincare_session', sessionId);
```

#### 非同期AI生成
```javascript
// アップロード時に即座にレスポンス
app.post('/api/upload', async (req, res) => {
  const sessionId = await saveImage(req.file);
  
  // バックグラウンドでAI生成開始
  processImageAsync(sessionId);
  
  // 即座にレスポンス
  res.json({ sessionId, status: 'processing' });
});
```

#### iframe 間通信
```javascript
// カメラコンポーネント → 親ページ
window.parent.postMessage('upload_complete', '*');

// 親ページで受信
window.addEventListener('message', (event) => {
  if (event.data === 'upload_complete') {
    // 結果ページにリダイレクト
  }
});
```

### 3. テスト用HTML埋め込みコード

#### カメラ埋め込み
```html
<script>
  const sessionId = Date.now().toString(); // 簡易セッションID
  localStorage.setItem('skincare_session', sessionId);
</script>

<iframe 
  id="camera-frame"
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>

<script>
  document.getElementById('camera-frame').src = 
    `https://your-app.railway.app/camera?session=${sessionId}`;
</script>
```

#### 結果埋め込み
```html
<script>
  const sessionId = localStorage.getItem('skincare_session');
  document.getElementById('result-frame').src = 
    `https://your-app.railway.app/result?session=${sessionId}`;
</script>

<iframe 
  id="result-frame"
  width="100%" 
  height="800px"
  frameborder="0">
</iframe>
```

## 開発環境セットアップ

### ローカル開発
```bash
# プロジェクト作成
mkdir skin-care-backend
cd skin-care-backend
npm init -y

# 依存関係インストール
npm install express multer pg uuid cors dotenv
npm install -D nodemon

# Railway CLI インストール
npm install -g @railway/cli

# 環境変数設定
echo "OPENAI_API_KEY=your_key" > .env
echo "DATABASE_URL=your_postgres_url" >> .env
```

### Railway デプロイ
```bash
# Railway ログイン
railway login

# プロジェクト連携
railway link

# デプロイ
railway up
```

## 想定される課題と対策

### 1. AI生成時間の長さ
- **問題**: DALL-E API の応答時間（15-30秒）
- **対策**: 進捗表示、バックグラウンド処理、適切なユーザー案内

### 2. 画像サイズとパフォーマンス
- **問題**: 大きな画像のアップロード・処理時間
- **対策**: クライアントサイド圧縮、適切なサイズ制限

### 3. セッション管理の複雑さ
- **問題**: iframe間でのセッション共有
- **対策**: LocalStorage + URL パラメータの併用

### 4. エラーハンドリング
- **問題**: AI生成失敗、ネットワークエラー
- **対策**: リトライ機能、適切なエラー表示

## マイルストーン

- **Week 1**: Phase 1-2 完了（基盤・API）
- **Week 2**: Phase 3 完了（画像・AI機能）
- **Week 3**: Phase 4 完了（フロントエンド）
- **Week 4**: Phase 5 完了（テスト・最適化）