import { StudentLearningSituation, TechniqueRecommendation, TechniqueSession, StudentTechniquePerformance, TechniqueFeedback } from '../models/academy.model.js'
import LearningProfile from '../models/learningProfile.model.js'
import { LEARNING_TECHNIQUES } from '../data/learningTechniques.data.js'

export const studyTechniqueEngineService = {
  getTechniquesCatalog() {
    return LEARNING_TECHNIQUES
  },

  getTechniqueById(techniqueId) {
    return LEARNING_TECHNIQUES.find((t) => t.id === techniqueId) || null
  },

  /**
   * Evaluate situation inputs and calculate situation-based recommendation
   */
  async evaluateSituation(userId, situationInputs) {
    const {
      timeAvailable = '1–3 hours',
      goal = 'Preparing for an upcoming exam',
      subject = 'General',
      difficulty = 'Moderate',
      interestLevel = 'Interested',
      preparationLevel = 'Some topics',
      confidenceLevel = 'Moderate',
      mainProblem = 'I understand but forget later'
    } = situationInputs

    // Save situation log for dataset
    let situationDoc = null
    try {
      situationDoc = await StudentLearningSituation.create({
        userId,
        timeAvailable,
        goal,
        subject,
        difficulty,
        interestLevel,
        preparationLevel,
        confidenceLevel,
        mainProblem
      })
    } catch (err) {
      console.warn('Situation log save notice:', err.message)
    }

    // Base score for all 12 techniques
    const scores = {
      'active-recall': 60,
      'spaced-repetition': 60,
      'retrieval-practice': 55,
      'practice-testing': 50,
      'feynman-technique': 50,
      'interleaving': 45,
      'pomodoro': 45,
      'concept-mapping': 40,
      'blurting': 40,
      'sq3r': 35,
      'teach-back': 35,
      'exam-simulation': 40
    }

    // Situation Rule Engine Adjustments
    const isExamUrgent = ['Exam tomorrow', 'Exam in a few days'].includes(goal) || ['Less than 1 hour', '1–3 hours'].includes(timeAvailable) || mainProblem === 'I have very little time' || mainProblem === 'I need to revise quickly'
    const isProblemSolvingNeeded = goal === 'Improving problem-solving' || mainProblem === 'I understand theory but cannot solve problems'
    const isConceptConfusion = goal === 'Understanding a new topic' || difficulty === 'Very Difficult' || mainProblem === 'I get confused between concepts'
    const isFocusLow = ['Not Interested', 'Not Very Interested'].includes(interestLevel) || mainProblem === 'I cannot concentrate' || confidenceLevel === 'Very Low'
    const isLongTermGoal = ['Learning for long-term knowledge', 'Preparing for an upcoming exam'].includes(goal) && ['1 week', 'More than 1 week'].includes(timeAvailable)
    const isLost = mainProblem === "I don't know where to start"
    const isInterview = goal === 'Preparing for an interview'

    if (isExamUrgent) {
      scores['active-recall'] += 35
      scores['blurting'] += 30
      scores['practice-testing'] += 25
      scores['exam-simulation'] += 25
      scores['spaced-repetition'] -= 35
      scores['sq3r'] -= 20
    }

    if (isLongTermGoal) {
      scores['spaced-repetition'] += 40
      scores['active-recall'] += 25
      scores['retrieval-practice'] += 20
    }

    if (isProblemSolvingNeeded) {
      scores['practice-testing'] += 35
      scores['interleaving'] += 35
      scores['retrieval-practice'] += 25
    }

    if (isConceptConfusion) {
      scores['feynman-technique'] += 40
      scores['concept-mapping'] += 35
      scores['teach-back'] += 30
    }

    if (isFocusLow) {
      scores['pomodoro'] += 45
      scores['active-recall'] += 20
    }

    if (isLost) {
      scores['sq3r'] += 40
      scores['pomodoro'] += 30
    }

    if (isInterview) {
      scores['teach-back'] += 40
      scores['active-recall'] += 30
      scores['interleaving'] += 20
    }

    // Rank techniques
    const rankedList = Object.keys(scores)
      .map((id) => {
        const cat = LEARNING_TECHNIQUES.find((t) => t.id === id) || {}
        const finalScore = Math.min(98, Math.max(30, scores[id]))
        return {
          id,
          name: cat.name || id,
          score: finalScore,
          tagline: cat.tagline,
          category: cat.category,
          description: cat.description,
          bestUsedWhen: cat.bestUsedWhen,
          notIdealWhen: cat.notIdealWhen,
          steps: cat.steps,
          recommendedDuration: cat.recommendedDuration,
          example: cat.example,
          commonMistakes: cat.commonMistakes,
          activities: cat.activities
        }
      })
      .sort((a, b) => b.score - a.score)

    const primary = rankedList[0]
    const secondary = rankedList.slice(1, 4)

    // Generate Custom Explainability Reason
    let whyReason = `Based on your situation (${subject}, Goal: ${goal}, Available Time: ${timeAvailable}, Confidence: ${confidenceLevel}), ${primary.name} is recommended because it matches your immediate study objective.`
    if (isExamUrgent) {
      whyReason = `You have limited time (${timeAvailable}) before your ${goal.toLowerCase()} in ${subject}. Passive rereading is ineffective right now; ${primary.name} allows you to quickly retrieve what you know and test your memory under pressure.`
    } else if (isLongTermGoal) {
      whyReason = `You have ${timeAvailable} to prepare for ${subject}. Because your goal is long-term retention, ${primary.name} systematically locks concepts into memory at expanding intervals.`
    } else if (isConceptConfusion) {
      whyReason = `You rated ${subject} as ${difficulty} and stated that you get confused between concepts. ${primary.name} forces you to simplify complex ideas and visually map relationships, exposing hidden gaps.`
    } else if (isProblemSolvingNeeded) {
      whyReason = `Understanding theory is different from problem-solving. ${primary.name} bridges the gap between passive reading and active problem execution under exam conditions.`
    } else if (isFocusLow) {
      whyReason = `Because your concentration or interest is low, long continuous study blocks cause burnout. ${primary.name} breaks study time into structured intervals to maintain focus without fatigue.`
    }

    // Generate "Why NOT this technique?" explanations
    const whyNotExplanations = []
    if (primary.id !== 'spaced-repetition') {
      whyNotExplanations.push({
        techniqueName: 'Spaced Repetition',
        reason: `Spaced Repetition is excellent for long-term retention over weeks, but given your current timeline (${timeAvailable} / ${goal}), your immediate priority is rapid retrieval testing rather than long-interval scheduling.`
      })
    }
    if (primary.id !== 'feynman-technique' && isExamUrgent) {
      whyNotExplanations.push({
        techniqueName: 'Feynman Technique',
        reason: `The Feynman Technique is superior for deep initial concept building, but with an urgent exam deadline (${goal}), rapid testing and blurting takes precedence.`
      })
    }
    if (primary.id !== 'pomodoro' && !isFocusLow) {
      whyNotExplanations.push({
        techniqueName: 'Pomodoro Focus Sessions',
        reason: `Pomodoro is ideal when focus is interrupted or procrastination is high. Since your focus level is stable, continuous active practice is more time-efficient.`
      })
    }

    // Generate Personalized Time-Allocated Schedule based on available time & subject
    const timeAllocatedPlan = this._generateTimeAllocatedPlan(timeAvailable, subject, primary.name)

    // Persist recommendation record
    try {
      await TechniqueRecommendation.create({
        userId,
        primaryTechnique: primary.name,
        primaryScore: primary.score,
        reason: whyReason,
        secondaryTechniques: secondary.map((s) => ({ name: s.name, score: s.score, reason: s.tagline })),
        recommendedAction: {
          subject,
          topic: `${subject} Core Module`,
          duration: 25,
          activity: `Execute ${primary.name} following the step-by-step instructions.`
        }
      })
    } catch (err) {
      console.warn('Recommendation record save notice:', err.message)
    }

    return {
      studentId: userId,
      situationId: situationDoc?._id || null,
      situationInputs,
      recommendedTechnique: primary,
      whyReason,
      secondaryTechniques: secondary,
      whyNotExplanations,
      timeAllocatedPlan,
      allScores: rankedList
    }
  },

  /**
   * Build time-allocated schedule based on time available
   */
  _generateTimeAllocatedPlan(timeAvailable, subject, techniqueName) {
    if (timeAvailable === 'Less than 1 hour') {
      return [
        { time: '0:00 – 0:15', title: `${techniqueName} – Key Formulas`, activity: `Read section for 5 mins, close notes, execute ${techniqueName} for 10 mins.` },
        { time: '0:15 – 0:20', title: 'Rest Break', activity: 'Step away from screens and stretch.' },
        { time: '0:20 – 0:35', title: 'Diagnostic Quizzing', activity: 'Attempt 5 practice questions without checking answer keys.' },
        { time: '0:35 – 0:45', title: 'Error Correction', activity: 'Review missed questions in red ink and re-test.' },
      ]
    }

    if (timeAvailable === '3–6 hours') {
      return [
        { time: '0:00 – 0:50', title: `Module 1: ${techniqueName} Sprint`, activity: `Study core ${subject} concepts and complete blind recall.` },
        { time: '0:50 – 1:00', title: 'Rest Break', activity: 'Hydrate and stretch.' },
        { time: '1:00 – 1:50', title: `Module 2: Practice Testing`, activity: 'Attempt 10 diagnostic problems under test conditions.' },
        { time: '1:50 – 2:00', title: 'Rest Break', activity: 'Short walk or relaxation.' },
        { time: '2:00 – 2:50', title: `Module 3: Error Gap Review`, activity: 'Review weak concepts and execute secondary technique.' },
        { time: '2:50 – 3:00', title: 'Final Assessment Wrap-Up', activity: 'Take a mini 10-question final progress quiz.' },
      ]
    }

    if (timeAvailable === '1 week' || timeAvailable === 'More than 1 week') {
      return [
        { time: 'Day 1', title: `Initial Learning & ${techniqueName}`, activity: `Learn core ${subject} topics and complete baseline recall.` },
        { time: 'Day 2', title: 'First Interval Review (24 Hours)', activity: 'Review yesterday\'s recall sheet and test weak items.' },
        { time: 'Day 3', title: 'Diagnostic Quizzing', activity: 'Solve 10 mixed-topic practice problems.' },
        { time: 'Day 4', title: 'Concept Explanation Sprint', activity: 'Explain trickiest topics out loud without references.' },
        { time: 'Day 5', title: 'Second Interval Review (72 Hours)', activity: 'Complete spaced repetition flashcards for ${subject}.' },
        { time: 'Day 6', title: 'Interleaved Practice Set', activity: 'Solve randomized mixed problem cards.' },
        { time: 'Day 7', title: 'Full Exam Simulation', activity: 'Take a timed 45-minute mock exam.' },
      ]
    }

    // Default 3-Hour Plan
    return [
      { time: '0:00 – 0:40', title: `${techniqueName} – Block 1`, activity: `Study main ${subject} topic for 20 mins, then execute ${techniqueName}.` },
      { time: '0:40 – 0:50', title: 'Rest Break', activity: 'Step away from study area.' },
      { time: '0:50 – 1:30', title: `${techniqueName} – Block 2`, activity: `Apply technique to secondary ${subject} sub-topic.` },
      { time: '1:30 – 1:40', title: 'Rest Break', activity: 'Hydrate and stretch.' },
      { time: '1:40 – 2:20', title: 'Practice Testing & Diagnostics', activity: 'Solve 8 practice problems without peeking at answers.' },
      { time: '2:20 – 2:30', title: 'Rest Break', activity: 'Rest eyes.' },
      { time: '2:30 – 3:00', title: 'Mini Exam Simulation', activity: 'Complete a 15-minute timed quiz under silent conditions.' },
    ]
  },

  /**
   * Save student post-session feedback for future ML training dataset
   */
  async saveTechniqueFeedback(userId, feedbackData) {
    const { techniqueId, sessionId, usefulnessRating, wouldUseAgain, performanceBefore, performanceAfter } = feedbackData
    const feedback = await TechniqueFeedback.create({
      userId,
      techniqueId,
      sessionId,
      usefulnessRating,
      wouldUseAgain,
      performanceBefore,
      performanceAfter
    })
    return {
      success: true,
      feedback,
      message: 'Feedback recorded! Your data will help optimize future recommendations.'
    }
  },

  /**
   * Record technique practice session
   */
  async recordTechniqueSession(userId, sessionData) {
    const { techniqueId, subject, topic, durationMinutes, activityType, feedbackScore, notesCreated, quizScoreBefore, quizScoreAfter } = sessionData
    const catalog = LEARNING_TECHNIQUES.find((t) => t.id === techniqueId)

    const session = await TechniqueSession.create({
      userId,
      techniqueId,
      techniqueName: catalog ? catalog.name : techniqueId,
      subject: subject || 'General',
      topic: topic || 'Lesson Module',
      durationMinutes: durationMinutes || 15,
      activityType: activityType || '15min',
      feedbackScore: feedbackScore || 4,
      notesCreated,
      quizScoreBefore,
      quizScoreAfter
    })

    let perf = await StudentTechniquePerformance.findOne({ userId, techniqueId })
    if (!perf) {
      perf = new StudentTechniquePerformance({
        userId,
        techniqueId,
        sessionCount: 1,
        totalTimeSpentMinutes: durationMinutes || 15,
        avgQuizScoreBefore: quizScoreBefore || 60,
        avgQuizScoreAfter: quizScoreAfter || 75,
        retentionImprovement: quizScoreAfter && quizScoreBefore ? Math.round(((quizScoreAfter - quizScoreBefore) / quizScoreBefore) * 100) : 15,
        lastUsedAt: new Date()
      })
    } else {
      perf.sessionCount += 1
      perf.totalTimeSpentMinutes += durationMinutes || 15
      if (quizScoreAfter) perf.avgQuizScoreAfter = Math.round((perf.avgQuizScoreAfter + quizScoreAfter) / 2)
      perf.lastUsedAt = new Date()
    }
    await perf.save()

    return {
      session,
      performance: perf,
      message: `Technique session for ${catalog ? catalog.name : techniqueId} recorded successfully!`
    }
  },

  /**
   * Get student's technique progress and performance history
   */
  async getStudentTechniqueProgress(userId) {
    const sessions = await TechniqueSession.find({ userId }).sort({ createdAt: -1 }).limit(20)
    const performances = await StudentTechniquePerformance.find({ userId })
    const recommendations = await TechniqueRecommendation.find({ userId }).sort({ createdAt: -1 }).limit(5)
    const feedbacks = await TechniqueFeedback.find({ userId }).sort({ createdAt: -1 }).limit(10)

    return {
      totalTechniqueSessions: sessions.length,
      performances: performances.map((p) => {
        const cat = LEARNING_TECHNIQUES.find((t) => t.id === p.techniqueId)
        return {
          techniqueId: p.techniqueId,
          name: cat ? cat.name : p.techniqueId,
          sessionCount: p.sessionCount,
          totalTimeSpentMinutes: p.totalTimeSpentMinutes,
          avgQuizScoreAfter: p.avgQuizScoreAfter,
          retentionImprovement: p.retentionImprovement,
          lastUsedAt: p.lastUsedAt
        }
      }),
      recentSessions: sessions,
      recommendationHistory: recommendations,
      feedbacks
    }
  }
}
