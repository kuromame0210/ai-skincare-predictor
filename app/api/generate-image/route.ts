import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getOptimalSize = (aspectRatio: number): string => {
  // Use smaller sizes for faster generation (512x512 is ~4x faster)
  if (aspectRatio > 1.2) {
    // Landscape - use 1024x1024 instead of 1536x1024 for speed
    return "1024x1024";
  } else if (aspectRatio < 0.8) {
    // Portrait - use 1024x1024 instead of 1024x1536 for speed
    return "1024x1024";
  } else {
    // Square - consider 512x512 for maximum speed
    return "512x512";
  }
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const aspectRatio = formData.get('aspectRatio') as string | null;

    if (!imageFile) {
      return NextResponse.json({ error: '画像ファイルが見つかりません。' }, { status: 400 });
    }

    // Get optimal size from aspect ratio (sent from frontend)
    const ratio = aspectRatio ? parseFloat(aspectRatio) : 1.0;
    const optimalSize = getOptimalSize(ratio);

    const prompt = `
      Add subtle skin imperfections: light age spots, slightly dull skin, minor pores, faint under-eye circles. Keep natural appearance - same person and age with minor skincare neglect effects only.
    `;

    // Try gpt-image-1 with edits API first, fallback to dall-e-2
    let response;
    let modelUsed = "";
    
    console.log("=== DEBUG: Starting image generation ===");
    console.log("File size:", imageFile.size);
    console.log("File type:", imageFile.type);
    console.log("Aspect ratio:", ratio);
    console.log("Optimal size:", optimalSize);
    console.log("Prompt:", prompt);
    
    try {
      console.log("=== Trying gpt-image-1 ===");
      response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
        n: 1,
        size: optimalSize as "512x512" | "1024x1024",
      });
      modelUsed = "gpt-image-1";
      console.log("✅ gpt-image-1 succeeded");
    } catch (gptError) {
      console.log("❌ gpt-image-1 failed:", gptError);
      console.log("=== Falling back to dall-e-2 ===");
      
      try {
        response = await openai.images.edit({
          model: "dall-e-2",
          image: imageFile,
          prompt: prompt,
          n: 1,
          size: "512x512", // Use smaller size for faster generation
          response_format: "url",
        });
        modelUsed = "dall-e-2";
        console.log("✅ dall-e-2 succeeded");
      } catch (dalleError) {
        console.log("❌ dall-e-2 also failed:", dalleError);
        throw dalleError;
      }
    }

    console.log("=== API Response Debug ===");
    console.log("Model used:", modelUsed);
    console.log("Response.data length:", response.data?.length);
    
    const firstItem = response.data?.[0];
    console.log("First item keys:", firstItem ? Object.keys(firstItem) : 'null');
    
    // Check for both URL and base64 formats
    const imageUrl = firstItem?.url;
    const base64Image = firstItem?.b64_json;
    
    console.log("Has URL:", !!imageUrl);
    console.log("Has base64:", !!base64Image);
    
    if (imageUrl) {
      console.log("✅ Using URL format");
      return NextResponse.json({ imageUrl });
    } else if (base64Image) {
      console.log("✅ Using base64 format - converting to data URL");
      const dataUrl = `data:image/png;base64,${base64Image}`;
      return NextResponse.json({ imageUrl: dataUrl });
    } else {
      console.log("❌ No image URL or base64 found in response");
      console.log("Available keys:", firstItem ? Object.keys(firstItem) : 'none');
      throw new Error(`APIから画像が返されませんでした。Model: ${modelUsed}`);
    }

  } catch (error: unknown) {
    console.error("OpenAI API Error:", error);
    return NextResponse.json({ error: '画像の生成中にエラーが発生しました。' }, { status: 500 });
  }
}