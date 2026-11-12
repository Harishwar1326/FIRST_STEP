import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
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
  Filter,
  Lightbulb
} from 'lucide-react';
import { learningService } from '../../services/learningService';
import { academyService } from '../../services/academyService';
import { learningAcademyService } from '../../services/learningAcademyService';

const STAGE_ORDER = ['explore', 'predict', 'learn', 'experiment', 'explain', 'improve'];
const STAGE_META = {
  explore: { label: 'Explore', icon: <Compass size={12} />, color: 'from-orange-500 to-amber-500' },
  predict: { label: 'Predict', icon: <HelpCircle size={12} />, color: 'from-fuchsia-500 to-pink-500' },
  learn: { label: 'Learn', icon: <BookOpen size={12} />, color: 'from-sky-500 to-indigo-500' },
  experiment: { label: 'Experiment', icon: <Shuffle size={12} />, color: 'from-emerald-500 to-teal-500' },
  explain: { label: 'Explain', icon: <GraduationCap size={12} />, color: 'from-blue-500 to-violet-500' },
  improve: { label: 'Improve', icon: <Zap size={12} />, color: 'from-rose-500 to-red-500' },
};

const StageIndicator = ({ stage = 'explore', completion = 0 }) => {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  const effectiveIdx = currentIdx < 0 ? 0 : currentIdx;
  return (
    <div className="floating-island bg-white p-4 border border-stone-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Learning Cycle</span>
        <span className="text-[11px] font-black text-orange-600">{completion}% complete</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {STAGE_ORDER.map((s, i) => {
          const isActive = i === effectiveIdx;
          const isDone = i < effectiveIdx;
          const meta = STAGE_META[s];
          return (
            <div key={s} className="flex items-center gap-1.5 flex-1 min-w-[80px]">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all shrink-0 ${
                  isDone
                    ? `bg-gradient-to-r ${meta.color} text-white shadow-sm`
                    : isActive
                    ? `bg-gradient-to-r ${meta.color} text-white shadow-md ring-2 ring-offset-1 ring-orange-300 scale-105`
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {meta.icon}
                <span>{i + 1}. {meta.label}</span>
              </div>
              {i < STAGE_ORDER.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[8px] rounded-full transition-all ${i < effectiveIdx ? 'bg-orange-400' : 'bg-stone-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LearningAcademyPage = () => {
  const queryClient = useQueryClient();
  // Navigation Mode
  // 'wizard' = What's your situation? 8-Step Interactive Wizard
  // 'strategy' = Situation Recommendation Strategy Results
  // 'catalog' = Predefined Technique Library
  // 'ai-lab' = AI-powered Interactive Learning Experience
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

  // ============== AI LAB STATE ==============
  const [aiMode, setAiMode] = useState('home'); // home, lesson, mission, predict, teachback, misconception, whatif
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiCustomTopic, setAiCustomTopic] = useState('');
  const [aiStage, setAiStage] = useState('explore'); // explore, predict, learn, experiment, explain, improve
  const [aiLoading, setAiLoading] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentMission, setCurrentMission] = useState(null);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [currentWhatIf, setCurrentWhatIf] = useState(null);
  const [currentMisconception, setCurrentMisconception] = useState(null);
  const [currentTeachBack, setCurrentTeachBack] = useState(null);
  const [activityId, setActivityId] = useState(null);
  // Prediction answer state
  const [predictionSelectedOption, setPredictionSelectedOption] = useState(null);
  const [predictionRevealed, setPredictionRevealed] = useState(false);
  const [predictionFreeText, setPredictionFreeText] = useState('');
  // Teach back state
  const [teachBackText, setTeachBackText] = useState('');
  // What-if state
  const [whatIfPredictions, setWhatIfPredictions] = useState({});
  const [whatIfRevealed, setWhatIfRevealed] = useState({});
  // Misconception state
  const [misconceptionAnswer, setMisconceptionAnswer] = useState('');
  const [aiCompletion, setAiCompletion] = useState(0);

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

  // Refresh history when the tab is opened so saved sessions appear immediately.
  useEffect(() => {
    if (activeTab === 'progress') fetchInitialData();
  }, [activeTab]);

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
      await fetchInitialData();
      setShowFeedbackModal(true);
      queryClient.invalidateQueries({ queryKey: ['learning-profile'] });
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
        sessionId: /^[a-f\d]{24}$/i.test(completedSessionData?._id || '') ? completedSessionData._id : undefined,
        usefulnessRating,
        wouldUseAgain,
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

  // ============== AI LAB HANDLERS ==============
  const resolveAiTopic = () => {
    if (aiTopic === 'custom') return aiCustomTopic.trim() || 'General Study';
    return aiTopic || situationData.subject || 'Java';
  };

  const resetAiWorkspace = () => {
    setCurrentLesson(null);
    setCurrentMission(null);
    setCurrentPrediction(null);
    setCurrentWhatIf(null);
    setCurrentMisconception(null);
    setCurrentTeachBack(null);
    setActivityId(null);
    setPredictionSelectedOption(null);
    setPredictionRevealed(false);
    setPredictionFreeText('');
    setTeachBackText('');
    setWhatIfPredictions({});
    setWhatIfRevealed({});
    setMisconceptionAnswer('');
    setAiCompletion(0);
    setAiStage('explore');
  };

  const markStage = async (stage, topicOverride) => {
    const t = topicOverride || resolveAiTopic();
    const res = await learningAcademyService.markStage({ activityId, stage, topic: t });
    if (res && typeof res.completion === 'number') setAiCompletion(res.completion);
    return res;
  };

  const handleStartAiLesson = async () => {
    const topic = resolveAiTopic();
    resetAiWorkspace();
    setAiMode('lesson');
    setAiLoading(true);
    try {
      const res = await learningAcademyService.generateLesson({ topic, difficulty: aiDifficulty });
      setCurrentLesson(res.lesson);
      setActivityId(res.activityId);
      setAiCompletion(20);
      setAiStage('explore');
      if (res.activityId) await learningAcademyService.markStage({ activityId: res.activityId, stage: 'explored', topic });
    } catch (err) {
      console.error('Failed to start AI lesson:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleStartMission = async () => {
    const topic = resolveAiTopic();
    resetAiWorkspace();
    setAiMode('mission');
    setAiLoading(true);
    try {
      const res = await learningAcademyService.generateMission({ topic, difficulty: aiDifficulty });
      setCurrentMission(res.mission);
      setActivityId(res.activityId);
      setAiCompletion(15);
    } catch (err) {
      console.error('Failed to start mission:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleStartPrediction = async () => {
    const topic = resolveAiTopic();
    resetAiWorkspace();
    setAiMode('predict');
    setAiLoading(true);
    try {
      const res = await learningAcademyService.generatePrediction({ topic, difficulty: aiDifficulty, concept: topic });
      setCurrentPrediction(res.prediction);
      setActivityId(res.activityId);
      setAiCompletion(10);
      setAiStage('predict');
      if (res.activityId) await learningAcademyService.markStage({ activityId: res.activityId, stage: 'predicted', topic });
    } catch (err) {
      console.error('Failed to start prediction:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitLessonPrediction = async () => {
    if (predictionSelectedOption === null || !currentLesson) return;
    const isCorrect = predictionSelectedOption === currentLesson.predictionQuestion.correctIndex;
    const correctReasoning = currentLesson.predictionQuestion.correctReasoning;
    setPredictionRevealed(true);
    try {
      const res = await learningAcademyService.submitPrediction({
        activityId,
        sessionId: learningAcademyService.sessionId,
        guestId: learningAcademyService.guestId,
        topic: resolveAiTopic(),
        predictionAnswer: String(predictionSelectedOption),
        isCorrect,
        correctReasoning,
      });
      if (res && typeof res.predictionAccuracy === 'number') setAiCompletion(25);
    } catch (err) {
      console.warn('Submit prediction error:', err.message);
    }
    setAiStage('learn');
    if (activityId) await markStage('learned');
  };

  const handleSubmitFreeTextPrediction = async () => {
    if (!predictionFreeText.trim()) return;
    setPredictionRevealed(true);
    setAiStage('learn');
    if (activityId) {
      await learningAcademyService.submitPrediction({
        activityId,
        topic: resolveAiTopic(),
        predictionAnswer: predictionFreeText.trim(),
        isCorrect: true,
        correctReasoning: currentPrediction?.expectedOutcome || '',
      });
      await markStage('learned');
    }
    setAiCompletion(25);
  };

  const handleLaunchWhatIf = async () => {
    const topic = resolveAiTopic();
    setAiMode('whatif');
    setAiLoading(true);
    try {
      const res = await learningAcademyService.generateWhatIf({ topic, difficulty: aiDifficulty, activityId });
      setCurrentWhatIf(res.whatIf);
      if (res.activityId) setActivityId(res.activityId);
      setWhatIfPredictions({});
      setWhatIfRevealed({});
      setAiStage('experiment');
      const newId = res.activityId || activityId;
      if (newId) await learningAcademyService.markStage({ activityId: newId, stage: 'experimented', topic });
      setAiCompletion(60);
    } catch (err) {
      console.error('Failed to generate what-if:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLaunchTeachBack = async () => {
    setAiMode('teachback');
    setTeachBackText('');
    setCurrentTeachBack(null);
  };

  const handleSubmitTeachBack = async () => {
    if (!teachBackText.trim() || teachBackText.trim().length < 20) {
      alert('Please write at least 20 characters explaining the concept in your own words.');
      return;
    }
    setAiLoading(true);
    try {
      const topic = resolveAiTopic();
      const res = await learningAcademyService.evaluateTeachBack({
        topic,
        userExplanation: teachBackText.trim(),
        lesson: currentLesson,
        activityId,
      });
      setCurrentTeachBack(res.evaluation);
      if (res.activityId) setActivityId(res.activityId);
      setAiStage('explain');
      const newId = res.activityId || activityId;
      if (newId) await learningAcademyService.markStage({ activityId: newId, stage: 'explained', topic });
      setAiCompletion(80);
    } catch (err) {
      console.error('Teach-back evaluation failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleLaunchMisconception = async () => {
    const topic = resolveAiTopic();
    const wrongAnswer = predictionSelectedOption !== null
      ? String(predictionSelectedOption)
      : teachBackText.slice(0, 200);
    const correctAnswer = currentLesson?.predictionQuestion?.correctReasoning || currentPrediction?.expectedOutcome || '';
    const question = currentLesson?.predictionQuestion?.question || currentPrediction?.prompt || '';
    setAiMode('misconception');
    setAiLoading(true);
    try {
      const res = await learningAcademyService.fixMisconception({
        topic, wrongAnswer, correctAnswer, question, activityId,
      });
      setCurrentMisconception(res.plan);
      if (res.activityId) setActivityId(res.activityId);
      setMisconceptionAnswer('');
    } catch (err) {
      console.error('Misconception fix failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleResolveMisconceptionFixed = async () => {
    if (activityId) {
      const res = await learningAcademyService.resolveMisconceptionFixed(activityId);
      if (res?.ok) {
        setAiStage('improve');
        await markStage('improved');
        setAiCompletion(100);
      }
    } else {
      setAiCompletion(100);
      setAiStage('improve');
    }
    alert('🎉 Great work! Misconception corrected. You completed the EXPLORE→PREDICT→LEARN→EXPERIMENT→EXPLAIN→IMPROVE cycle.');
  };

  const handleFinishAiLesson = async () => {
    if (activityId) {
      await markStage('improved');
      setAiCompletion(100);
      setAiStage('improve');
    }
    queryClient.invalidateQueries({ queryKey: ['learning-profile'] });
    alert('🌟 Learning session complete! Your activity was shared with your Learning Twin.');
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
    <div className="world-page redesign-surface learning-academy-page min-h-screen pb-20">
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
      <nav className="mb-8 grid grid-cols-2 lg:grid-cols-5 gap-2.5 p-2 bg-stone-200/60 backdrop-blur-md rounded-2xl border border-stone-300/60">
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
          disabled={!situationResult?.recommendedTechnique}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'strategy'
              ? 'bg-white text-stone-950 shadow-md border border-stone-200'
              : !situationResult?.recommendedTechnique
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
          onClick={() => { setActiveTab('ai-lab'); resetAiWorkspace(); setAiMode('home'); }}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
            activeTab === 'ai-lab'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-stone-950 shadow-md border border-orange-400'
              : 'text-stone-600 hover:text-stone-950 hover:bg-white/40'
          }`}
        >
          <Sparkles size={16} className={activeTab !== 'ai-lab' ? 'text-orange-600' : ''} />
          AI Learning Lab
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
                  className="organic-button bg-orange-600 text-stone-950 text-xs py-3 px-6 font-black flex items-center gap-2 shadow-lg"
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
      {/* TAB 2: RECOMMENDED STUDY STRATEGY & PLAN RESULTS PAGE – COMPACT / REQUIRED-ONLY */}
      {/* ========================================================================= */}
      {activeTab === 'strategy' && situationResult?.recommendedTechnique && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-3xl mx-auto">
          {/* Primary Recommendation Hero Card */}
          <div className="floating-island bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 text-white p-6 md:p-7 relative overflow-hidden shadow-2xl border border-stone-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={13} /> Your Study Strategy
                </span>
                {situationResult.aiGenerated === true && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles size={11} className="inline mr-1" /> Groq Generated
                  </span>
                )}
              </div>
              <span className="text-3xl font-black text-orange-400 tabular-nums">
                {situationResult.recommendedTechnique.score || 85}%
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {situationResult.recommendedTechnique.name}
            </h1>
            {situationResult.recommendedTechnique.tagline && (
              <p className="text-stone-300 font-semibold text-sm mt-1.5">
                {situationResult.recommendedTechnique.tagline}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 mt-6">
              <button
                onClick={() => startPracticeSprint(situationResult.recommendedTechnique, situationResult.scheduleBlockMinutes || 25)}
                className="organic-button bg-orange-600 hover:bg-orange-500 text-stone-950 font-black py-3.5 px-7 rounded-2xl flex items-center gap-2 shadow-xl transition text-sm"
              >
                <PlayCircle size={18} />
                Start {situationResult.scheduleBlockMinutes || 25}-min Session
              </button>
              <button
                onClick={() => setActiveTab('ai-lab')}
                className="soft-button py-3 px-5 rounded-2xl text-xs font-black flex items-center gap-1.5"
              >
                <Brain size={14} /> Open AI Learning Lab
              </button>
            </div>
          </div>

          {/* Why this technique – single tight paragraph */}
          {situationResult.whyReason && (
            <div className="floating-island bg-white p-5 shadow-sm border border-stone-200">
              <h3 className="text-sm font-black text-stone-950 flex items-center gap-2 mb-2.5">
                <Zap size={15} className="text-orange-600" />
                Why this strategy for your situation?
              </h3>
              <p className="text-sm text-stone-700 leading-relaxed font-semibold bg-orange-50/70 border border-orange-200/80 p-3.5 rounded-2xl">
                {situationResult.whyReason}
              </p>
            </div>
          )}

          {/* Compact step-by-step – only if we have steps */}
          {Array.isArray(situationResult.recommendedTechnique.steps) && situationResult.recommendedTechnique.steps.length > 0 && (
            <div className="floating-island bg-white p-5 shadow-sm border border-stone-200">
              <h3 className="text-sm font-black text-stone-950 flex items-center gap-2 mb-3">
                <Layers size={15} className="text-orange-600" />
                How to execute {situationResult.recommendedTechnique.name}
              </h3>
              <div className="grid gap-2">
                {situationResult.recommendedTechnique.steps.slice(0, 5).map((stepStr, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-150">
                    <span className="h-6 w-6 shrink-0 rounded-lg bg-orange-600 text-white font-black text-[11px] flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-xs md:text-sm font-semibold text-stone-800 leading-relaxed pt-0.5">{stepStr}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personalized schedule (time-allocated plan) – REQUIRED */}
          {Array.isArray(situationResult.timeAllocatedPlan) && situationResult.timeAllocatedPlan.length > 0 && (
            <div className="floating-island bg-white p-5 shadow-sm border border-stone-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-stone-950 flex items-center gap-2">
                  <Calendar size={15} className="text-orange-600" />
                  Your {((situationData && situationData.timeAvailable) || 'Personalized').toUpperCase()} Plan ·{' '}
                  {situationData.subject}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  {situationResult.timeAllocatedPlan.length} blocks
                </span>
              </div>
              <div className="space-y-2">
                {situationResult.timeAllocatedPlan.map((planItem, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-150">
                    <span className="text-[11px] font-black text-orange-700 bg-orange-100 px-2.5 py-1 rounded-xl shrink-0 font-mono mt-0.5">
                      {planItem.time}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-black text-stone-950 text-sm leading-tight">{planItem.title}</h4>
                      {planItem.activity && (
                        <p className="text-xs text-stone-600 font-medium mt-0.5 leading-relaxed">{planItem.activity}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Secondary options – 3 alternatives only */}
          {Array.isArray(situationResult.secondaryTechniques) && situationResult.secondaryTechniques.length > 0 && (
            <div className="floating-island bg-white p-5 shadow-sm border border-stone-200">
              <h3 className="text-sm font-black text-stone-950 flex items-center gap-2 mb-3">
                <Layers size={15} className="text-orange-600" />
                Alternatives
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {situationResult.secondaryTechniques.slice(0, 3).map((sec, idx) => {
                  const secId =
                    sec.id ||
                    (sec.name || `alt-${idx}`).toString().toLowerCase().replace(/\s+/g, '-')
                  return (
                    <div key={idx} className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">#{idx + 2}</span>
                        <span className="text-[11px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full tabular-nums">
                          {sec.score || 70}%
                        </span>
                      </div>
                      <h4 className="font-black text-stone-950 text-sm leading-tight">{sec.name}</h4>
                      {sec.reason && <p className="text-[11px] text-stone-600 font-medium mt-1 leading-snug">{sec.reason}</p>}
                      <button
                        onClick={() => startPracticeSprint({ id: secId, name: sec.name }, situationResult.scheduleBlockMinutes || 25)}
                        className="mt-3 soft-button text-[11px] py-2 px-3 flex items-center justify-center gap-1 font-bold w-full"
                      >
                        <Play size={12} /> Start
                      </button>
                    </div>
                  )
                })}
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
                        ? 'bg-orange-600 border-orange-600 text-stone-950 shadow-xs'
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
                  <p className="text-xs text-stone-400 py-8 text-center font-semibold">
                    {loading ? 'Loading session history…' : 'No practice sessions logged yet. Launch a practice sprint to log history!'}
                  </p>
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
      {/* TAB 5: AI LEARNING LAB — EXPLORE → PREDICT → LEARN → EXPERIMENT → EXPLAIN → IMPROVE */}
      {/* ========================================================================= */}
      {activeTab === 'ai-lab' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-5xl mx-auto">
          {/* Topic + Difficulty control bar (always visible in AI Lab) */}
          <div className="floating-island bg-white p-5 md:p-6 border border-stone-200 shadow-sm">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-1 rounded-full flex items-center gap-1 inline-flex">
                  <Sparkles size={12} /> AI-Powered Interactive Learning
                </span>
                <h2 className="text-2xl font-black text-stone-950 mt-3 tracking-tight">
                  EXPLORE <span className="text-orange-500">→</span> PREDICT <span className="text-orange-500">→</span> LEARN <span className="text-orange-500">→</span> EXPERIMENT <span className="text-orange-500">→</span> EXPLAIN <span className="text-orange-500">→</span> IMPROVE
                </h2>
                <p className="text-sm font-semibold text-stone-600 mt-1">
                  Stop reading and quizzing. Start exploring, predicting, experimenting, and teaching.
                </p>
              </div>
              <div className="shrink-0 text-right space-y-1">
                <div className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Cycle Progress</div>
                <div className="flex items-center gap-2">
                  <div className="w-40 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${aiCompletion}%` }}
                    />
                  </div>
                  <span className="font-black text-sm text-orange-600">{aiCompletion}%</span>
                </div>
                {activityId && <div className="text-[10px] text-stone-400 font-mono">Activity: {String(activityId).slice(-8)}</div>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-stone-500 tracking-wider mb-1.5">Topic / Subject</label>
                <select
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <option value="">(Use Wizard subject: {situationData.subject})</option>
                  {['Java', 'Python', 'SQL / Databases', 'Computer Networks', 'DBMS', 'DSA', 'Mathematics', 'Physics', 'Machine Learning', 'custom'].map((t) => (
                    <option key={t} value={t === 'custom' ? 'custom' : t}>{t === 'custom' ? '✏️ Custom Topic…' : t}</option>
                  ))}
                </select>
                {aiTopic === 'custom' && (
                  <input
                    type="text"
                    placeholder="e.g., Recursion, Binary Search, TCP Handshake..."
                    value={aiCustomTopic}
                    onChange={(e) => setAiCustomTopic(e.target.value)}
                    className="mt-2 w-full p-2.5 bg-orange-50 border border-orange-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                )}
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-stone-500 tracking-wider mb-1.5">Difficulty</label>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { v: 'beginner', label: '🌱 Beginner' },
                    { v: 'medium', label: '🎯 Medium' },
                    { v: 'hard', label: '🔥 Hard' },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setAiDifficulty(v)}
                      className={`p-2.5 rounded-xl border text-[11px] font-black transition ${
                        aiDifficulty === v
                          ? 'bg-orange-100 border-orange-400 text-orange-950 shadow-xs ring-2 ring-orange-300'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-2">
                {aiMode !== 'home' && (
                  <button
                    onClick={() => { resetAiWorkspace(); setAiMode('home'); }}
                    className="soft-button py-3 px-4 text-xs font-bold flex items-center gap-1.5 flex-1 justify-center"
                  >
                    <RefreshCw size={14} /> Reset Lab
                  </button>
                )}
                <div className="text-[10px] text-stone-400 font-semibold leading-tight max-w-[180px] hidden md:block">
                  Current topic: <span className="font-black text-stone-800">{resolveAiTopic()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI LAB: HOME MODE – Entry launcher cards for 6 features */}
          {aiMode === 'home' && !aiLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  id: 'lesson',
                  icon: <Brain size={22} />,
                  color: 'from-orange-500 to-amber-500',
                  title: 'AI Learning Mode',
                  subtitle: 'Full 6-stage interactive lesson',
                  desc: 'AI creates an explanation, analogy, example, prediction question, mini-challenge, and reflection. Adapts to your history.',
                  handler: handleStartAiLesson,
                  badge: 'EXPLORE → IMPROVE',
                },
                {
                  id: 'mission',
                  icon: <Flag size={22} />,
                  color: 'from-indigo-500 to-sky-500',
                  title: 'Learning Mission',
                  subtitle: 'Story-driven real-world task',
                  desc: 'Java → debug a robot. SQL → investigate fraud. Python → build a tool. Networking → fix the office Wi-Fi.',
                  handler: handleStartMission,
                  badge: 'Story Mode',
                },
                {
                  id: 'predict',
                  icon: <HelpCircle size={22} />,
                  color: 'from-fuchsia-500 to-pink-500',
                  title: 'Predict Before Learning',
                  subtitle: 'Make a guess, then learn',
                  desc: 'Before the AI reveals the result, predict what will happen and why. Then see the correct reasoning.',
                  handler: handleStartPrediction,
                  badge: 'PREDICT Stage',
                },
                {
                  id: 'whatif',
                  icon: <Shuffle size={22} />,
                  color: 'from-emerald-500 to-teal-500',
                  title: 'What-If Challenges',
                  subtitle: '3 scenario-changing experiments',
                  desc: '"Increase X by 10×?" "Remove one step?" "Change a boundary condition?" You predict, AI explains.',
                  handler: handleLaunchWhatIf,
                  badge: 'EXPERIMENT Stage',
                },
                {
                  id: 'teachback',
                  icon: <GraduationCap size={22} />,
                  color: 'from-sky-500 to-indigo-500',
                  title: 'Teach-Back Evaluator',
                  subtitle: 'You explain, AI grades it',
                  desc: 'Explain the concept in your own words. Groq scores understanding, accuracy, and flags misconceptions.',
                  handler: handleLaunchTeachBack,
                  badge: 'EXPLAIN Stage',
                },
                {
                  id: 'misconception',
                  icon: <AlertTriangle size={22} />,
                  color: 'from-rose-500 to-red-500',
                  title: 'Misconception Detector',
                  subtitle: 'Turn wrong answers into growth',
                  desc: 'When you get something wrong, AI diagnoses the root confusion and gives a targeted 8-minute correction activity.',
                  handler: handleLaunchMisconception,
                  badge: 'IMPROVE Stage',
                },
              ].map((card) => (
                <motion.button
                  key={card.id}
                  whileHover={{ y: -2 }}
                  onClick={card.handler}
                  className="floating-island bg-white p-6 border border-stone-200 hover:border-orange-300 transition text-left space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-md`}>
                      {card.icon}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-stone-100 text-stone-500">
                      {card.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-stone-950">{card.title}</h3>
                    <p className="text-[11px] font-bold text-orange-700 mt-0.5">{card.subtitle}</p>
                    <p className="text-xs text-stone-600 font-medium leading-relaxed mt-2">{card.desc}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-black text-stone-400 group-hover:text-orange-600 transition uppercase tracking-wider">
                      Launch
                    </span>
                    <ChevronRight size={16} className="text-stone-400 group-hover:text-orange-600 group-hover:translate-x-1 transition" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {/* Loading overlay */}
          {aiLoading && (
            <div className="floating-island bg-white p-10 border border-stone-200 text-center">
              <RefreshCw size={28} className="mx-auto text-orange-500 animate-spin mb-3" />
              <h3 className="font-black text-lg text-stone-950">Groq is crafting your interactive experience…</h3>
              <p className="text-xs text-stone-500 font-semibold mt-1">Structured JSON output, adaptive difficulty, first-principles reasoning.</p>
            </div>
          )}

          {/* AI LAB: LESSON MODE */}
          {aiMode === 'lesson' && currentLesson && !aiLoading && (
            <div className="space-y-5">
              {/* Stage indicator */}
              <StageIndicator stage={aiStage} completion={aiCompletion} />

              <div className="floating-island bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 text-white p-6 md:p-7 border border-stone-800 shadow-xl relative overflow-hidden">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
                <div className="flex flex-wrap items-start justify-between gap-4 relative">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-black uppercase tracking-wider">
                      <Brain size={12} /> AI Learning Mode
                    </span>
                    <h1 className="text-3xl font-black tracking-tight mt-3">
                      {currentLesson.topic}
                      <span className="ml-3 text-[11px] font-black uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full align-middle">
                        {currentLesson.difficulty}
                      </span>
                    </h1>
                    <p className="text-stone-300 text-sm font-semibold mt-1 max-w-2xl">
                      EXPLORE the concept, PREDICT the answer below first, then LEARN, EXPERIMENT, EXPLAIN, & IMPROVE.
                    </p>
                  </div>
                </div>
              </div>

              {/* PREDICT – show BEFORE explanation */}
              {!predictionRevealed && (
                <div className="floating-island bg-gradient-to-br from-fuchsia-50 to-pink-50 p-6 border border-pink-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-sm">
                      <HelpCircle size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-700">STEP 2 · PREDICT BEFORE LEARNING</span>
                      <h3 className="font-black text-lg text-stone-950">Make your prediction FIRST</h3>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-stone-900 mb-4 leading-relaxed">
                    {currentLesson.predictionQuestion?.question}
                  </p>
                  <div className="space-y-2 mb-5">
                    {currentLesson.predictionQuestion?.options?.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setPredictionSelectedOption(i)}
                        className={`w-full p-4 rounded-2xl border text-left text-sm font-semibold transition ${
                          predictionSelectedOption === i
                            ? 'bg-pink-100 border-pink-500 text-pink-950 shadow-xs ring-2 ring-pink-300'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-pink-50/50 hover:border-pink-200'
                        }`}
                      >
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-stone-900/10 text-xs font-black mr-2.5">{String.fromCharCode(65 + i)}</span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleSubmitLessonPrediction}
                    disabled={predictionSelectedOption === null}
                    className="organic-button bg-gradient-to-r from-fuchsia-500 to-pink-500 text-stone-950 py-3.5 px-6 rounded-2xl font-black text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Lock in my prediction & reveal reasoning →
                  </button>
                </div>
              )}

              {predictionRevealed && currentLesson.predictionQuestion && (
                <div className={`floating-island p-6 border ${
                  predictionSelectedOption === currentLesson.predictionQuestion.correctIndex
                    ? 'bg-emerald-50 border-emerald-300'
                    : 'bg-rose-50 border-rose-300'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {predictionSelectedOption === currentLesson.predictionQuestion.correctIndex
                      ? <CheckCircle2 size={22} className="text-emerald-600" />
                      : <AlertTriangle size={22} className="text-rose-600" />}
                    <h3 className={`font-black text-base ${predictionSelectedOption === currentLesson.predictionQuestion.correctIndex ? 'text-emerald-950' : 'text-rose-950'}`}>
                      {predictionSelectedOption === currentLesson.predictionQuestion.correctIndex ? '✅ Prediction correct! Great reasoning intuition.' : '⚠️ Prediction off — this is where the learning starts.'}
                    </h3>
                  </div>
                  <div className="text-sm font-semibold text-stone-800 leading-relaxed bg-white/80 p-4 rounded-2xl border border-stone-200">
                    <span className="font-black text-orange-700 text-xs uppercase tracking-wider">Correct reasoning:</span>
                    <div className="mt-1.5">{currentLesson.predictionQuestion.correctReasoning}</div>
                  </div>
                  {predictionSelectedOption !== currentLesson.predictionQuestion.correctIndex && (
                    <button
                      onClick={handleLaunchMisconception}
                      className="mt-4 soft-button py-2.5 px-4 text-xs font-black text-rose-700 bg-rose-100 border-rose-300 flex items-center gap-1.5"
                    >
                      <AlertTriangle size={14} /> Diagnose & fix my misconception
                    </button>
                  )}
                </div>
              )}

              {/* LEARN – Explanation, Analogy, Example */}
              <div className="grid gap-5 md:grid-cols-2">
                <div className="floating-island bg-white p-6 border border-stone-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-orange-100 text-orange-800">EXPLORE · Explanation</span>
                  </div>
                  <h3 className="font-black text-lg text-stone-950 mb-2 flex items-center gap-2"><BookOpen size={18} className="text-orange-600" /> What it actually is</h3>
                  <p className="text-sm text-stone-700 leading-relaxed font-medium">{currentLesson.explanation}</p>
                </div>

                <div className="floating-island bg-white p-6 border border-stone-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-800">Real-World Analogy</span>
                  </div>
                  <h3 className="font-black text-lg text-stone-950 mb-2 flex items-center gap-2"><Lightbulb size={18} className="text-amber-600" /> Think of it like…</h3>
                  <p className="text-sm text-stone-700 leading-relaxed font-medium italic">"{currentLesson.realWorldAnalogy}"</p>
                </div>
              </div>

              <div className="floating-island bg-white p-6 border border-stone-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-sky-100 text-sky-800">LEARN · Worked Example</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-black text-sm text-stone-950 mb-1.5 flex items-center gap-1.5"><Flag size={14} className="text-sky-600" /> Setup</h4>
                    <p className="text-xs text-stone-700 font-semibold bg-sky-50/60 p-3 rounded-xl border border-sky-100">{currentLesson.example?.setup}</p>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-stone-950 mb-1.5">Step-by-step</h4>
                    <div className="space-y-2">
                      {currentLesson.example?.steps?.map((s, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                          <span className="h-6 w-6 shrink-0 rounded-lg bg-sky-600 text-white font-black text-[11px] flex items-center justify-center">{i + 1}</span>
                          <p className="text-xs text-stone-800 font-semibold pt-0.5">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-stone-950 mb-1.5 flex items-center gap-1.5"><Check size={14} className="text-emerald-600" /> Result</h4>
                    <p className="text-xs text-stone-700 font-semibold bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">{currentLesson.example?.result}</p>
                  </div>
                </div>
              </div>

              {/* EXPERIMENT – What-If + Mini-Challenge */}
              <div className="grid gap-5 md:grid-cols-2">
                <div className="floating-island bg-gradient-to-br from-emerald-50 to-teal-50 p-6 border border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-200/70 text-emerald-900">EXPERIMENT · Mini Challenge</span>
                  </div>
                  <h3 className="font-black text-lg text-stone-950 mb-1">{currentLesson.miniChallenge?.title}</h3>
                  <p className="text-sm text-stone-700 leading-relaxed font-medium mb-4">{currentLesson.miniChallenge?.prompt}</p>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-2">Deliverables:</h4>
                  <ul className="space-y-1.5">
                    {currentLesson.miniChallenge?.expectedDeliverables?.map((d, i) => (
                      <li key={i} className="flex gap-2 text-xs font-semibold text-stone-800">
                        <CheckSquare size={14} className="text-emerald-600 shrink-0 mt-0.5" /> {d}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleLaunchWhatIf}
                    className="mt-5 organic-button bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 py-3 px-4 w-full rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-2"
                  >
                    <Shuffle size={14} /> Run 3 What-If scenarios →
                  </button>
                </div>

                <div className="floating-island bg-white p-6 border border-stone-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">Short Reflection</span>
                  </div>
                  <h3 className="font-black text-lg text-stone-950 mb-2 flex items-center gap-2"><PenTool size={18} className="text-indigo-600" /> Write to consolidate</h3>
                  <p className="text-sm text-stone-700 leading-relaxed font-semibold mb-3">{currentLesson.shortReflection?.prompt}</p>
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">Hints to get started:</h4>
                    {currentLesson.shortReflection?.hints?.map((h, i) => (
                      <div key={i} className="text-xs font-semibold text-stone-600 flex items-start gap-1.5">
                        <Info size={12} className="text-indigo-500 shrink-0 mt-0.5" /> {h}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Teach-back & Finish controls */}
              <div className="floating-island bg-white p-6 border border-stone-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-lg text-stone-950">Ready to prove you understand?</h3>
                    <p className="text-xs text-stone-500 font-semibold mt-1">Teach it back in your own words → AI scores your understanding.</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={handleLaunchTeachBack}
                      className="organic-button bg-gradient-to-r from-sky-500 to-indigo-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2"
                    >
                      <GraduationCap size={14} /> Teach it back →
                    </button>
                    <button
                      onClick={handleFinishAiLesson}
                      className="soft-button py-3 px-5 rounded-2xl text-xs font-black flex items-center gap-2"
                    >
                      <Award size={14} /> Mark session complete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI LAB: MISSION MODE */}
          {aiMode === 'mission' && currentMission && !aiLoading && (
            <div className="space-y-5">
              <div className="floating-island bg-gradient-to-br from-indigo-900 via-slate-900 to-stone-950 text-white p-6 md:p-8 border border-indigo-800/60 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
                <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-sky-500/20 blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-[10px] font-black uppercase tracking-wider">
                        <Flag size={12} /> Learning Mission
                      </span>
                      <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3">{currentMission.title}</h1>
                    </div>
                    <div className="text-right space-y-1">
                      {currentMission.roles?.map((r, i) => (
                        <span key={i} className="block text-[10px] font-black uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full text-indigo-100">{r}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm md:text-base font-semibold text-indigo-100 leading-relaxed max-w-3xl">
                    📖 {currentMission.narrative}
                  </p>
                  <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">🎯 Mission Objective</span>
                    <p className="font-black text-white mt-1.5">{currentMission.objective}</p>
                  </div>
                </div>
              </div>

              <div className="floating-island bg-white p-6 border border-stone-200">
                <h3 className="font-black text-lg text-stone-950 mb-4 flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" /> Mission Tasks
                </h3>
                <div className="space-y-3">
                  {currentMission.tasks?.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200">
                      <span className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black text-xs flex items-center justify-center shadow-sm">{i + 1}</span>
                      <p className="text-sm font-semibold text-stone-800 pt-1">{t}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="floating-island bg-emerald-50/70 p-6 border border-emerald-200">
                  <h3 className="font-black text-base text-emerald-950 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} /> Success Criteria
                  </h3>
                  <ul className="space-y-2">
                    {currentMission.successCriteria?.map((c, i) => (
                      <li key={i} className="flex gap-2 text-sm font-semibold text-stone-800">
                        <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="floating-island bg-amber-50/70 p-6 border border-amber-200">
                  <h3 className="font-black text-base text-amber-950 mb-3 flex items-center gap-2">
                    <Info size={18} /> Mission Debrief
                  </h3>
                  <p className="text-sm text-stone-800 leading-relaxed font-semibold">{currentMission.debrief}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={handleStartPrediction} className="organic-button bg-gradient-to-r from-fuchsia-500 to-pink-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2">
                  <HelpCircle size={14} /> Predict a scenario
                </button>
                <button onClick={handleLaunchWhatIf} className="organic-button bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2">
                  <Shuffle size={14} /> Run What-If experiments
                </button>
                <button onClick={handleLaunchTeachBack} className="organic-button bg-gradient-to-r from-sky-500 to-indigo-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2">
                  <GraduationCap size={14} /> Teach it back
                </button>
              </div>
            </div>
          )}

          {/* AI LAB: PREDICT (free-text standalone) */}
          {aiMode === 'predict' && currentPrediction && !aiLoading && (
            <div className="space-y-5">
              <StageIndicator stage={aiStage} completion={aiCompletion} />
              <div className="floating-island bg-gradient-to-br from-fuchsia-900 via-pink-900 to-stone-950 text-white p-6 md:p-8 border border-pink-800/60 shadow-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-200 text-[10px] font-black uppercase tracking-wider">
                  <HelpCircle size={12} /> Predict Before Learning
                </span>
                <h1 className="text-3xl font-black mt-3 tracking-tight">Predict what happens next</h1>
                <p className="text-pink-100 font-semibold mt-2 leading-relaxed">
                  {currentPrediction.scenario}
                </p>
              </div>
              <div className="floating-island bg-white p-6 border border-stone-200">
                <h3 className="font-black text-base text-stone-950 mb-2 flex items-center gap-2"><Flag size={16} className="text-pink-600" /> Setup</h3>
                <p className="text-sm text-stone-700 font-semibold bg-pink-50/50 p-4 rounded-2xl border border-pink-100 leading-relaxed">{currentPrediction.setup}</p>
              </div>
              {!predictionRevealed ? (
                <div className="floating-island bg-gradient-to-br from-fuchsia-50 to-pink-50 p-6 border border-pink-200">
                  <h3 className="font-black text-lg text-stone-950 mb-1">{currentPrediction.prompt}</h3>
                  <p className="text-xs text-stone-500 font-semibold mb-4">Write your prediction + one-sentence reason.</p>
                  <textarea
                    value={predictionFreeText}
                    onChange={(e) => setPredictionFreeText(e.target.value)}
                    rows={6}
                    placeholder="I predict that… because…"
                    className="w-full bg-white border border-stone-300 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <button
                    onClick={handleSubmitFreeTextPrediction}
                    disabled={!predictionFreeText.trim()}
                    className="mt-4 organic-button bg-gradient-to-r from-fuchsia-500 to-pink-500 text-stone-950 py-3.5 px-6 rounded-2xl font-black text-sm shadow-lg disabled:opacity-50"
                  >
                    Submit my prediction →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="floating-island bg-emerald-50 p-6 border border-emerald-200">
                    <h3 className="font-black text-lg text-emerald-950 mb-2 flex items-center gap-2"><Zap size={18} /> Expected outcome & reasoning</h3>
                    <p className="text-sm text-stone-800 font-semibold leading-relaxed">{currentPrediction.expectedOutcome}</p>
                  </div>
                  <div className="floating-island bg-white p-6 border border-stone-200">
                    <h3 className="font-black text-base text-stone-950 mb-3">🤔 Follow-up questions for your notebook:</h3>
                    <ul className="space-y-2">
                      {currentPrediction.followUpQuestions?.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm font-semibold text-stone-700 p-3 rounded-xl bg-stone-50 border border-stone-100">
                          <HelpCircle size={14} className="text-orange-500 shrink-0 mt-0.5" /> {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <button onClick={handleStartAiLesson} className="organic-button bg-orange-600 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md"><Brain size={14} className="inline mr-1.5" /> Full AI lesson</button>
                    <button onClick={handleLaunchTeachBack} className="organic-button bg-gradient-to-r from-sky-500 to-indigo-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md"><GraduationCap size={14} className="inline mr-1.5" /> Teach it back</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI LAB: WHAT-IF MODE */}
          {aiMode === 'whatif' && currentWhatIf && !aiLoading && (
            <div className="space-y-5">
              <StageIndicator stage={aiStage} completion={aiCompletion} />
              <div className="floating-island bg-gradient-to-br from-emerald-800 via-teal-800 to-stone-950 text-white p-6 md:p-7 border border-emerald-700/60 shadow-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[10px] font-black uppercase tracking-wider">
                  <Shuffle size={12} /> What-If Challenges · EXPERIMENT Stage
                </span>
                <h1 className="text-3xl font-black mt-3 tracking-tight">3 scenario experiments for {resolveAiTopic()}</h1>
                <p className="text-emerald-100 font-semibold text-sm mt-1.5">
                  For each, make your prediction first. Then reveal the actual outcome + reasoning.
                </p>
              </div>
              <div className="space-y-4">
                {currentWhatIf.challenges?.map((c, i) => (
                  <div key={c.id || i} className="floating-island bg-white p-5 md:p-6 border border-stone-200">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-black flex items-center justify-center shadow-sm">{i + 1}</span>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Scenario {String(c.id).toUpperCase()}</span>
                          <h3 className="font-black text-base text-stone-950 leading-tight">{c.prompt}</h3>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Your prediction:</label>
                      <input
                        type="text"
                        placeholder="What do you think will happen? Why?"
                        value={whatIfPredictions[c.id] || ''}
                        onChange={(e) => setWhatIfPredictions({ ...whatIfPredictions, [c.id]: e.target.value })}
                        className="w-full p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                    {!whatIfRevealed[c.id] ? (
                      <button
                        onClick={() => setWhatIfRevealed({ ...whatIfRevealed, [c.id]: true })}
                        className="soft-button py-2.5 px-4 text-xs font-black bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1.5"
                      >
                        <Zap size={13} /> Reveal actual outcome
                      </button>
                    ) : (
                      <div className="space-y-2.5 pt-2 border-t border-stone-100">
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">✅ Actual outcome</span>
                          <p className="text-sm font-bold text-stone-900 leading-relaxed">{c.correctPrediction}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                          <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block mb-1">💡 Reasoning</span>
                          <p className="text-sm font-semibold text-stone-800 leading-relaxed">{c.reasoning}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={handleLaunchTeachBack} className="organic-button bg-gradient-to-r from-sky-500 to-indigo-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2">
                  <GraduationCap size={14} /> Next → Teach it back
                </button>
                <button onClick={handleLaunchMisconception} className="soft-button py-3 px-5 rounded-2xl text-xs font-black flex items-center gap-2">
                  <AlertTriangle size={14} /> Run misconception check
                </button>
              </div>
            </div>
          )}

          {/* AI LAB: TEACH-BACK MODE */}
          {aiMode === 'teachback' && !aiLoading && (
            <div className="space-y-5">
              <StageIndicator stage={aiStage} completion={aiCompletion} />
              <div className="floating-island bg-gradient-to-br from-sky-800 via-indigo-900 to-stone-950 text-white p-6 md:p-7 border border-indigo-700/60 shadow-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-200 text-[10px] font-black uppercase tracking-wider">
                  <GraduationCap size={12} /> Teach-Back · EXPLAIN Stage
                </span>
                <h1 className="text-3xl font-black mt-3 tracking-tight">Explain {resolveAiTopic()} in your own words</h1>
                <p className="text-sky-100 font-semibold text-sm mt-1.5 max-w-3xl leading-relaxed">
                  If you can't teach it simply, you don't understand it yet. Groq will evaluate your accuracy, completeness, and flag hidden misconceptions.
                </p>
              </div>
              {!currentTeachBack ? (
                <div className="floating-island bg-white p-6 border border-stone-200">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-2">Your explanation (Feynman technique):</label>
                  <textarea
                    value={teachBackText}
                    onChange={(e) => setTeachBackText(e.target.value)}
                    rows={10}
                    placeholder={`Imagine you're teaching this to a 12-year-old. 1) Give a one-sentence definition. 2) Walk through a tiny concrete example. 3) Say one common mistake people make.\n\nTip: aim for 120+ characters. Current: ${teachBackText.length}`}
                    className="w-full bg-stone-50 border border-stone-300 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-300 leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                    <span className={`text-[11px] font-black ${teachBackText.length >= 120 ? 'text-emerald-700' : 'text-stone-400'}`}>
                      {teachBackText.length} characters {teachBackText.length >= 120 ? '✓ Good length' : '(min 20+)'}
                    </span>
                    <button
                      onClick={handleSubmitTeachBack}
                      disabled={teachBackText.trim().length < 20}
                      className="organic-button bg-gradient-to-r from-sky-500 to-indigo-500 text-stone-950 py-3 px-6 rounded-2xl text-sm font-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Sparkles size={15} /> Get Groq evaluation
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    {[
                      { label: 'Overall Score', value: currentTeachBack.score, color: 'from-sky-500 to-indigo-500', icon: <Award size={16} /> },
                      { label: 'Accuracy', value: currentTeachBack.accuracy, color: 'from-emerald-500 to-teal-500', icon: <CheckCircle2 size={16} /> },
                      { label: 'Completeness', value: currentTeachBack.completeness, color: 'from-amber-500 to-orange-500', icon: <Layers size={16} /> },
                      { label: 'Understanding', value: currentTeachBack.understanding, color: 'from-fuchsia-500 to-pink-500', icon: <Brain size={16} /> },
                    ].map((m, i) => (
                      <div key={i} className="floating-island bg-white p-5 border border-stone-200 text-center">
                        <div className={`h-10 w-10 mx-auto rounded-2xl bg-gradient-to-br ${m.color} text-white flex items-center justify-center shadow-sm mb-2`}>{m.icon}</div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">{m.label}</div>
                        <div className="text-3xl font-black text-stone-950 mt-0.5">{Math.round(m.value)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="floating-island bg-emerald-50/70 p-5 border border-emerald-200">
                      <h3 className="font-black text-base text-emerald-950 mb-3 flex items-center gap-2"><ThumbsUp size={18} /> Strengths</h3>
                      {currentTeachBack.strengths?.length ? (
                        <ul className="space-y-1.5">
                          {currentTeachBack.strengths.map((s, i) => (
                            <li key={i} className="text-sm font-semibold text-stone-800 flex items-start gap-2"><Check size={14} className="text-emerald-600 shrink-0 mt-0.5" /> {s}</li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-stone-500 font-semibold">No explicit strengths flagged yet.</p>}
                    </div>
                    <div className="floating-island bg-rose-50/70 p-5 border border-rose-200">
                      <h3 className="font-black text-base text-rose-950 mb-3 flex items-center gap-2"><AlertTriangle size={18} /> Misconceptions detected</h3>
                      {currentTeachBack.misconceptions?.length ? (
                        <ul className="space-y-1.5">
                          {currentTeachBack.misconceptions.map((m, i) => (
                            <li key={i} className="text-sm font-semibold text-stone-800 flex items-start gap-2"><X size={14} className="text-rose-600 shrink-0 mt-0.5" /> {m}</li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-stone-500 font-semibold">No misconceptions detected 🎉</p>}
                    </div>
                  </div>
                  <div className="floating-island bg-white p-6 border border-stone-200 space-y-3">
                    <div>
                      <h3 className="font-black text-base text-stone-950 mb-1">💬 Constructive Feedback</h3>
                      <p className="text-sm text-stone-700 font-semibold leading-relaxed bg-orange-50/60 p-4 rounded-2xl border border-orange-100">{currentTeachBack.constructiveFeedback}</p>
                    </div>
                    <div>
                      <h3 className="font-black text-base text-stone-950 mb-1">🔁 Suggested revision prompt</h3>
                      <p className="text-sm text-stone-700 font-semibold leading-relaxed bg-sky-50/60 p-4 rounded-2xl border border-sky-100">{currentTeachBack.suggestedRevision}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {currentTeachBack.misconceptions?.length > 0 && (
                      <button onClick={handleLaunchMisconception} className="organic-button bg-gradient-to-r from-rose-500 to-red-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2">
                        <AlertTriangle size={14} /> Fix my misconceptions
                      </button>
                    )}
                    <button onClick={handleFinishAiLesson} className="organic-button bg-gradient-to-r from-orange-500 to-amber-500 text-stone-950 py-3 px-5 rounded-2xl text-xs font-black shadow-md flex items-center gap-2">
                      <Award size={14} /> Complete session →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI LAB: MISCONCEPTION DETECTOR */}
          {aiMode === 'misconception' && currentMisconception && !aiLoading && (
            <div className="space-y-5">
              <StageIndicator stage={aiStage} completion={aiCompletion} />
              <div className="floating-island bg-gradient-to-br from-rose-800 via-red-900 to-stone-950 text-white p-6 md:p-7 border border-rose-700/60 shadow-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[10px] font-black uppercase tracking-wider">
                  <AlertTriangle size={12} /> Misconception Detector · IMPROVE Stage
                </span>
                <h1 className="text-3xl font-black mt-3 tracking-tight">Let's fix the root confusion, not just the answer.</h1>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="floating-island bg-rose-50/70 p-6 border border-rose-200">
                  <h3 className="font-black text-base text-rose-950 mb-2">🧭 Likely misconception</h3>
                  <p className="text-sm font-semibold text-stone-800 leading-relaxed">{currentMisconception.likelyMisconception}</p>
                </div>
                <div className="floating-island bg-amber-50/70 p-6 border border-amber-200">
                  <h3 className="font-black text-base text-amber-950 mb-2">🤔 Why it feels right</h3>
                  <p className="text-sm font-semibold text-stone-800 leading-relaxed">{currentMisconception.whyItFeelsRight}</p>
                </div>
              </div>
              <div className="floating-island bg-white p-6 border border-stone-200">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center gap-1 inline-flex">
                      <Zap size={10} /> Targeted correction activity
                    </span>
                    <h3 className="font-black text-lg text-stone-950 mt-2">{currentMisconception.targetedActivity?.title}</h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                    ~{currentMisconception.targetedActivity?.durationMinutes || 8} min
                  </span>
                </div>
                <div className="space-y-3 mb-5">
                  {currentMisconception.targetedActivity?.steps?.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-r from-orange-50/50 to-amber-50/40 border border-orange-100">
                      <span className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shadow-sm">{i + 1}</span>
                      <p className="text-sm font-semibold text-stone-800 pt-0.5 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 block mb-1">📚 Worked example hint</span>
                  <p className="text-sm font-semibold text-stone-800 leading-relaxed">{currentMisconception.targetedActivity?.workedExample}</p>
                </div>
              </div>
              <div className="floating-island bg-gradient-to-br from-indigo-50 to-sky-50 p-6 border border-indigo-200">
                <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-800 mb-2 flex items-center gap-1.5">
                  <Check size={14} /> Confirm understanding: {currentMisconception.checkQuestion}
                </label>
                <textarea
                  value={misconceptionAnswer}
                  onChange={(e) => setMisconceptionAnswer(e.target.value)}
                  rows={4}
                  placeholder="Write your answer here, then click the button below to confirm the misconception is resolved."
                  className="w-full bg-white border border-indigo-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  onClick={handleResolveMisconceptionFixed}
                  disabled={misconceptionAnswer.trim().length < 10}
                  className="mt-4 organic-button bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 py-3 px-6 rounded-2xl text-sm font-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle2 size={15} /> I've corrected this misconception → Mark fixed
                </button>
              </div>
            </div>
          )}
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
                <button onClick={handleFinishPracticeSprint} disabled={submittingSession} className="organic-button bg-orange-600 text-stone-950 flex-1 py-3 text-xs font-bold">
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
                          wouldUseAgain === ans ? 'bg-orange-600 border-orange-600 text-stone-950' : 'bg-stone-50 border-stone-200 text-stone-700'
                        }`}
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSubmitFeedback} disabled={submittingFeedback} className="organic-button bg-orange-600 text-stone-950 w-full py-3.5 text-xs font-bold mt-2">
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
