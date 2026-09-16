// Violation Logger - Records and tracks test violations
(function() {
  class ViolationLogger {
    constructor(testId, userId, packId) {
      this.testId = testId;
      this.userId = userId;
      this.packId = packId;
      this.violations = [];
      this.startTime = Date.now();
      this.endTime = null;
      this.status = 'in_progress'; // in_progress, completed, time_expired, terminated, abandoned
      this.score = null;
      this.totalQuestions = 0;
      this.correctAnswers = 0;
    }

    addViolation(type, description, metadata = {}) {
      const violation = {
        type,
        description,
        timestamp: Date.now(),
        metadata
      };
      this.violations.push(violation);
      return violation;
    }

    complete(score, correctAnswers, totalQuestions, testStatus = 'completed') {
      this.endTime = Date.now();
      this.status = testStatus;
      this.score = score;
      this.correctAnswers = correctAnswers;
      this.totalQuestions = totalQuestions;
    }

    getReport() {
      return {
        testId: this.testId,
        userId: this.userId,
        packId: this.packId,
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.endTime ? this.endTime - this.startTime : Date.now() - this.startTime,
        status: this.status,
        score: this.score,
        correctAnswers: this.correctAnswers,
        totalQuestions: this.totalQuestions,
        violationCount: this.violations.length,
        violations: this.violations,
        violationTypes: this.getViolationTypes(),
        severity: this.calculateSeverity()
      };
    }

    getViolationTypes() {
      return [...new Set(this.violations.map(v => v.type))];
    }

    calculateSeverity() {
      if (this.violations.length === 0) return 'clean';
      if (this.violations.length === 1) return 'minor';
      if (this.violations.length <= 3) return 'moderate';
      return 'severe';
    }
  }

  window.ViolationLogger = ViolationLogger;
})();