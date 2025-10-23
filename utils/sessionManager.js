const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.activeSessions = new Set();
    this.sessionData = new Map();
  }

  generateUniqueSessionId() {
    let sessionId;
    do {
      sessionId = crypto.randomBytes(16).toString('hex');
    } while (this.activeSessions.has(sessionId));
    
    this.activeSessions.add(sessionId);
    this.sessionData.set(sessionId, {
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    return sessionId;
  }

  isValidSession(sessionId) {
    return this.activeSessions.has(sessionId);
  }

  updateSessionActivity(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      const data = this.sessionData.get(sessionId);
      data.lastActivity = new Date();
      this.sessionData.set(sessionId, data);
    }
  }

  removeSession(sessionId) {
    this.activeSessions.delete(sessionId);
    this.sessionData.delete(sessionId);
  }

  cleanupExpiredSessions(maxAgeHours = 24) {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [sessionId, data] of this.sessionData.entries()) {
      if (now - data.lastActivity > maxAge) {
        this.removeSession(sessionId);
      }
    }
  }

  getSessionInfo(sessionId) {
    return this.sessionData.get(sessionId);
  }

  getAllActiveSessions() {
    return Array.from(this.activeSessions);
  }
}

const sessionManager = new SessionManager();

// 1時間ごとに期限切れセッションをクリーンアップ
setInterval(() => {
  sessionManager.cleanupExpiredSessions();
}, 60 * 60 * 1000);

module.exports = sessionManager;