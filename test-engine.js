// Test Engine - Supports multiple question types and advanced randomization
(function() {
  const questionTypes = {
    MULTIPLE_CHOICE: 'multiple_choice',
    TYPING: 'typing',
    ENG_TO_VN: 'eng_to_vn',
    VN_TO_ENG: 'vn_to_eng',
    LISTENING: 'listening',
    MATCHING: 'matching',
    FILL_BLANK: 'fill_blank',
    TRUE_FALSE: 'true_false'
  };

  class TestEngine {
    constructor(packData, options = {}) {
      this.pack = packData;
      this.words = packData.words || [];
      this.options = {
        questionCount: options.questionCount || 10,
        timeLimit: options.timeLimit || 600, // seconds
        questionTypes: options.questionTypes || [questionTypes.MULTIPLE_CHOICE],
        difficulty: options.difficulty || 'medium',
        randomizeAnswers: options.randomizeAnswers !== false,
        randomizeQuestions: options.randomizeQuestions !== false,
        negativeMarking: options.negativeMarking || false,
        ...options
      };

      this.currentQuestion = 0;
      this.answers = [];
      this.violations = 0;
      this.startTime = null;
      this.endTime = null;
      this.timeRemaining = this.options.timeLimit;
    }

    generateQuestions() {
      const questions = [];
      const selectedWords = this.selectWords(Math.min(this.options.questionCount, this.words.length));

      for (let i = 0; i < selectedWords.length; i++) {
        const word = selectedWords[i];
        const qType = this.selectRandomQuestionType();
        questions.push(this.createQuestion(word, qType, i));
      }

      return questions;
    }

    selectWords(count) {
      // Select words, prioritizing those user got wrong frequently
      const shuffled = [...this.words].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }

    selectRandomQuestionType() {
      const types = this.options.questionTypes;
      return types[Math.floor(Math.random() * types.length)];
    }

    createQuestion(word, type, index) {
      const baseQuestion = {
        id: `q_${index}`,
        type,
        word,
        index,
        points: 10
      };

      switch (type) {
        case questionTypes.MULTIPLE_CHOICE:
          return this.createMultipleChoice(baseQuestion);
        case questionTypes.TYPING:
          return this.createTyping(baseQuestion);
        case questionTypes.ENG_TO_VN:
          return this.createEngToVn(baseQuestion);
        case questionTypes.VN_TO_ENG:
          return this.createVnToEng(baseQuestion);
        case questionTypes.TRUE_FALSE:
          return this.createTrueFalse(baseQuestion);
        default:
          return this.createMultipleChoice(baseQuestion);
      }
    }

    createMultipleChoice(base) {
      const correctAnswer = base.word.meaning;
      const wrongAnswers = this.generateWrongAnswers(correctAnswer, 3);
      const allAnswers = [correctAnswer, ...wrongAnswers];
      const shuffled = allAnswers.sort(() => Math.random() - 0.5);

      return {
        ...base,
        question: `Từ "${base.word.word}" có nghĩa là gì?`,
        options: shuffled,
        correctIndex: shuffled.indexOf(correctAnswer),
        correctAnswer
      };
    }

    createTyping(base) {
      return {
        ...base,
        question: `Nhập nghĩa tiếng Việt của từ "${base.word.word}"`,
        correctAnswer: base.word.meaning,
        type: questionTypes.TYPING,
        caseSensitive: false,
        allowPartial: true
      };
    }

    createEngToVn(base) {
      return {
        ...base,
        question: `${base.word.word} (${base.word.ipa || ''}) → ?`,
        hint: base.word.example || '',
        correctAnswer: base.word.meaning,
        type: questionTypes.ENG_TO_VN
      };
    }

    createVnToEng(base) {
      return {
        ...base,
        question: `${base.word.meaning} → ?`,
        hint: base.word.example || '',
        correctAnswer: base.word.word,
        type: questionTypes.VN_TO_ENG
      };
    }

    createTrueFalse(base) {
      const isCorrect = Math.random() > 0.5;
      const meaning = isCorrect ? base.word.meaning : this.getWrongMeaning();

      return {
        ...base,
        question: `"${base.word.word}" có nghĩa là "${meaning}"?`,
        correctAnswer: isCorrect ? 'true' : 'false',
        type: questionTypes.TRUE_FALSE,
        options: ['Đúng', 'Sai']
      };
    }

    generateWrongAnswers(correct, count) {
      const wrong = [];
      const used = new Set([correct]);

      while (wrong.length < count && this.words.length > 0) {
        const word = this.words[Math.floor(Math.random() * this.words.length)];
        if (!used.has(word.meaning)) {
          wrong.push(word.meaning);
          used.add(word.meaning);
        }
      }

      return wrong;
    }

    getWrongMeaning() {
      const randomWord = this.words[Math.floor(Math.random() * this.words.length)];
      return randomWord?.meaning || 'sai';
    }

    checkAnswer(questionIndex, userAnswer, question) {
      const correctAnswer = question.correctAnswer;
      let isCorrect = false;

      if (question.type === questionTypes.MULTIPLE_CHOICE) {
        isCorrect = userAnswer === question.correctIndex;
      } else if (question.type === questionTypes.TYPING || question.type === questionTypes.ENG_TO_VN || question.type === questionTypes.VN_TO_ENG) {
        const userNorm = String(userAnswer).toLowerCase().trim();
        const correctNorm = String(correctAnswer).toLowerCase().trim();
        isCorrect = userNorm === correctNorm || this.checkPartialMatch(userNorm, correctNorm);
      } else if (question.type === questionTypes.TRUE_FALSE) {
        isCorrect = userAnswer === correctAnswer;
      }

      this.answers[questionIndex] = {
        questionId: question.id,
        userAnswer,
        correctAnswer,
        isCorrect,
        type: question.type,
        timestamp: Date.now()
      };

      return isCorrect;
    }

    checkPartialMatch(user, correct) {
      // Allow partial matches for typing (e.g., "abandon" vs "bỏ rơi")
      if (user.length > 2 && correct.length > 2) {
        const similarity = this.stringSimilarity(user, correct);
        return similarity > 0.7;
      }
      return false;
    }

    stringSimilarity(str1, str2) {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      if (longer.length === 0) return 1.0;
      const editDistance = this.getEditDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    }

    getEditDistance(s1, s2) {
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    }

    getScore() {
      const correct = this.answers.filter(a => a && a.isCorrect).length;
      const points = correct * 10;
      return {
        correct,
        total: this.answers.length,
        points,
        percentage: Math.round((correct / this.answers.length) * 100)
      };
    }
  }

  window.TestEngine = TestEngine;
  window.questionTypes = questionTypes;
})();