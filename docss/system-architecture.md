# スキンケア肌トラブル予測システム - システム設計書

## 概要

肌診断LPから埋め込み可能な肌トラブル予測システム。ユーザーの写真を撮影し、AIがケア不足による肌トラブルを予測表示する。

## システム構成

```
肌診断LP (サイトビルダー)
    ↓
📸 カメラ撮影埋め込み (iframe)
    ↓
Railway API (画像処理・AI生成)
    ↓
📊 結果表示埋め込み (iframe)
```

## コンポーネント設計

### 1. 埋め込みコンポーネント

#### A. カメラ撮影コンポーネント
```html
<!-- LP最終画面に埋め込み -->
<iframe 
  src="https://your-railway-app.railway.app/camera?session=SESSION_ID" 
  width="100%" 
  height="600px"
  frameborder="0">
</iframe>
```

#### B. 結果表示コンポーネント
```html
<!-- 結果ページに埋め込み -->
<iframe 
  src="https://your-railway-app.railway.app/result?session=SESSION_ID" 
  width="100%" 
  height="800px"
  frameborder="0">
</iframe>
```

### 2. セッション管理（クライアントサイド）

```javascript
// LP側のJavaScript
const sessionId = generateUUID();
localStorage.setItem('skincare_session', sessionId);

// iframe URL生成
const cameraUrl = `https://api.railway.app/camera?session=${sessionId}`;
const resultUrl = `https://api.railway.app/result?session=${sessionId}`;
```

## Railway API設計

### エンドポイント一覧

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/upload` | 画像アップロード・AI生成開始 |
| GET | `/api/status/:sessionId` | 生成状況確認 |
| GET | `/api/result/:sessionId` | 結果取得（両画像URL） |
| GET | `/camera?session=xxx` | カメラ撮影画面 |
| GET | `/result?session=xxx` | 結果表示画面 |
| GET | `/images/:filename` | 画像配信 |

### API レスポンス仕様

#### POST /api/upload
```json
{
  "sessionId": "uuid-string",
  "status": "processing",
  "message": "画像をアップロードしました。AI生成を開始します。"
}
```

#### GET /api/status/:sessionId
```json
{
  "status": "processing", // processing | completed | error
  "progress": 50,         // 進捗率 (0-100)
  "message": "AI生成中です..."
}
```

#### GET /api/result/:sessionId
```json
{
  "status": "completed",
  "originalUrl": "https://api.railway.app/images/original_xxx.jpg",
  "generatedUrl": "https://api.railway.app/images/generated_xxx.jpg",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

## データベース設計

### テーブル構成（PostgreSQL）

```sql
-- セッションテーブル
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(50) DEFAULT 'created', -- created, processing, completed, error
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 画像テーブル
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  type VARCHAR(20) NOT NULL, -- 'original' | 'generated'
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## フロー設計

### 1. 画像撮影・アップロードフロー

```
1. LP → localStorage に sessionId 保存
2. カメラiframe → session パラメータで受け取り
3. 撮影 → FormData で API に POST
4. API → 画像保存 → AI生成開始（バックグラウンド）
5. 即座にレスポンス → 親ページに完了通知
```

### 2. 結果表示フロー

```
1. 結果ページ → sessionId で iframe 埋め込み
2. ポーリング開始 → /api/status/:sessionId を2秒間隔でチェック
3. completed → /api/result/:sessionId で画像URL取得
4. 両画像を並べて表示
```

### 3. AI生成フロー（バックグラウンド）

```
1. 画像アップロード → sessions テーブル作成
2. 非同期でOpenAI DALL-E API呼び出し
3. 生成完了 → generated画像保存
4. sessions.status を 'completed' に更新
```

## 技術スタック

### フロントエンド（埋め込み）
- Pure HTML/CSS/JavaScript
- Camera API (getUserMedia)
- Canvas API (画像処理)
- LocalStorage (セッション管理)

### バックエンド（Railway）
- Node.js + Express
- Multer (ファイルアップロード)
- PostgreSQL (データベース)
- OpenAI API (DALL-E)
- UUID (セッション管理)

### インフラ
- Railway (ホスティング + DB + ストレージ)
- Railway PostgreSQL (無料枠)
- Railway Static Files (画像配信)

## セキュリティ考慮事項

1. **セッション管理**: UUIDで一意性確保、時間制限付き
2. **ファイルアップロード**: 画像形式制限、サイズ制限
3. **API制限**: レート制限、CORS設定
4. **画像保存**: 一定期間後自動削除

## パフォーマンス最適化

1. **画像圧縮**: アップロード前にクライアントサイドで圧縮
2. **AI生成**: 512x512サイズで高速化
3. **キャッシュ**: 静的ファイル配信の最適化
4. **ポーリング**: 適切な間隔設定で負荷軽減

## 今後の拡張可能性

1. **複数AI効果**: 年齢別、肌質別の予測
2. **画像比較機能**: Before/After のスライダー
3. **結果共有**: SNS連携機能
4. **分析データ**: 肌診断レポート生成