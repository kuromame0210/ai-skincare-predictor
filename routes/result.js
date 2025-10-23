const express = require('express');
const { getResult, getSessionStatus } = require('../services/imageGeneration');
const router = express.Router();

// GET /api/result/:sessionId
router.get('/result/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 結果を取得
    const result = getResult(sessionId);
    
    if (!result) {
      // セッション状態を確認
      const sessionStatus = getSessionStatus(sessionId);
      
      if (sessionStatus.status === 'error') {
        return res.status(500).json({
          success: false,
          error: {
            code: 'GENERATION_ERROR',
            message: sessionStatus.message || 'AI生成中にエラーが発生しました。'
          }
        });
      }
      
      // まだ処理中
      return res.status(202).json({
        success: false,
        error: {
          code: 'PROCESSING',
          message: 'まだ生成中です。しばらくしてから再度お試しください。'
        }
      });
    }

    console.log(`📋 Result retrieved: ${sessionId}`);

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        status: 'completed',
        originalUrl: result.originalUrl,
        generatedUrl: result.generatedUrl,
        modelUsed: result.modelUsed,
        createdAt: result.createdAt,
        completedAt: result.completedAt
      }
    });

  } catch (error) {
    console.error('Result retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RESULT_ERROR',
        message: '結果取得中にエラーが発生しました。'
      }
    });
  }
});

// Mock function to simulate completed result (for testing)
router.post('/mock-complete/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  results.set(sessionId, {
    originalUrl: `${baseUrl}/images/original_${sessionId}.jpg`,
    generatedUrl: `${baseUrl}/images/generated_${sessionId}.jpg`,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  });

  res.json({ success: true, message: `Mock result set for ${sessionId}` });
});

module.exports = router;