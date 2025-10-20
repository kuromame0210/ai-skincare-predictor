# API仕様書 - スキンケア肌トラブル予測システム

## ベースURL

```
https://your-app.railway.app
```

## エンドポイント一覧

| Method | Endpoint | 説明 | 認証 |
|--------|----------|------|------|
| POST | `/api/upload` | 画像アップロード・AI生成開始 | なし |
| GET | `/api/status/:sessionId` | AI生成状況確認 | なし |
| GET | `/api/result/:sessionId` | 生成結果取得 | なし |
| GET | `/camera` | カメラ撮影画面HTML | なし |
| GET | `/result` | 結果表示画面HTML | なし |
| GET | `/images/:filename` | 画像ファイル配信 | なし |

---

## POST /api/upload

画像をアップロードし、AI生成を開始します。

### リクエスト

**Content-Type**: `multipart/form-data`

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `image` | File | ✓ | アップロード画像（JPEG/PNG、最大10MB） |
| `sessionId` | String | ○ | セッションID（未指定時は自動生成） |

### レスポンス

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "originalUrl": "https://your-app.railway.app/images/original_550e8400.jpg",
    "message": "画像をアップロードしました。AI生成を開始します。"
  }
}
```

### エラーレスポンス

**Status**: `400 Bad Request`
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE",
    "message": "対応していない画像形式です。JPEG または PNG をアップロードしてください。"
  }
}
```

**Status**: `413 Payload Too Large`
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "ファイルサイズが大きすぎます。10MB以下の画像をアップロードしてください。"
  }
}
```

---

## GET /api/status/:sessionId

AI生成の進捗状況を確認します。

### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `sessionId` | String | ✓ | セッションID（UUID） |

### レスポンス

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "progress": 75,
    "message": "AI生成中です...（あと約10秒）",
    "estimatedTimeRemaining": 10
  }
}
```

#### status の値

| 値 | 説明 |
|----|------|
| `created` | セッション作成済み、処理未開始 |
| `processing` | AI生成処理中 |
| `completed` | 生成完了 |
| `error` | エラー発生 |

### エラーレスポンス

**Status**: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "指定されたセッションが見つかりません。"
  }
}
```

---

## GET /api/result/:sessionId

生成完了後の結果（両画像のURL）を取得します。

### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `sessionId` | String | ✓ | セッションID（UUID） |

### レスポンス

**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "originalUrl": "https://your-app.railway.app/images/original_550e8400.jpg",
    "generatedUrl": "https://your-app.railway.app/images/generated_550e8400.jpg",
    "createdAt": "2025-01-01T12:00:00.000Z",
    "completedAt": "2025-01-01T12:00:30.000Z"
  }
}
```

### エラーレスポンス

**Status**: `202 Accepted** (まだ処理中)
```json
{
  "success": false,
  "error": {
    "code": "PROCESSING",
    "message": "まだ生成中です。しばらくしてから再度お試しください。"
  }
}
```

**Status**: `500 Internal Server Error** (生成失敗)
```json
{
  "success": false,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "AI生成に失敗しました。もう一度お試しください。"
  }
}
```

---

## GET /camera

カメラ撮影用のHTML画面を返します。

### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `session` | String | ○ | セッションID |

### レスポンス

**Status**: `200 OK`
**Content-Type**: `text/html`

カメラ撮影機能を含むHTML画面

---

## GET /result

結果表示用のHTML画面を返します。

### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `session` | String | ✓ | セッションID |

### レスポンス

**Status**: `200 OK`
**Content-Type**: `text/html`

画像比較表示機能を含むHTML画面

---

## GET /images/:filename

画像ファイルを配信します。

### パラメータ

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `filename` | String | ✓ | ファイル名 |

### レスポンス

**Status**: `200 OK`
**Content-Type**: `image/jpeg` または `image/png`

画像ファイルのバイナリデータ

### エラーレスポンス

**Status**: `404 Not Found`
```json
{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "指定されたファイルが見つかりません。"
  }
}
```

---

## エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `INVALID_FILE` | 400 | 無効なファイル形式 |
| `FILE_TOO_LARGE` | 413 | ファイルサイズ超過 |
| `SESSION_NOT_FOUND` | 404 | セッション未発見 |
| `PROCESSING` | 202 | 処理中 |
| `GENERATION_FAILED` | 500 | AI生成失敗 |
| `FILE_NOT_FOUND` | 404 | ファイル未発見 |
| `INTERNAL_ERROR` | 500 | 内部エラー |

---

## レート制限

| エンドポイント | 制限 |
|---------------|------|
| `/api/upload` | 10回/分/IP |
| `/api/status/*` | 30回/分/IP |
| `/api/result/*` | 30回/分/IP |

---

## CORS設定

```javascript
// 許可されたオリジン（埋め込み元サイト）
const allowedOrigins = [
  'https://your-lp-site.com',
  'http://localhost:3000',  // 開発用
];
```

---

## 使用例

### JavaScript での利用例

```javascript
// 1. 画像アップロード
const formData = new FormData();
formData.append('image', imageFile);
formData.append('sessionId', sessionId);

const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const uploadResult = await uploadResponse.json();
console.log(uploadResult.data.sessionId);

// 2. 状況監視（ポーリング）
const pollStatus = async () => {
  const response = await fetch(`/api/status/${sessionId}`);
  const result = await response.json();
  
  if (result.data.status === 'completed') {
    // 3. 結果取得
    const resultResponse = await fetch(`/api/result/${sessionId}`);
    const finalResult = await resultResponse.json();
    
    displayImages(
      finalResult.data.originalUrl,
      finalResult.data.generatedUrl
    );
  } else {
    // 2秒後に再チェック
    setTimeout(pollStatus, 2000);
  }
};

pollStatus();
```

### 埋め込み HTML での利用例

```html
<!-- カメラ埋め込み -->
<script>
  const sessionId = 'session-' + Date.now();
  localStorage.setItem('skincare_session', sessionId);
</script>

<iframe 
  src="https://your-app.railway.app/camera?session=sessionId"
  width="100%" height="600">
</iframe>

<!-- 結果埋め込み -->
<iframe 
  id="result-frame"
  width="100%" height="800">
</iframe>

<script>
  const sessionId = localStorage.getItem('skincare_session');
  document.getElementById('result-frame').src = 
    `https://your-app.railway.app/result?session=${sessionId}`;
</script>
```