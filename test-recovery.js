// Test Recovery System - Maintains test state using IndexedDB
(function() {
  const DB_NAME = 'KatLearn_TestDB';
  const STORE_NAME = 'active_tests';
  let db = null;

  async function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'testId' });
        }
      };
    });
  }

  window.testRecovery = {
    async saveTestState(testId, state) {
      if (!db) await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
          testId,
          state,
          savedAt: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },

    async getTestState(testId) {
      if (!db) await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(testId);
        request.onsuccess = () => resolve(request.result?.state);
        request.onerror = () => reject(request.error);
      });
    },

    async clearTestState(testId) {
      if (!db) await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(testId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },

    async hasActiveTest(testId) {
      const state = await this.getTestState(testId);
      return !!state;
    }
  };

  // Auto-save test state every 5 seconds when in test mode
  window.addEventListener('anti-cheat:test-state-update', async (e) => {
    const { testId, state } = e.detail;
    if (testId && state) {
      await window.testRecovery.saveTestState(testId, state);
    }
  });
})();