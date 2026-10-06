import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Flag,
  Flame,
  GraduationCap,
  Play,
  Target,
  Lock,
  Unlock,
  RefreshCw,
  Edit,
  Palette,
  Trash2,
  Sparkles,
  ChevronRight,
  Award,
  AlertTriangle,
  FileText,
  HelpCircle,
  Video,
  ArrowLeft,
  PenTool,
  Check,
  Zap,
  Info,
  Calendar,
  Shuffle,
  Users,
  Activity,
  Layers,
  CheckSquare,
  BarChart2,
  X,
  PlayCircle,
  TrendingUp,
  Sliders,
  Compass,
  Smile,
  ThumbsUp,
  Star,
  ArrowRight,
  Search,
  Filter
} from 'lucide-react';
import { learningService } from '../../services/learningService';
import { academyService } from '../../services/academyService';

const LearningAcademyPage = () => {
  // Navigation Mode
  // 'wizard' = What's your situation? 8-Step Interactive Wizard
  // 'strategy' = Situation Recommendation Strategy Results
  // 'catalog' = Predefined Technique Library
  // 'progress' = Session History & Feedback
  const [activeTab, setActiveTab] = useState('wizard');

  // 8-Step Wizard Form State
  const [wizardStep, setWizardStep] = useState(1);
  const [situationData, setSituationData] = useState({
    timeAvailable: '1–3 hours',
    goal: 'Preparing for an upcoming exam',
    subject: 'Java',
    customSubject: '',
    difficulty: 'Difficult',
    interestLevel: 'Interested',
    preparationLevel: 'Some topics',
    confidenceLevel: 'Low',
    mainProblem: 'I cannot remember what I study'
  });

  // Situation Evaluation Results State
  const [situationResult, setSituationResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  // Technique Library Catalog State
  const [techniquesCatalog, setTechniquesCatalog] = useState([]);
  const [techniqueProgress, setTechniqueProgress] = useState(null);
  const [selectedTechniqueDetail, setSelectedTechniqueDetail] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('All');

  // Active Practice Session State
  const [activePracticeSession, setActivePracticeSession] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [practiceNotes, setPracticeNotes] = useState('');
  const [submittingSession, setSubmittingSession] = useState(false);

  // Post-Session Feedback Modal State (For Future ML Model Dataset)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState(null);
  const [usefulnessRating, setUsefulnessRating] = useState('Very useful');
  const [wouldUseAgain, setWouldUseAgain] = useState('Yes');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Quiz & Loading States
  const [loading, setLoading] = useState(false);

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((prev) => prev - 1), 1000);
    } else if (timerSeconds === 0 && timerRunning) {
      setTimerRunning(false);
      alert('⏰ Practice session timer complete! Complete your feedback below.');
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Load Initial Catalog & Progress
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [catalog, prog] = await Promise.all([
        academyService.getAllTechniques(),
        academyService.getProgress()
      ]);
      setTechniquesCatalog(catalog);
      setTechniqueProgress(prog);
    } catch (err) {
      console.error('Failed to load initial academy data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Submit 8-Step Situation Wizard
  const handleEvaluateSituation = async () => {
    try {
      setEvaluating(true);
      const payload = {
        ...situationData,
        subject: situationData.subject === 'Custom Subject' ? (situationData.customSubject || 'General') : situationData.subject
      };
      const response = await academyService.evaluateSituation(payload);
      setSituationResult(response);
      setActiveTab('strategy');
    } catch (err) {
      console.error('Failed to evaluate situation:', err);
    } finally {
      setEvaluating(false);
    }
  };

  // Start Practice Sprint Runner
  const startPracticeSprint = (techniqueObj, durationMins = 25) => {
    setActivePracticeSession({
      technique: techniqueObj,
      durationMinutes: durationMins,
      startTime: Date.now()
    });
    setTimerSeconds(durationMins * 60);
    setTimerRunning(true);
    setPracticeNotes('');
  };

  // Finish Practice Sprint & Open Feedback Modal
  const handleFinishPracticeSprint = async () => {
    if (!activePracticeSession) return;
    try {
      setSubmittingSession(true);
      const res = await academyService.recordTechniqueSession({
        techniqueId: activePracticeSession.technique.id || activePracticeSession.technique.name.toLowerCase().replace(/\s+/g, '-'),
        techniqueName: activePracticeSession.technique.name,
        subject: situationData.subject === 'Custom Subject' ? situationData.customSubject : situationData.subject,
        topic: `${situationData.subject} Practice`,
        durationMinutes: activePracticeSession.durationMinutes,
        activityType: '15min',
        notesCreated: practiceNotes
      });

      setCompletedSessionData(res.session);
      setActivePracticeSession(null);
      setTimerRunning(false);
      setShowFeedbackModal(true);
    } catch (err) {
      console.error('Failed to save session:', err);
      alert('Error logging practice session.');
    } finally {
      setSubmittingSession(false);
    }
  };

  // Submit Feedback (Future ML Dataset Collection)
  const handleSubmitFeedback = async () => {
    try {
      setSubmittingFeedback(true);
      await academyService.submitFeedback({
        techniqueId: completedSessionData?.techniqueId || 'active-recall',
        sessionId: completedSessionData?._id,
        usefulnessRating,
        wouldUseAgain,
        performanceBefore: 60,
        performanceAfter: 80
      });
      alert('🎉 Thank you! Your feedback has been stored to optimize future personalization.');
      setShowFeedbackModal(false);
      await fetchInitialData();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter Techniques Catalog
  const filteredCatalog = techniquesCatalog.filter((tech) => {
    const matchesCategory = catalogCategoryFilter === 'All' || tech.category === catalogCategoryFilter;
    const matchesSearch = catalogSearch.trim() === '' || `${tech.name} ${tech.tagline} ${tech.description}`.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoriesList = ['All', 'Retrieval & Memory', 'Deep Understanding', 'Assessment & Practice', 'Focus & Discipline', 'Problem Solving', 'Organization'];

  return (
    <div className="world-page redesign-surface min-h-screen pb-20">
      {/* Background Glows */}
      <div className="absolute right-10 top-12 h-44 w-44 rounded-full bg-orange-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-8 left-10 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl pointer-events-none" />

      {/* Page Header */}
      <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="story-label">
            <GraduationCap size={14} className="text-orange-700" />
            Situation-Based Personalized Study Intelligence
          </span>
          <h1 className="mt-3 text-3xl md:text-4xl font-black text-stone-950 tracking-tight">
            FirstStep Learning Academy
          </h1>
          <p className="mt-1 text-sm md:text-base text-stone-600 font-semibold max-w-2xl">
            Tell FirstStep what situation you're dealing with right now, and get a practical, evidence-based study strategy.
          </p>
        </div>

        {situationResult?.recommendedTechnique && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2.5 rounded-2xl shadow-md shrink-0">
            <Zap size={18} className="animate-pulse" />
            <div>
              <span className="opacity-80 block text-[10px] font-black uppercase">Current Prescribed Strategy</span>
              <span className="font-black text-sm">{situationResult.recommendedTechnique.name} ({situationResult.recommendedTechnique.score}% Match)</span>
            </div>
          </div>
        )}
      </header>

      {/* Responsive Navigation Bar - Grid layout NO HORIZONTAL SCROLLBAR */}
      <nav className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-2.5 p-2 bg-stone-200/60 backdrop-blur-md rounded-2xl border border-stone-300/60">
        <button
          onClick={() => setActiveTab('wizard')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'wizard'
              ? 'bg-white text-stone-950 shadow-md border border-stone-200'
              : 'text-stone-600 hover:text-stone-950 hover:bg-white/40'
          }`}
        >
          <Sliders size={16} className={activeTab === 'wizard' ? 'text-orange-600' : ''} />
          Situation Wizard
        </button>

        <button
          onClick={() => setActiveTab('strategy')}
          disabled={!situationResult}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'strategy'
              ? 'bg-white text-stone-950 shadow-md border border-stone-200'
              : !situationResult
              ? 'opacity-50 cursor-not-allowed text-stone-400'
              : 'text-stone-600 hover:text-stone-950 hover:bg-white/40'
          }`}
        >
          <Target size={16} className={activeTab === 'strategy' ? 'text-orange-600' : ''} />
          Strategy & Plan
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'catalog'
              ? 'bg-white text-stone-950 shadow-md border border-stone-200'
              : 'text-stone-600 hover:text-stone-950 hover:bg-white/40'
          }`}
        >
          <BookOpen size={16} className={activeTab === 'catalog' ? 'text-orange-600' : ''} />
          Technique Library
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'progress'
              ? 'bg-white text-stone-950 shadow-md border border-stone-200'
              : 'text-stone-600 hover:text-stone-950 hover:bg-white/40'
          }`}
        >
          <TrendingUp size={16} className={activeTab === 'progress' ? 'text-orange-600' : ''} />
          Session History
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: 8-STEP INTERACTIVE SITUATION WIZARD                                 */}
      {/* ========================================================================= */}
      {activeTab === 'wizard' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
          <div className="floating-island bg-white p-6 md:p-8 shadow-sm border border-stone-200">
            {/* Stepper Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center text-xs font-black text-stone-500 uppercase tracking-wider mb-2">
                <span>Step {wizardStep} of 8</span>
                <span>{Math.round((wizardStep / 8) * 100)}% Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <div
                    key={s}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      s <= wizardStep ? 'bg-orange-600' : 'bg-stone-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-stone-950 tracking-tight mb-2">
              What's your study situation right now?
            </h2>
            <p className="text-xs md:text-sm text-stone-600 font-semibold mb-6">
              Answer these 8 quick questions to receive an explainable, tailored study strategy.
            </p>

            {/* STEP 1: TIME AVAILABLE */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">1. How much time do you have?</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'Less than 1 hour', '1–3 hours', '3–6 hours', '6–12 hours',
                    '1 day', '2–3 days', '1 week', 'More than 1 week'
                  ].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, timeAvailable: option })}
                      className={`p-3.5 rounded-2xl border font-bold text-xs text-left transition ${
                        situationData.timeAvailable === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Clock size={14} className="text-orange-600 mb-1" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: GOAL */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">2. What is your primary goal?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'Exam tomorrow',
                    'Exam in a few days',
                    'Preparing for an upcoming exam',
                    'Understanding a new topic',
                    'Remembering what I already studied',
                    'Improving problem-solving',
                    'Preparing for an interview',
                    'Learning for long-term knowledge'
                  ].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, goal: option })}
                      className={`p-4 rounded-2xl border font-bold text-xs text-left transition ${
                        situationData.goal === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Target size={16} className="text-orange-600 mb-1" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: SUBJECT */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">3. What subject are you studying?</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Java', 'Python', 'Mathematics', 'Physics', 'Computer Networks', 'DBMS', 'DSA', 'Machine Learning', 'Custom Subject'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, subject: option })}
                      className={`p-3.5 rounded-2xl border font-bold text-xs text-left transition ${
                        situationData.subject === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <BookOpen size={14} className="text-orange-600 mb-1" />
                      {option}
                    </button>
                  ))}
                </div>

                {situationData.subject === 'Custom Subject' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Enter custom subject name..."
                      value={situationData.customSubject}
                      onChange={(e) => setSituationData({ ...situationData, customSubject: e.target.value })}
                      className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: DIFFICULTY */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">4. How difficult is this subject/topic for you?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['Very Easy', 'Easy', 'Moderate', 'Difficult', 'Very Difficult'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, difficulty: option })}
                      className={`p-3.5 rounded-2xl border font-bold text-xs text-center transition ${
                        situationData.difficulty === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 5: INTEREST */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">5. How interested are you in this subject?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['Very Interested', 'Interested', 'Neutral', 'Not Very Interested', 'Not Interested'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, interestLevel: option })}
                      className={`p-3.5 rounded-2xl border font-bold text-xs text-center transition ${
                        situationData.interestLevel === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 6: PREPARATION */}
            {wizardStep === 6 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">6. How much have you already studied?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['Nothing yet', 'Very little', 'Some topics', 'Most topics', 'Almost everything'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, preparationLevel: option })}
                      className={`p-3.5 rounded-2xl border font-bold text-xs text-center transition ${
                        situationData.preparationLevel === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: CONFIDENCE */}
            {wizardStep === 7 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">7. How confident are you right now?</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {['Very Low', 'Low', 'Moderate', 'High', 'Very High'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, confidenceLevel: option })}
                      className={`p-3.5 rounded-2xl border font-bold text-xs text-center transition ${
                        situationData.confidenceLevel === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 8: BIGGEST PROBLEM */}
            {wizardStep === 8 && (
              <div className="space-y-4">
                <label className="block text-sm font-black text-stone-900">8. What is your biggest problem right now?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    'I cannot remember what I study',
                    'I understand but forget later',
                    'I cannot concentrate',
                    "I don't know where to start",
                    'I have very little time',
                    'I understand theory but cannot solve problems',
                    'I need to revise quickly',
                    'I get confused between concepts',
                    'I need exam-focused preparation'
                  ].map((option) => (
                    <button
                      key={option}
                      onClick={() => setSituationData({ ...situationData, mainProblem: option })}
                      className={`p-4 rounded-2xl border font-bold text-xs text-left transition ${
                        situationData.mainProblem === option
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <AlertTriangle size={14} className="text-orange-600 mb-1" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 mt-6 border-t border-stone-100">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep((prev) => prev - 1)}
                  className="soft-button text-xs py-2.5 px-4 flex items-center gap-1 font-bold"
                >
                  <ArrowLeft size={14} /> Previous Step
                </button>
              ) : <div />}

              {wizardStep < 8 ? (
                <button
                  onClick={() => setWizardStep((prev) => prev + 1)}
                  className="organic-button text-xs py-2.5 px-5 flex items-center gap-1.5 font-bold"
                >
                  Next Step <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleEvaluateSituation}
                  disabled={evaluating}
                  className="organic-button bg-orange-600 text-white text-xs py-3 px-6 font-black flex items-center gap-2 shadow-lg"
                >
                  {evaluating ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Generate My Study Strategy
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RECOMMENDED STUDY STRATEGY & PLAN RESULTS PAGE                     */}
      {/* ========================================================================= */}
      {activeTab === 'strategy' && situationResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-4xl mx-auto">
          {/* Primary Recommendation Hero Card */}
          <div className="floating-island bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 text-white p-6 md:p-8 relative overflow-hidden shadow-2xl border border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                🎯 PRIMARY TECHNIQUE RECOMMENDATION
              </span>
              <span className="text-3xl font-black text-orange-400">
                {situationResult.recommendedTechnique.score}% Match
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">
              {situationResult.recommendedTechnique.name}
            </h1>
            <p className="text-stone-300 font-semibold text-sm mt-1">
              {situationResult.recommendedTechnique.tagline}
            </p>

            <button
              onClick={() => startPracticeSprint(situationResult.recommendedTechnique, 25)}
              className="organic-button bg-orange-600 hover:bg-orange-500 text-white font-black py-4 px-8 rounded-2xl flex items-center gap-2 shadow-xl mt-6 transition text-base"
            >
              <PlayCircle size={20} />
              Start {situationResult.recommendedTechnique.name} Session
            </button>
          </div>

          {/* Why this technique? */}
          <div className="floating-island bg-white p-6 shadow-sm border border-stone-200 space-y-3">
            <h3 className="text-lg font-black text-stone-950 flex items-center gap-2">
              <Zap size={18} className="text-orange-600" />
              Why this technique for your situation?
            </h3>
            <p className="text-xs md:text-sm text-stone-700 leading-relaxed font-medium bg-orange-50/70 border border-orange-200/80 p-4 rounded-2xl">
              {situationResult.whyReason}
            </p>
          </div>

          {/* What is it? & When to use / avoid */}
          <div className="floating-island bg-white p-6 shadow-sm border border-stone-200 space-y-4">
            <h3 className="text-lg font-black text-stone-950">
              What is {situationResult.recommendedTechnique.name}?
            </h3>
            <p className="text-xs md:text-sm text-stone-700 font-medium leading-relaxed">
              {situationResult.recommendedTechnique.description}
            </p>

            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                <h4 className="font-black text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1">
                  <Check size={14} className="text-emerald-700" /> When should you use it?
                </h4>
                <ul className="space-y-1 text-xs text-stone-700 font-semibold">
                  {situationResult.recommendedTechnique.bestUsedWhen?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl space-y-2">
                <h4 className="font-black text-rose-950 text-xs uppercase tracking-wider flex items-center gap-1">
                  <X size={14} className="text-rose-700" /> When should you avoid relying on it alone?
                </h4>
                <ul className="space-y-1 text-xs text-stone-700 font-semibold">
                  {situationResult.recommendedTechnique.notIdealWhen?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-600 font-bold">✗</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="floating-island bg-white p-6 shadow-sm border border-stone-200 space-y-4">
            <h3 className="text-lg font-black text-stone-950 flex items-center gap-2">
              <Layers size={18} className="text-orange-600" />
              How to Use {situationResult.recommendedTechnique.name} (Step-by-Step Instructions)
            </h3>

            <div className="space-y-3">
              {situationResult.recommendedTechnique.steps?.map((stepStr, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-150">
                  <span className="h-7 w-7 rounded-xl bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <p className="text-xs md:text-sm font-semibold text-stone-800 pt-0.5">{stepStr}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Personalized Time-Allocated Schedule */}
          {situationResult.timeAllocatedPlan && (
            <div className="floating-island bg-white p-6 shadow-sm border border-stone-200 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-lg font-black text-stone-950 flex items-center gap-2">
                  <Calendar size={18} className="text-orange-600" />
                  Your Personalized {situationData.timeAvailable.toUpperCase()} Plan ({situationData.subject})
                </h3>
                <span className="text-xs font-bold text-stone-500">Target Time Allocated</span>
              </div>

              <div className="space-y-3">
                {situationResult.timeAllocatedPlan.map((planItem, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-50 border border-stone-150">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-orange-700 bg-orange-100 px-3 py-1 rounded-xl shrink-0 font-mono">
                        {planItem.time}
                      </span>
                      <div>
                        <h4 className="font-black text-stone-950 text-sm">{planItem.title}</h4>
                        <p className="text-xs text-stone-600 font-medium">{planItem.activity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Recommendations ("Also Useful") */}
          <div className="floating-island bg-white p-6 shadow-sm border border-stone-200 space-y-4">
            <h3 className="text-lg font-black text-stone-950 flex items-center gap-2">
              <Layers size={18} className="text-orange-600" />
              Also Useful (Secondary Recommendations)
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              {situationResult.secondaryTechniques?.map((sec, idx) => (
                <div key={idx} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-stone-400">Option #{idx + 2}</span>
                      <span className="text-xs font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        {sec.score}% Match
                      </span>
                    </div>
                    <h4 className="font-black text-stone-950 text-sm">{sec.name}</h4>
                    <p className="text-xs text-stone-600 font-medium mt-1">{sec.reason}</p>
                  </div>

                  <button
                    onClick={() => startPracticeSprint({ id: sec.name.toLowerCase().replace(/\s+/g, '-'), name: sec.name }, 25)}
                    className="mt-4 soft-button text-xs py-2 px-3 flex items-center justify-center gap-1 font-bold"
                  >
                    <Play size={12} /> Start Session
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* "Why NOT this technique?" Feature */}
          {situationResult.whyNotExplanations && situationResult.whyNotExplanations.length > 0 && (
            <div className="floating-island bg-white p-6 shadow-sm border border-stone-200 space-y-4">
              <h3 className="text-lg font-black text-stone-950 flex items-center gap-2">
                <HelpCircle size={18} className="text-orange-600" />
                Why isn't another technique your primary choice?
              </h3>

              <div className="space-y-3">
                {situationResult.whyNotExplanations.map((item, idx) => (
                  <div key={idx} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1 text-xs">
                    <h4 className="font-black text-stone-900">Why not {item.techniqueName}?</h4>
                    <p className="text-stone-600 font-medium leading-relaxed">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TECHNIQUE LIBRARY & CATALOG WITH SEARCH & CATEGORY FILTERS          */}
      {/* ========================================================================= */}
      {activeTab === 'catalog' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="floating-island bg-white p-6 border border-stone-200 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-stone-950 flex items-center gap-2">
                <BookOpen size={22} className="text-orange-600" />
                Predefined Science-Backed Study Technique Library
              </h2>
              <p className="text-sm font-semibold text-stone-600 mt-1">
                Explore all 12 core study techniques with step-by-step execution guidelines.
              </p>
            </div>

            {/* Search & Category Filter Controls */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2 border-t border-stone-100">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCatalogCategoryFilter(cat)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition border ${
                      catalogCategoryFilter === cat
                        ? 'bg-orange-600 border-orange-600 text-white shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-64 shrink-0">
                <Search size={14} className="absolute left-3.5 top-3 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search techniques..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCatalog.map((tech) => (
              <div key={tech.id} className="floating-island bg-white p-6 border border-stone-200 hover:border-orange-300 transition flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full">
                      {tech.category}
                    </span>
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                      {tech.difficulty}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-stone-950">{tech.name}</h3>
                  <p className="text-xs font-bold text-orange-700 mt-1">{tech.tagline}</p>
                  <p className="text-xs text-stone-600 font-medium mt-3 leading-relaxed line-clamp-3">
                    {tech.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTechniqueDetail(tech)}
                    className="organic-button text-xs py-2.5 flex-1 flex items-center justify-center gap-1"
                  >
                    View Guide <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => startPracticeSprint(tech, 25)}
                    className="soft-button text-xs py-2.5 px-3 flex items-center justify-center gap-1 font-bold shrink-0"
                    title="Start Practice Sprint"
                  >
                    <Play size={14} /> Practice
                  </button>
                </div>
              </div>
            ))}

            {!filteredCatalog.length && (
              <div className="col-span-full py-12 text-center text-stone-400 font-bold text-sm bg-white rounded-3xl border border-stone-200">
                No study techniques matched your filter criteria.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SESSION HISTORY & ML FEEDBACK TRAINING DATASETS                    */}
      {/* ========================================================================= */}
      {activeTab === 'progress' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="floating-island bg-white p-6 border border-stone-200 space-y-4">
            <div>
              <h2 className="text-2xl font-black text-stone-950 flex items-center gap-2">
                <TrendingUp size={22} className="text-orange-600" />
                Session History & ML Feedback Datasets
              </h2>
              <p className="text-sm font-semibold text-stone-600 mt-1">
                All completed sessions and student usefulness ratings are logged to build training datasets for future ML personalization models.
              </p>
            </div>

            {/* Overview Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Total Sessions</span>
                <span className="text-2xl font-black text-stone-950">{techniqueProgress?.totalTechniqueSessions || 0}</span>
              </div>
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Unique Techniques</span>
                <span className="text-2xl font-black text-orange-600">{techniqueProgress?.performances?.length || 0}</span>
              </div>
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">Feedback Logs</span>
                <span className="text-2xl font-black text-emerald-600">{techniqueProgress?.feedbacks?.length || 0}</span>
              </div>
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                <span className="text-[10px] text-stone-400 font-bold uppercase block">ML Status</span>
                <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-1">Data Collection Phase</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Session Logs List */}
            <div className="floating-island bg-white p-6 border border-stone-200 space-y-4">
              <h3 className="font-black text-stone-950 text-lg flex items-center gap-2">
                <Activity size={18} className="text-orange-600" />
                Logged Practice Sessions
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {techniqueProgress?.recentSessions?.map((s) => (
                  <div key={s._id} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-150 text-xs space-y-1">
                    <div className="flex justify-between font-black text-stone-950">
                      <span>{s.techniqueName}</span>
                      <span className="text-orange-700 font-mono">{s.durationMinutes} min</span>
                    </div>
                    <div className="text-[11px] text-stone-500 font-semibold">
                      Subject: {s.subject} • Topic: {s.topic}
                    </div>
                    {s.notesCreated && (
                      <p className="text-[11px] text-stone-600 font-medium bg-white p-2 rounded-xl border border-stone-200 mt-1 line-clamp-2">
                        "{s.notesCreated}"
                      </p>
                    )}
                  </div>
                ))}

                {!techniqueProgress?.recentSessions?.length && (
                  <p className="text-xs text-stone-400 py-8 text-center font-semibold">No practice sessions logged yet. Launch a practice sprint to log history!</p>
                )}
              </div>
            </div>

            {/* Student Feedback Rating Dataset */}
            <div className="floating-island bg-white p-6 border border-stone-200 space-y-4">
              <h3 className="font-black text-stone-950 text-lg flex items-center gap-2">
                <Smile size={18} className="text-orange-600" />
                Logged Student Feedback (ML Dataset)
              </h3>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {techniqueProgress?.feedbacks?.map((f) => (
                  <div key={f._id} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-150 text-xs space-y-1">
                    <div className="flex justify-between font-black text-stone-950">
                      <span>Usefulness: <strong className="text-orange-700">{f.usefulnessRating}</strong></span>
                      <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">Would Use Again: {f.wouldUseAgain}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 block pt-1">
                      Logged at: {new Date(f.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                ))}

                {!techniqueProgress?.feedbacks?.length && (
                  <p className="text-xs text-stone-400 py-8 text-center font-semibold">No feedback dataset logged yet.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INTERACTIVE PRACTICE SESSION RUNNER                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activePracticeSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full">
                    ACTIVE TECHNIQUE SESSION
                  </span>
                  <h3 className="text-2xl font-black text-stone-950 mt-1">{activePracticeSession.technique.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-orange-600 font-mono">{formatTime(timerSeconds)}</span>
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Timer</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-500 tracking-wider mb-2">
                  Session Notes / Blurting Sheet
                </label>
                <textarea
                  value={practiceNotes}
                  onChange={(e) => setPracticeNotes(e.target.value)}
                  placeholder="Write everything remembered from memory or draft your technique steps..."
                  rows={6}
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setActivePracticeSession(null)} className="soft-button flex-1 py-3 text-xs font-bold">Cancel</button>
                <button onClick={handleFinishPracticeSprint} disabled={submittingSession} className="organic-button bg-orange-600 text-white flex-1 py-3 text-xs font-bold">
                  {submittingSession ? 'Saving...' : 'Finish & Rate Usefulness'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: POST-SESSION FEEDBACK (FOR FUTURE ML MODEL DATASET)               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6">
              <div className="text-center">
                <Smile size={36} className="text-orange-600 mx-auto mb-2 animate-bounce" />
                <h3 className="text-2xl font-black text-stone-950">How useful was this technique?</h3>
                <p className="text-xs text-stone-500 font-semibold mt-1">Your feedback helps build training datasets for future ML personalization.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-stone-500 tracking-wider mb-2">Usefulness Rating</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['Not useful', 'Slightly useful', 'Useful', 'Very useful', 'Extremely useful'].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setUsefulnessRating(rating)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                          usefulnessRating === rating ? 'bg-orange-100 border-orange-400 text-orange-950' : 'bg-stone-50 border-stone-200 text-stone-700'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-stone-500 tracking-wider mb-2">Would you use this technique again?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Yes', 'Maybe', 'No'].map((ans) => (
                      <button
                        key={ans}
                        onClick={() => setWouldUseAgain(ans)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                          wouldUseAgain === ans ? 'bg-orange-600 border-orange-600 text-white' : 'bg-stone-50 border-stone-200 text-stone-700'
                        }`}
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSubmitFeedback} disabled={submittingFeedback} className="organic-button bg-orange-600 text-white w-full py-3.5 text-xs font-bold mt-2">
                  {submittingFeedback ? 'Saving Feedback...' : 'Submit Feedback & Save Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: TECHNIQUE DETAIL VIEW                                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTechniqueDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto space-y-6">
              <button onClick={() => setSelectedTechniqueDetail(null)} className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition">
                <X size={20} />
              </button>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full">{selectedTechniqueDetail.category}</span>
                <h2 className="text-3xl font-black text-stone-950 mt-2">{selectedTechniqueDetail.name}</h2>
                <p className="text-xs font-bold text-orange-700 mt-1">{selectedTechniqueDetail.tagline}</p>
              </div>

              <div className="space-y-4 text-xs md:text-sm text-stone-700">
                <div>
                  <h4 className="font-black text-stone-950 text-sm mb-1">What is it?</h4>
                  <p className="leading-relaxed font-medium">{selectedTechniqueDetail.description}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <h5 className="font-black text-emerald-950 text-xs mb-1">✓ Best Used When</h5>
                    <ul className="space-y-1 text-xs">
                      {selectedTechniqueDetail.bestUsedWhen?.map((item, idx) => <li key={idx}>• {item}</li>)}
                    </ul>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <h5 className="font-black text-rose-950 text-xs mb-1">✗ Not Ideal When</h5>
                    <ul className="space-y-1 text-xs">
                      {selectedTechniqueDetail.notIdealWhen?.map((item, idx) => <li key={idx}>• {item}</li>)}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-stone-950 text-sm mb-2">Step-by-Step Execution:</h4>
                  <div className="space-y-2">
                    {selectedTechniqueDetail.steps?.map((stepStr, idx) => (
                      <div key={idx} className="flex gap-2 text-xs font-semibold">
                        <span className="font-black text-orange-600">{idx + 1}.</span>
                        <span>{stepStr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearningAcademyPage;
