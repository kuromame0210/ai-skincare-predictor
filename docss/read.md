素晴らしいアイデアです！承知いたしました。

OpenAIの**DALL-E 3 API**（画像生成・編集機能）を使って、「自分の顔を撮影→アップロード→60歳になった時のリアルな画像（シワ・シミあり）を生成する」という単一ページのWebサイトを作成するプランですね。

これを実現するための、具体的な手順と、そのまま使えるNext.jsのコードを提示します。今日中にテストできるよう、最小限かつ最も重要な部分に絞って解説します。

***

### **開発の全体像**

1.  **フロントエンド (Next.js)**: ユーザーが画像をアップロードするためのUIを作成します。
2.  **バックエンド (Next.js API Route)**: フロントエンドから送られてきた画像をOpenAIのAPIに渡し、「60歳にして」という指示（プロンプト）と共に画像編集を依頼します。
3.  **OpenAI (DALL-E 3)**: 指示に従って元画像を編集し、シワやシミが加わった新しい画像を生成します。
4.  **フロントエンド (Next.js)**: 生成された画像をバックエンドから受け取り、画面に表示します。

このすべてを1つのNext.jsプロジェクト内で完結させます。

---

### **ステップ1：プロジェクトの準備**

まず、必要なものを揃え、Next.jsプロジェクトをセットアップします。

**1. OpenAI APIキーの取得**
*   [OpenAIのプラットフォームサイト](https://platform.openai.com/)にログインします。
*   右上のアカウントメニューから「View API keys」を選択します。
*   「Create new secret key」をクリックして、新しいAPIキーを作成します。**このキーは一度しか表示されないので、必ず安全な場所にコピーしてください。**

**2. Next.jsプロジェクトの作成とライブラリのインストール**
ターミナルで以下のコマンドを実行します。

```bash
# 1. Next.jsプロジェクトを作成
npx create-next-app@latest openai-face-ager

# 2. プロジェクトフォルダに移動
cd openai-face-ager

# 3. OpenAIの公式ライブラリをインストール
npm install openai
```

**3. APIキーの安全な設定**
プロジェクトのルートディレクトリ（`package.json`がある場所）に、`.env.local`という名前のファイルを**新規作成**し、以下の内容を記述します。

**.env.local**
```
OPENAI_API_KEY="ここに先ほどコピーしたAPIキーを貼り付け"
```
**注意:** このファイルはGitの管理対象外になるため、APIキーが外部に漏れるのを防ぎます。絶対に直接コードにキーを書き込まないでください。

---

### **ステップ2：コードの実装（フロントエンド＆バックエンド）**

次に、`app`フォルダ内のファイルを編集して、アプリの機能を作ります。

#### **フロントエンド部分 (`app/page.tsx`)**

`app/page.tsx`ファイルを開き、既存のコードを以下の内容に**すべて置き換えてください**。

```tsx
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      setOriginalImage(URL.createObjectURL(file));
      setGeneratedImage(null); // 新しい画像をアップしたら結果をリセット
      setError(null);
    }
  };

  const generateFutureFace = async () => {
    if (!originalFile) {
      setError('まず画像をアップロードしてください。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    const formData = new FormData();
    formData.append('image', originalFile);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '画像の生成に失敗しました。');
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto', padding: '20px', textAlign: 'center' }}>
      <h1>60歳の顔予測シミュレーター</h1>
      <p>あなたの顔写真をアップロードすると、AIが60歳になった時の姿を予測します。</p>

      <input
        type="file"
        accept="image/png, image/jpeg"
        ref={fileInputRef}
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
      
      <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
        画像を選択
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '30px', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h2>現在のあなた</h2>
          {originalImage ? (
            <Image src={originalImage} alt="Original" width={300} height={300} style={{ objectFit: 'cover', border: '1px solid #ccc' }} />
          ) : (
            <div style={{ width: '300px', height: '300px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ここに画像が表示されます
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h2>60歳のあなた (AI予測)</h2>
          {isLoading && <p>AIが生成中です... (30秒〜1分程度かかります)</p>}
          {error && <p style={{ color: 'red' }}>エラー: {error}</p>}
          {generatedImage ? (
             <Image src={generatedImage} alt="Generated" width={300} height={300} style={{ objectFit: 'cover', border: '1px solid #ccc' }} />
          ) : (
            <div style={{ width: '300px', height: '300px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ここに結果が表示されます
            </div>
          )}
        </div>
      </div>

      {originalImage && (
        <button onClick={generateFutureFace} disabled={isLoading} style={{ marginTop: '30px', padding: '15px 30px', fontSize: '20px', cursor: 'pointer', backgroundColor: isLoading ? '#ccc' : '#0070f3', color: 'white', border: 'none', borderRadius: '5px' }}>
          {isLoading ? '生成中...' : '未来の顔を生成する'}
        </button>
      )}
    </main>
  );
}
```

#### **バックエンド部分 (`app/api/generate-image/route.ts`)**

次に、API側のコードです。`app`フォルダの中に`api`というフォルダを、さらにその中に`generate-image`というフォルダを**新規作成**します。そして、その`generate-image`フォルダの中に`route.ts`というファイルを**新規作成**し、以下のコードを貼り付けます。

**ファイル構成:** `app/api/generate-image/route.ts`

```ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: '画像ファイルが見つかりません。' }, { status: 400 });
    }

    // ★★★ ここがAIへの指示（プロンプト）です ★★★
    const prompt = `
      A realistic photo of this person at 60 years old. 
      Add visible wrinkles around the eyes (crow's feet), on the forehead, and around the mouth. 
      Add some age spots and slight skin discoloration on the cheeks. 
      Maintain the original person's facial structure, hair color, and eye color.
      The result should be a photorealistic portrait.
    `;

    // DALL-E 3の画像編集APIを呼び出す
    const response = await openai.images.edit({
      image: imageFile,
      prompt: prompt,
      n: 1, // 生成する画像の数
      size: "1024x1024", // 生成する画像のサイズ
    });

    const imageUrl = response.data[0].url;

    if (!imageUrl) {
        throw new Error("APIから画像URLが返されませんでした。");
    }

    return NextResponse.json({ imageUrl });

  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json({ error: '画像の生成中にエラーが発生しました。' }, { status: 500 });
  }
}
```

---

### **ステップ3：実行とテスト**

1.  ターミナルで以下のコマンドを実行して、開発サーバーを起動します。
    ```bash
    npm run dev
    ```
2.  ブラウザで `http://localhost:3000` を開きます。
3.  「画像を選択」ボタンをクリックして、自分の顔写真（正面からはっきり写っているものが望ましい）を選びます。
4.  「未来の顔を生成する」ボタンをクリックします。
5.  「AIが生成中です...」というメッセージが表示され、30秒〜1分ほど待つと、右側に60歳になった時の予測画像が表示されます。

**これで、単体でのウェブサイトの動作テストは完了です！**

### **最終目標：LPへの埋め込み**

このテストが成功したら、次の手順で最終目標を達成します。

1.  **Vercelにデプロイ:** このNext.jsプロジェクトをVercelにデプロイし、公開URL（例: `https://openai-face-ager.vercel.app`）を取得します。
2.  **Squat Beyondで埋め込み:** 前回の回答で説明した通り、Squat BeyondのLP編集画面でHTML埋め込みブロックを使い、以下の`<iframe>`コードを貼り付けます。

    ```html
    <iframe
        src="https://[あなたのVercelアプリのURL]"
        width="100%"
        height="800" 
        style="border:none;"
        title="60歳の顔予測シミュレーター">
    </iframe>
    ```
    `height`の値は、アプリ全体がスクロールバーなしで表示されるように調整してください。

これで、あなたのLPに「未来の顔予測機能」を搭載することができます。LPの訪問者に強烈なインパクトを与え、商品の必要性を自分事として感じてもらう強力なフックになるはずです。