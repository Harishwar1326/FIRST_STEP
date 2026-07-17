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
  BookOpenCheck,
  AlertTriangle,
  FileText,
  HelpCircle,
  Video,
  ArrowLeft,
  PenTool,
  Check
} from 'lucide-react';
import { learningService } from '../../services/learningService';

const LearningAcademyPage = () => {
  // Navigation & Selector States
  const [selectedClass, setSelectedClass] = useState('Class 10');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [learningPath, setLearningPath] = useState(null);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [lessonDetails, setLessonDetails] = useState(null);
  
  // Study Arena states
  const [step, setStep] = useState('selector'); // selector, path, study, quiz, completion, revision
  const [notesText, setNotesText] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [studyStartTime, setStudyStartTime] = useState(null);
  const [drawingStrokes, setDrawingStrokes] = useState(0);

  // Drawing Canvas States
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#2c2416'); // Charcoal
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  // Quiz States
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Analytics & Recommendations
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Load basic path on configuration change
  useEffect(() => {
    fetchLearningPath();
    fetchAnalyticsAndRecommendations();
  }, [selectedClass, selectedSubject]);

  const fetchLearningPath = async () => {
    try {
      setLoading(true);
      const data = await learningService.getLearningPath(selectedClass, selectedSubject);
      setLearningPath(data);
    } catch (err) {
      console.error('Failed to load learning path', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsAndRecommendations = async () => {
    try {
      const pAnalytics = await learningService.getAnalytics();
      setAnalytics(pAnalytics);
      const pRecs = await learningService.getRecommendations();
      setRecommendations(pRecs);
    } catch (err) {
      console.error('Failed to load profile data', err);
    }
  };

  const handleImportCurriculum = async () => {
    try {
      setSeeding(true);
      await learningService.importLessons();
      await fetchLearningPath();
      await fetchAnalyticsAndRecommendations();
    } catch (err) {
      alert('Failed to seed curriculum. Please make sure backend and mongodb are running.');
    } finally {
      setSeeding(false);
    }
  };

  const handleSelectLesson = async (lesson) => {
    if (!lesson.unlocked) return;
    try {
      setLoading(true);
      const data = await learningService.getLessonById(lesson.id);
      setLessonDetails(data);
      setCurrentLessonId(lesson.id);
      setNotesText('');
      setDrawingStrokes(0);
      setQuizAnswers({});
      setQuizResult(null);
      setStudyStartTime(Date.now());
      setStep('study');
      
      // Initialize canvas drawing if DOM updates
      setTimeout(initCanvas, 100);
    } catch (err) {
      console.error('Failed to load lesson detail', err);
    } finally {
      setLoading(false);
    }
  };

  // Canvas Drawing Board Logic
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse and touch events
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setDrawingStrokes(prev => prev + 1);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    
    ctx.strokeStyle = isEraser ? '#ffffff' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawingStrokes(0);
  };

  // Submit study time and drawings/notes
  const handleCompleteStudy = async () => {
    const studyDuration = Math.round((Date.now() - studyStartTime) / 1000); // seconds
    const wordCount = notesText.trim().split(/\s+/).filter(Boolean).length;
    // Assume 180 words per minute average reading speed estimation
    const estReadingSpeed = wordCount > 0 ? Math.round(wordCount / (studyDuration / 60)) : 150;

    try {
      setLoading(true);
      await learningService.submitTask(currentLessonId, {
        taskId: 'study_arena_notes_drawing',
        duration: studyDuration,
        readingSpeed: estReadingSpeed > 50 ? estReadingSpeed : 150,
        notesText,
        drawingStrokes,
        confidenceLevel
      });
      
      // Navigate to Quiz phase
      if (lessonDetails.quiz && lessonDetails.quiz.questions.length > 0) {
        setStep('quiz');
      } else {
        // No quiz, go straight to completion
        await fetchAnalyticsAndRecommendations();
        setStep('completion');
      }
    } catch (err) {
      console.error('Failed to save study tasks', err);
      setStep('quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (qIndex, option) => {
    setQuizAnswers(prev => ({
      ...prev,
      [qIndex]: option
    }));
  };

  const handleSubmitQuiz = async () => {
    // Check if all questions are answered
    const totalQ = lessonDetails.quiz.questions.length;
    const answeredCount = Object.keys(quizAnswers).length;
    
    if (answeredCount < totalQ) {
      alert('Please select an option for all questions before submitting.');
      return;
    }

    try {
      setSubmittingQuiz(true);
      const answersArray = Array.from({ length: totalQ }, (_, i) => quizAnswers[i] || '');
      const response = await learningService.submitQuiz(currentLessonId, answersArray);
      setQuizResult(response);
      await fetchAnalyticsAndRecommendations();
      setStep('completion');
    } catch (err) {
      console.error('Failed to submit quiz', err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <div className="world-page bg-gradient-to-br from-yellow-50 via-orange-50 to-lime-100 min-h-screen pb-20">
      <div className="absolute right-10 top-12 h-44 w-44 rounded-full bg-yellow-200/50 blur-3xl" />
      <div className="absolute bottom-8 left-10 h-40 w-40 rounded-full bg-lime-200/50 blur-3xl" />

      {/* Header Panel */}
      <header className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="story-label">
            <GraduationCap size={14} className="text-orange-700" />
            Adaptive Personalized Learning Engine (APLE)
          </span>
          <h1 className="mt-4 text-3xl md:text-4xl font-black text-stone-950">
            FirstStep Learning Academy
          </h1>
          <p className="mt-2 text-stone-600 font-semibold">
            Continuously analyzing notes, drawing styles, reading speeds, and test responses to build a bespoke path.
          </p>
        </div>

        {/* Quick Seeding Tool & Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {(!learningPath || learningPath.path.length === 0) && (
            <button
              onClick={handleImportCurriculum}
              disabled={seeding}
              className="organic-button text-xs py-2 px-4 flex items-center gap-2"
            >
              {seeding ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Import Demo Curriculum
            </button>
          )}

          {analytics && (
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md border border-white/80 p-2 rounded-full shadow-sm">
              <Flame className="text-orange-600" size={18} />
              <span className="text-xs font-bold text-stone-800">
                Streak: {analytics.studyStreak} days
              </span>
              <div className="h-4 w-px bg-stone-300 mx-1" />
              <Brain className="text-violet-600" size={18} />
              <span className="text-xs font-bold text-stone-800">
                Mastery: {analytics.masteryScore}%
              </span>
              <div className="h-4 w-px bg-stone-300 mx-1" />
              <Award className="text-emerald-600" size={18} />
              <span className="text-xs font-bold text-stone-800">
                Style: {analytics.learningStyle}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* -------------------- STEP 1: CLASS & SUBJECT SELECTOR -------------------- */}
      {step === 'selector' && (
        <section className="relative grid gap-8 md:grid-cols-2">
          {/* Config island */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="floating-island bg-white/80">
            <h2 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
              <Target size={20} className="text-orange-600" />
              Set Your Learning Target
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase text-stone-500 tracking-wider mb-2">Class Level</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Class 10', 'Class 12'].map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClass(cls)}
                      className={`py-3 px-4 rounded-2xl font-bold border transition ${
                        selectedClass === cls
                          ? 'bg-orange-100 border-orange-300 text-orange-950 shadow-sm'
                          : 'bg-white/50 border-white/90 text-stone-600 hover:bg-white'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-stone-500 tracking-wider mb-2">Subject</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Mathematics', 'Science'].map((subj) => (
                    <button
                      key={subj}
                      onClick={() => setSelectedSubject(subj)}
                      className={`py-3 px-4 rounded-2xl font-bold border transition ${
                        selectedSubject === subj
                          ? 'bg-orange-100 border-orange-300 text-orange-950 shadow-sm'
                          : 'bg-white/50 border-white/90 text-stone-600 hover:bg-white'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep('path')}
                className="organic-button w-full mt-4 flex items-center justify-center gap-2 py-4 text-base"
              >
                <Play size={18} />
                Open Learning Path Graph
              </button>
            </div>
          </motion.div>

          {/* Quick Insights Box */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="floating-island bg-stone-900/90 text-stone-100 flex flex-col justify-between"
          >
            <div>
              <span className="story-label bg-stone-800 text-stone-300 border-stone-700">Student Insights</span>
              <h3 className="text-2xl font-black text-white mt-4">Personalized Engine State</h3>
              
              {analytics ? (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <span className="text-stone-400 font-semibold">Predicted Style:</span>
                    <span className="font-bold text-orange-300">{analytics.learningStyle} Learner</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <span className="text-stone-400 font-semibold">Recommended Difficulty:</span>
                    <span className="font-bold text-yellow-300">{analytics.difficulty}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <span className="text-stone-400 font-semibold">Memory Retention:</span>
                    <span className="font-bold text-emerald-400">{(analytics.retentionProbability * 100).toFixed(0)}% chance</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 font-semibold">Attention Duration:</span>
                    <span className="font-bold text-sky-400">{Math.round(analytics.attentionDuration / 60)} min average</span>
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-stone-400">Loading learning engine state parameters...</p>
              )}
            </div>

            <div className="mt-8 bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                <Brain size={16} className="text-orange-400" />
                Adaptive Recommendation Box
              </h4>
              <p className="text-xs leading-relaxed text-stone-300">
                {analytics && analytics.weakConcepts.length > 0 
                  ? `Focusing on weak concepts: ${analytics.weakConcepts.slice(0, 3).join(', ')}. Quizzes and study kits will automatically highlight these.` 
                  : "We'll suggest flashcards, custom notes, and exercises tailored to your focus area once you complete your first lesson quiz!"}
              </p>
            </div>
          </motion.div>
        </section>
      )}

      {/* -------------------- STEP 2: CONCEPT PATHWAY (DYNAMIC GRAPH) -------------------- */}
      {step === 'path' && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('selector')}
              className="soft-button py-2 px-3 flex items-center gap-1 text-xs"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h2 className="text-2xl font-black text-stone-900">
              Concept Unlock Tree: {selectedClass} - {selectedSubject}
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white/40 rounded-3xl border border-white/60">
              <RefreshCw className="animate-spin text-orange-600 mb-4" size={32} />
              <p className="font-bold text-stone-600">Analyzing prerequisites and drawing map...</p>
            </div>
          ) : learningPath && learningPath.path.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              {/* Concept Path Map */}
              <div className="floating-island bg-white/90 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-stone-900 mb-4 flex items-center gap-2">
                    <Flag size={18} className="text-orange-600" />
                    Path Nodes
                  </h3>
                  
                  {/* Dynamic Nodes Render */}
                  <div className="relative pl-6 border-l-2 border-stone-200/80 space-y-6 py-2">
                    {learningPath.path.map((node, index) => (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="relative"
                      >
                        {/* Node bullet */}
                        <div className={`absolute -left-[35px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm ${
                          node.unlocked 
                            ? node.recommendRevisit 
                              ? 'bg-amber-200 border-amber-400 text-stone-800' 
                              : 'bg-emerald-500 border-emerald-600 text-white'
                            : 'bg-stone-200 border-stone-300 text-stone-400'
                        }`}>
                          {node.unlocked ? (
                            node.recommendRevisit ? <AlertTriangle size={12} /> : <Check size={12} />
                          ) : (
                            <Lock size={12} />
                          )}
                        </div>

                        {/* Node Card */}
                        <div className={`p-4 rounded-2xl border transition ${
                          node.unlocked
                            ? 'bg-white border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-md cursor-pointer'
                            : 'bg-stone-50/60 border-stone-200/60 text-stone-400 cursor-not-allowed'
                        }`}
                        onClick={() => handleSelectLesson(node)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">
                                Order {node.order} • {node.chapter}
                              </span>
                              <h4 className={`text-base font-black mt-1 ${node.unlocked ? 'text-stone-950' : 'text-stone-400'}`}>
                                {node.title}
                              </h4>
                              {node.reasonLocked && (
                                <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1">
                                  <Lock size={12} /> {node.reasonLocked}
                                </p>
                              )}
                              {node.recommendRevisit && (
                                <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                                  <AlertTriangle size={12} /> Weak concepts identified! Review recommended.
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
                                <Clock size={12} /> {node.estimatedStudyTime} min
                              </span>
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-2 ${
                                node.difficulty === 'Beginner' ? 'bg-emerald-100 text-emerald-800' :
                                node.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-800' :
                                'bg-violet-100 text-violet-800'
                              }`}>
                                {node.difficulty}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Path Info & Legend */}
              <div className="space-y-6">
                <div className="floating-island bg-gradient-to-br from-orange-100 to-amber-100 border-amber-200">
                  <h3 className="text-lg font-black text-stone-900 mb-2 flex items-center gap-2">
                    <Sparkles size={18} className="text-orange-700" />
                    Adaptive Flow Rules
                  </h3>
                  <p className="text-sm leading-relaxed text-stone-700 font-medium">
                    Instead of forcing you linear lesson progression, FirstStep evaluates concept dependencies.
                    If a prerequisite like <strong className="text-stone-950">Linear Equations</strong> remains weak, succeeding lessons like <strong className="text-stone-950">Quadratic Equations</strong> will automatically lock or recommend revision sprints to protect memory retention!
                  </p>
                </div>

                <div className="floating-island bg-white/80">
                  <h3 className="text-sm font-black text-stone-900 mb-4">Map Legend</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Check size={10} /></div>
                      <span className="text-xs font-semibold text-stone-600">Unlocked & Completed / Ready</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-amber-200 border border-amber-400 flex items-center justify-center text-stone-800"><AlertTriangle size={10} /></div>
                      <span className="text-xs font-semibold text-stone-600">Completed but containing Weak Concepts (Needs Revisit)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-400"><Lock size={10} /></div>
                      <span className="text-xs font-semibold text-stone-600">Prerequisite Locked (Complete prior node)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 bg-white/60 rounded-3xl border border-white/80">
              <AlertTriangle className="text-amber-500 mb-4" size={40} />
              <h3 className="text-xl font-bold text-stone-800">No lessons seeded in database yet</h3>
              <p className="text-stone-500 mt-2 max-w-md text-center">
                Initialize the database using the "Import Demo Curriculum" button to experience the adaptive pathway.
              </p>
              <button
                onClick={handleImportCurriculum}
                disabled={seeding}
                className="organic-button mt-6 flex items-center gap-2"
              >
                {seeding ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Seeding Demo Curriculum Data
              </button>
            </div>
          )}
        </motion.section>
      )}

      {/* -------------------- STEP 3: LESSON STUDY ARENA -------------------- */}
      {step === 'study' && lessonDetails && (
        <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('path')}
                className="soft-button py-2 px-3 flex items-center gap-1 text-xs"
              >
                <ArrowLeft size={14} /> Path Tree
              </button>
              <div>
                <span className="text-xs font-black uppercase text-stone-500 tracking-wider">
                  Studying • {lessonDetails.lesson.chapter}
                </span>
                <h2 className="text-2xl font-black text-stone-900">{lessonDetails.lesson.title}</h2>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-xs text-stone-400 font-bold block">Estimated time</span>
              <span className="text-sm font-black text-stone-700 flex items-center gap-1 justify-end">
                <Clock size={14} /> {lessonDetails.lesson.estimatedStudyTime} min
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Column: Lesson Content & Video player */}
            <div className="space-y-6">
              {/* Media viewer */}
              {lessonDetails.lesson.videoUrl && (
                <div className="floating-island bg-stone-900 p-0 overflow-hidden relative aspect-video shadow-lg">
                  <iframe
                    className="w-full h-full border-0"
                    src={lessonDetails.lesson.videoUrl}
                    title="Lesson Explainer Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              {/* Text viewer */}
              <div className="floating-island bg-white p-6 md:p-8 space-y-4">
                <h3 className="text-xl font-black text-stone-900">Lesson Material</h3>
                <p className="text-stone-700 leading-relaxed font-medium whitespace-pre-wrap">
                  {lessonDetails.lesson.content}
                </p>
              </div>
            </div>

            {/* Right Column: Note-taking & Drawing canvas */}
            <div className="space-y-6">
              {/* Drawing Board Canvas */}
              <div className="floating-island bg-white p-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-3">
                  <h3 className="font-black text-stone-900 flex items-center gap-2 text-sm">
                    <PenTool size={16} className="text-orange-600" />
                    Interactive Drawing Canvas
                  </h3>

                  {/* Canvas Controls */}
                  <div className="flex items-center gap-2">
                    {/* Color dots */}
                    {['#2c2416', '#b43c24', '#245cb4', '#24845c'].map((color) => (
                      <button
                        key={color}
                        onClick={() => { setBrushColor(color); setIsEraser(false); }}
                        style={{ backgroundColor: color }}
                        className={`h-5 w-5 rounded-full border transition ${
                          brushColor === color && !isEraser ? 'scale-125 ring-2 ring-orange-300' : ''
                        }`}
                      />
                    ))}
                    
                    <div className="w-px h-4 bg-stone-300 mx-1" />

                    <button
                      onClick={() => setIsEraser(prev => !prev)}
                      className={`p-1.5 rounded transition ${
                        isEraser ? 'bg-amber-100 text-amber-800' : 'text-stone-500 hover:bg-stone-100'
                      }`}
                      title="Eraser"
                    >
                      <Palette size={16} />
                    </button>

                    <button
                      onClick={clearCanvas}
                      className="p-1.5 rounded text-stone-500 hover:bg-stone-100"
                      title="Clear Board"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-stone-100 border border-stone-200 rounded-2xl overflow-hidden cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={450}
                    height={220}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full bg-white h-[220px]"
                  />
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                  <span className="text-[10px] font-bold text-stone-400">
                    Strokes tracked: {drawingStrokes}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">
                    Drawing style counts toward Visual Learner features
                  </span>
                </div>
              </div>

              {/* Note-Taking Panel */}
              <div className="floating-island bg-white p-4">
                <h3 className="font-black text-stone-900 flex items-center gap-2 text-sm mb-3">
                  <Edit size={16} className="text-orange-600" />
                  Manual Notebook
                </h3>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Summarize or type important key terms from this lesson here. Text length and keywords influence the Text Learner classifications..."
                  rows={4}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 font-medium"
                />
              </div>

              {/* Self-Rating & Action */}
              <div className="floating-island bg-white/80 p-4 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-stone-500 tracking-wider mb-2">
                    How confident do you feel about this lesson? (1-5)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setConfidenceLevel(lvl)}
                        className={`flex-1 py-2 rounded-xl font-bold border transition ${
                          confidenceLevel === lvl
                            ? 'bg-amber-100 border-amber-300 text-amber-950'
                            : 'bg-white border-white text-stone-600 hover:bg-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCompleteStudy}
                  className="organic-button w-full py-4 text-base flex items-center justify-center gap-2"
                >
                  Proceed to Quiz
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* -------------------- STEP 4: DIAGNOSTIC QUIZ ARENA -------------------- */}
      {step === 'quiz' && lessonDetails && lessonDetails.quiz && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-stone-200 pb-4 mb-4">
            <span className="text-xs font-black uppercase text-stone-500 tracking-wider">
              Diagnostic Assessment
            </span>
            <h2 className="text-2xl font-black text-stone-900">Concept Verification Quiz</h2>
            <p className="text-sm font-semibold text-stone-500">
              Answer the questions below to test your understanding. Results update your mastery index.
            </p>
          </div>

          <div className="space-y-6">
            {lessonDetails.quiz.questions.map((q, qIdx) => (
              <div key={q._id} className="floating-island bg-white p-5">
                <span className="text-xs font-black text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-md">
                  Concept: {q.concept}
                </span>
                <h4 className="text-base font-black text-stone-950 mt-3 mb-4">
                  {qIdx + 1}. {q.questionText}
                </h4>

                <div className="space-y-3">
                  {q.options.map((option) => {
                    const isSelected = quizAnswers[qIdx] === option;
                    return (
                      <button
                        key={option}
                        onClick={() => handleSelectAnswer(qIdx, option)}
                        className={`w-full text-left p-3 rounded-xl border font-bold transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-orange-50 border-orange-300 text-orange-950'
                            : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                        }`}
                      >
                        <span>{option}</span>
                        {isSelected && <CheckCircle2 size={16} className="text-orange-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmitQuiz}
              disabled={submittingQuiz}
              className="organic-button w-full py-4 text-base flex items-center justify-center gap-2"
            >
              {submittingQuiz ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Analyzing response features...
                </>
              ) : (
                <>
                  Submit Diagnostic Quiz
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>
          </div>
        </motion.section>
      )}

      {/* -------------------- STEP 5: SESSION SUCCESS DASHBOARD -------------------- */}
      {step === 'completion' && (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          {/* Trophy Header */}
          <div className="floating-island bg-gradient-to-br from-emerald-100 to-lime-100 border-emerald-200 p-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-4 animate-glow-soft">
              <Award size={36} />
            </div>
            
            <h2 className="text-2xl font-black text-stone-900">Lesson Activity Processed!</h2>
            <p className="text-sm font-semibold text-stone-600 mt-2 max-w-md">
              Your profile features have been extracted. The Scikit-learn pipelines completed calculations.
            </p>

            {quizResult && (
              <div className="mt-6 grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="bg-white/80 p-3 rounded-2xl border border-white">
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Quiz Accuracy</span>
                  <span className="text-xl font-black text-emerald-800">{quizResult.scorePct.toFixed(0)}%</span>
                </div>
                <div className="bg-white/80 p-3 rounded-2xl border border-white">
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Mastery Index</span>
                  <span className="text-xl font-black text-stone-850">{quizResult.newMastery}%</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Growth Updates */}
          <div className="floating-island bg-white p-6 space-y-4">
            <h3 className="font-black text-stone-950 text-base flex items-center gap-2 border-b border-stone-100 pb-3">
              <Sparkles size={16} className="text-orange-600" />
              Machine Learning Feedback
            </h3>

            {analytics ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-150">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Learning Style Mode</span>
                  <p className="text-base font-black text-stone-900 mt-1">{analytics.learningStyle}</p>
                  <p className="text-xs text-stone-500 font-semibold mt-1">Based on reading speed & canvas drawing activity.</p>
                </div>
                
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-150">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Difficulty Setting</span>
                  <p className="text-base font-black text-stone-900 mt-1">{analytics.difficulty}</p>
                  <p className="text-xs text-stone-500 font-semibold mt-1">Difficulty level adapted for personalized notes and questions.</p>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-150">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Memory Retention</span>
                  <p className="text-base font-black text-stone-900 mt-1">{(analytics.retentionProbability * 100).toFixed(0)}% Probability</p>
                  <p className="text-xs text-stone-500 font-semibold mt-1">Estimated duration until concept decay.</p>
                </div>

                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-150">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Study Streaks</span>
                  <p className="text-base font-black text-stone-900 mt-1">{analytics.studyStreak} Active Sessions</p>
                  <p className="text-xs text-stone-500 font-semibold mt-1">Keep studying daily to boost retention.</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 font-bold">Synchronizing analytic matrices...</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('path')}
              className="soft-button flex-1 py-4 text-base"
            >
              Back to Concept Tree
            </button>
            <button
              onClick={() => setStep('revision')}
              className="organic-button flex-1 py-4 text-base"
            >
              Open Personalized Study Kit
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.section>
      )}

      {/* -------------------- STEP 6: REVISION & STUDY KIT PORTAL -------------------- */}
      {step === 'revision' && (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setStep('path')}
              className="soft-button py-2 px-3 flex items-center gap-1 text-xs"
            >
              <ArrowLeft size={14} /> Path Tree
            </button>
            <h2 className="text-2xl font-black text-stone-900">Your AI Personalized Study Kit</h2>
          </div>

          {recommendations ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Column 1: AI Generated Notes & Explanation level */}
              <div className="space-y-6">
                {recommendations.notes && recommendations.notes.map((note, idx) => (
                  <div key={idx} className="floating-island bg-white p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                      <h3 className="text-lg font-black text-stone-950 flex items-center gap-2">
                        <FileText size={18} className="text-orange-600" />
                        {note.title}
                      </h3>
                      <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                        Level: {note.level} Notes
                      </span>
                    </div>
                    <div className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap bg-stone-50 border border-stone-150 p-4 rounded-2xl font-medium max-h-[400px] overflow-y-auto">
                      {note.content}
                    </div>
                  </div>
                ))}

                {/* Spaced repetition flashcards */}
                <div className="floating-island bg-white p-6">
                  <h3 className="text-lg font-black text-stone-950 mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
                    <Brain size={18} className="text-violet-600" />
                    Personalized Flashcards (Weak Concepts)
                  </h3>

                  {recommendations.flashcards && recommendations.flashcards.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
                      {recommendations.flashcards.map((card, idx) => (
                        <div key={idx} className="bg-stone-50 hover:bg-violet-50/40 p-4 rounded-2xl border border-stone-150 transition cursor-help">
                          <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded">
                            Concept: {card.concept}
                          </span>
                          <h4 className="font-bold text-stone-950 mt-2 text-sm">{card.front}</h4>
                          <p className="text-xs text-stone-600 font-semibold mt-2 border-t border-stone-200/80 pt-2 leading-relaxed">
                            {card.back}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 font-semibold">No flashcards currently due for weak concepts.</p>
                  )}
                </div>
              </div>

              {/* Column 2: Videos, Challenges, and Revision Schedule */}
              <div className="space-y-6">
                {/* Videos */}
                <div className="floating-island bg-white p-6">
                  <h3 className="text-lg font-black text-stone-950 mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
                    <Video size={18} className="text-sky-600" />
                    Recommended Video Resources
                  </h3>

                  <div className="space-y-3">
                    {recommendations.videos && recommendations.videos.map((vid, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 bg-stone-50 p-3 rounded-2xl border border-stone-150">
                        <div className="min-w-0">
                          <h4 className="font-bold text-stone-900 text-sm truncate">{vid.title}</h4>
                          <span className="text-[10px] font-semibold text-stone-500">
                            Subject Chapter: {vid.concept} • Duration: {vid.duration}
                          </span>
                        </div>
                        <a
                          href={vid.url}
                          target="_blank"
                          rel="noreferrer"
                          className="soft-button text-xs py-1.5 px-3 shrink-0 flex items-center gap-1"
                        >
                          Play
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Challenges & Revisions */}
                <div className="floating-island bg-white p-6">
                  <h3 className="text-lg font-black text-stone-950 mb-4 flex items-center gap-2 border-b border-stone-100 pb-3">
                    <Target size={18} className="text-rose-600" />
                    Personalized Practice Challenge
                  </h3>

                  {recommendations.challenges && recommendations.challenges.map((c, idx) => (
                    <div key={idx} className="bg-stone-50 p-4 rounded-2xl border border-stone-150">
                      <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                        Difficulty: {c.difficulty}
                      </span>
                      <h4 className="font-bold text-stone-950 mt-2 text-sm">{c.title}</h4>
                      <p className="text-xs text-stone-600 font-semibold mt-2 leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 bg-white/60 rounded-3xl border border-white/80">
              <RefreshCw className="animate-spin text-orange-600 mb-4" size={32} />
              <p className="font-bold text-stone-600">Generating study kit recommendations...</p>
            </div>
          )}
        </motion.section>
      )}
    </div>
  );
};

export default LearningAcademyPage;
