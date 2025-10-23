const express = require('express');
const { getSessionStatus } = require('../services/imageGeneration');
const router = express.Router();

// GET /api/status/:sessionId
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 実際のセッション状態を取得
    const sessionStatus = getSessionStatus(sessionId);

    console.log(`📊 Status check: ${sessionId} - ${sessionStatus.status} (${sessionStatus.progress}%)`);

    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        status: sessionStatus.status,
        progress: sessionStatus.progress,
        message: sessionStatus.message,
        error: sessionStatus.error || undefined
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: 'ステータス確認中にエラーが発生しました。'
      }
    });
  }
});

module.exports = router;