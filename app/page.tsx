'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1.0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();

      img.onload = () => {
        // Calculate and store aspect ratio
        const ratio = img.width / img.height;
        setAspectRatio(ratio);
        
        // Set canvas size to max 1024x1024 while maintaining aspect ratio
        const maxSize = 1024;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/png',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/png', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Compress the image before setting state
        const compressedFile = await compressImage(file, 0.8);
        setOriginalFile(compressedFile);
        setOriginalImage(URL.createObjectURL(compressedFile));
        setGeneratedImage(null);
        setError(null);
        
        console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB`);
        console.log(`Compressed size: ${(compressedFile.size / 1024).toFixed(2)}KB`);
        console.log(`Compression ratio: ${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`);
      } catch (error) {
        console.error('Image compression failed:', error);
        // Fallback to original file
        setOriginalFile(file);
        setOriginalImage(URL.createObjectURL(file));
        setGeneratedImage(null);
        setError(null);
      }
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
    formData.append('aspectRatio', aspectRatio.toString());

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

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="font-sans max-w-4xl mx-auto p-5 text-center">
      <h1 className="text-3xl font-bold mb-4">肌トラブル予測シミュレーター</h1>
      <p className="mb-8">スキンケアを怠った場合の肌の状態をAIが予測します。<br/>
        <small className="text-gray-600">※適切なケアで予防可能な肌トラブルを表示</small></p>

      <input
        type="file"
        accept="image/png, image/jpeg"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()} 
        className="px-5 py-2.5 text-base bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600 mb-8"
      >
        画像を選択
      </button>

      <div className="flex justify-around gap-5 mb-8">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4">現在のあなた</h2>
          {originalImage ? (
            <Image 
              src={originalImage} 
              alt="Original" 
              width={300} 
              height={300} 
              className="object-cover border border-gray-300 rounded"
            />
          ) : (
            <div className="w-72 h-72 border border-dashed border-gray-300 flex items-center justify-center rounded">
              ここに画像が表示されます
            </div>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-4">ケア不足の肌 (AI予測)</h2>
          {isLoading && <p className="text-gray-600">AIが生成中です... (15秒〜30秒程度かかります)</p>}
          {error && <p className="text-red-500">エラー: {error}</p>}
          {generatedImage ? (
             <Image 
               src={generatedImage} 
               alt="Generated" 
               width={300} 
               height={300} 
               className="object-cover border border-gray-300 rounded"
             />
          ) : (
            <div className="w-72 h-72 border border-dashed border-gray-300 flex items-center justify-center rounded">
              ここに結果が表示されます
            </div>
          )}
        </div>
      </div>

      {originalImage && (
        <button 
          onClick={generateFutureFace} 
          disabled={isLoading} 
          className={`px-8 py-4 text-xl border-none rounded cursor-pointer ${
            isLoading 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isLoading ? '生成中...' : '肌トラブルを予測する'}
        </button>
      )}
    </main>
  );
}
