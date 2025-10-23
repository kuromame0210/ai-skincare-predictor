# デプロイ手順

このドキュメントでは、AI Skincare Predictorバックエンドサーバーを本番環境にデプロイする手順を説明します。

## 目次

- [Render.comへのデプロイ](#rendercomへのデプロイ)
- [環境変数の設定](#環境変数の設定)
- [デプロイ後の確認](#デプロイ後の確認)
- [トラブルシューティング](#トラブルシューティング)

---

## Render.comへのデプロイ

Render.comは無料プランでNode.jsアプリケーションをホスティングできるプラットフォームです。

### 前提条件

- GitHubアカウント
- OpenAI APIキー（[https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)で取得）
- このリポジトリがGitHubにプッシュされていること

### 手順1: Render.comにサインアップ

1. [https://render.com](https://render.com) にアクセス
2. **"Get Started"** をクリック
3. GitHubアカウントでサインアップ/ログイン

### 手順2: 新しいWeb Serviceを作成

1. Renderダッシュボードで **"New +"** ボタンをクリック
2. **"Web Service"** を選択
3. **"Connect a repository"** セクションで:
   - GitHubアカウントを接続（初回のみ）
   - `ai-skincare-predictor` リポジトリを検索して選択
   - **"Connect"** をクリック

### 手順3: サービス設定の確認

`render.yaml` ファイルが自動的に検出され、以下の設定が適用されます:

```yaml
Name: skincare-backend
Environment: Node
Region: Singapore
Plan: Free
Build Command: cd backend && npm install
Start Command: cd backend && npm start
```

**"Apply"** または **"Create Web Service"** をクリックして次に進みます。

---

## 環境変数の設定

デプロイ前に、必須の環境変数を設定する必要があります。

### 手順4: 環境変数を追加

1. サービス設定画面で **"Environment"** タブをクリック
2. 以下の環境変数を追加:

#### 必須の環境変数

| キー | 値 | 説明 |
|------|-----|------|
| `OPENAI_API_KEY` | `sk-proj-xxxxx...` | OpenAI APIキー（[取得方法](https://platform.openai.com/api-keys)） |
| `BASE_URL` | `https://your-service.onrender.com` | デプロイ後のサービスURL（後で設定可能） |

#### 環境変数の設定方法

1. **"Add Environment Variable"** をクリック
2. **Key**: `OPENAI_API_KEY`
3. **Value**: 実際のAPIキーを貼り付け
4. もう一度 **"Add Environment Variable"** をクリック
5. **Key**: `BASE_URL`
6. **Value**: 初回は空欄でOK（デプロイ後に更新）

### 手順5: デプロイ開始

1. **"Save Changes"** をクリック
2. 自動的にビルドとデプロイが開始されます
3. **"Logs"** タブでデプロイの進行状況を確認

### デプロイ成功のサイン

ログに以下のメッセージが表示されれば成功です:

```
🚀 Server is running on port 10000
📱 Camera page: http://localhost:10000/camera
📊 Result page: http://localhost:10000/result
🏥 Health check: http://localhost:10000/health
```

---

## デプロイ後の確認

### 手順6: サービスURLの確認と更新

1. デプロイ完了後、Renderが提供するURLをコピー
   - 例: `https://skincare-backend.onrender.com`
2. **"Environment"** タブに戻る
3. `BASE_URL` 環境変数を実際のURLに更新:
   ```
   BASE_URL=https://skincare-backend.onrender.com
   ```
4. **"Save Changes"** をクリックして再デプロイ

### 手順7: ヘルスチェック

ブラウザまたはcurlで以下のエンドポイントにアクセス:

```bash
curl https://your-service.onrender.com/health
```

正常なレスポンス例:
```json
{
  "status": "OK",
  "message": "Skin Care Backend Server is running",
  "timestamp": "2025-10-23T12:34:56.789Z"
}
```

### 手順8: API動作確認

画像アップロードAPIをテスト:

```bash
curl -X POST https://your-service.onrender.com/api/upload \
  -F "image=@test-image.png"
```

成功レスポンス例:
```json
{
  "success": true,
  "data": {
    "sessionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "status": "processing",
    "originalUrl": "https://your-service.onrender.com/images/original_xxxxx.png",
    "message": "画像をアップロードしました。AI生成を開始します。"
  }
}
```

---

## Render.com 無料プランの仕様

### ストレージ

- **エフェメラルストレージ**: 再デプロイ時に `backend/public/uploads/` 内のファイルは削除されます
- **設計上の利点**:
  - セッション画像は一時的なものなので、自動的にクリーンアップされる
  - プライバシー保護（古い画像が残らない）
  - ストレージコストの節約

### スリープモード

- **15分間アクセスなし**: サービスがスリープ状態になります
- **再起動時間**: 次回アクセス時に30秒〜1分かかります
- **対策**: 重要な場合は有料プランにアップグレード（月$7〜）

### リソース制限

- **メモリ**: 512MB
- **CPU**: 0.1 CPU
- **帯域幅**: 100GB/月

---

## トラブルシューティング

### デプロイが失敗する

**症状**: ビルドエラーが発生

**原因と対策**:
1. `package.json` の依存関係を確認
   ```bash
   cd backend
   npm install
   ```
2. ローカルで動作確認
   ```bash
   npm start
   ```
3. Renderのログを確認してエラーメッセージを特定

### 画像生成が失敗する

**症状**: `/api/upload` は成功するが、画像生成が完了しない

**原因と対策**:
1. **OpenAI APIキーが正しいか確認**
   - Render.comの **"Environment"** タブで `OPENAI_API_KEY` を再確認
   - OpenAIのダッシュボードでAPIキーが有効か確認
   - 使用量制限に達していないか確認

2. **Renderのログを確認**
   - **"Logs"** タブで詳細なエラーメッセージを確認
   - OpenAI APIのエラーコードを特定

3. **ステータスAPIで確認**
   ```bash
   curl https://your-service.onrender.com/api/status/{sessionId}
   ```

### BASE_URLが正しく設定されていない

**症状**: 画像URLが `http://localhost:3001` になっている

**対策**:
1. **"Environment"** タブで `BASE_URL` を確認
2. 実際のRender.comのURLに更新
3. 保存して再デプロイ

### CORSエラー

**症状**: フロントエンドから接続できない

**対策**:
`backend/server.js` でCORS設定を確認:
```javascript
app.use(cors());  // 全てのオリジンを許可
```

特定のドメインのみ許可する場合:
```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com'
}));
```

---

## その他のデプロイオプション

### Heroku

Herokuも無料プランがありますが、2022年11月に無料プランが廃止されました。有料プランは月$7〜です。

### Railway

Railwayは月$5のスタータープランがあります。設定はRender.comと似ています。

### Vercel（フロントエンド + サーバーレス）

Vercelは静的サイトとサーバーレス関数のホスティングに適していますが、長時間実行されるプロセス（画像生成）には不向きです。

---

## 参考リンク

- [Render.com公式ドキュメント](https://render.com/docs)
- [OpenAI API ドキュメント](https://platform.openai.com/docs)
- [Sharp画像処理ライブラリ](https://sharp.pixelplumbing.com/)

---

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
