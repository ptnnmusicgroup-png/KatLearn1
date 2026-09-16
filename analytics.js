// Analytics & Dashboard Statistics
(function() {
  window.analyticsSystem = {
    async getDashboardStats(userId) {
      if (!window.studyStore?.user) {
        return this.getGuestStats();
      }

      try {
        // Simulate fetching from Firebase
        const stats = {
          totalPacks: 0,
          totalWords: 0,
          wordsLearned: 0,
          wordsMastered: 0,
          averageScore: 0,
          highestScore: 0,
          totalTests: 0,
          streak: 0,
          totalMinutes: 0,
          recentTests: [],
          weeklyProgress: [],
          monthlyProgress: []
        };

        // Fetch from localStorage as fallback
        const saved = localStorage.getItem('katlearn-stats');
        if (saved) {
          return JSON.parse(saved);
        }

        return stats;
      } catch (e) {
        console.error('Error fetching stats:', e);
        return this.getGuestStats();
      }
    },

    getGuestStats() {
      return {
        totalPacks: 0,
        totalWords: 0,
        wordsLearned: 0,
        wordsMastered: 0,
        averageScore: 0,
        highestScore: 0,
        totalTests: 0,
        streak: 0,
        totalMinutes: 0,
        recentTests: [],
        weeklyProgress: [],
        monthlyProgress: []
      };
    },

    async recordTestResult(userId, testResult) {
      const stats = JSON.parse(localStorage.getItem('katlearn-stats') || '{}');
      stats.totalTests = (stats.totalTests || 0) + 1;
      stats.averageScore = this.calculateAverage(
        stats.averageScore,
        testResult.score.percentage,
        stats.totalTests
      );
      stats.highestScore = Math.max(stats.highestScore || 0, testResult.score.percentage);

      if (testResult.recentTests) {
        stats.recentTests.unshift({
          date: new Date().toISOString(),
          score: testResult.score.percentage,
          pack: testResult.packName
        });
        stats.recentTests = stats.recentTests.slice(0, 10);
      }

      localStorage.setItem('katlearn-stats', JSON.stringify(stats));
      return stats;
    },

    calculateAverage(oldAvg, newValue, count) {
      if (count === 1) return newValue;
      return Math.round(((oldAvg * (count - 1)) + newValue) / count);
    },

    async generateWeeklyReport(userId) {
      const stats = await this.getDashboardStats(userId);
      return {
        week: new Date().toISOString().split('T')[0],
        testsCompleted: stats.totalTests,
        averageScore: stats.averageScore,
        totalMinutes: stats.totalMinutes,
        wordsReviewed: stats.totalWords
      };
    }
  };
})();