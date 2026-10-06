export const LEARNING_TECHNIQUES = [
  {
    id: 'active-recall',
    name: 'Active Recall',
    tagline: 'Testing yourself to retrieve information from memory without notes',
    category: 'Retrieval & Memory',
    icon: 'Brain',
    difficulty: 'Moderate',
    recommendedDuration: '20–30 mins',
    description: 'Active Recall is the process of retrieving information from memory without looking at study material or notes. Forcing your brain to retrieve knowledge strengthens neural connections and builds strong long-term memory.',
    bestUsedWhen: [
      'Before exams & diagnostic tests',
      'During revision cycles',
      'When you forget concepts easily',
      'When you want to verify your actual memory instead of feeling familiar'
    ],
    notIdealWhen: [
      'When you have not understood the basic concept at all yet',
      'When you are encountering a completely new topic for the first 5 minutes'
    ],
    steps: [
      'Study the concept or section for 15–20 minutes.',
      'Close your textbook, slides, and notes completely.',
      'Write down or speak out loud everything you remember from memory.',
      'Answer 5–10 practice questions without looking at the answer key.',
      'Compare your responses directly with your notes.',
      'Mark the specific concepts or details you failed to recall.',
      'Review only those weak areas in your notes.',
      'Test yourself again on the weak points 24 hours later.'
    ],
    whyItWorks: 'Testing memory produces the psychological "Testing Effect". Every time you retrieve a concept, your brain reorganizes the information, making it vastly easier to access during exams.',
    expectedBenefit: 'Increases exam retention by up to 150% and dramatically cuts down total study time.',
    commonMistakes: [
      'Peeking at notes too early before trying hard to remember.',
      'Only practicing recall on easy concepts while ignoring difficult ones.',
      'Confusing recognition (feeling familiar while reading) with true recall.'
    ],
    example: 'After studying Newton\'s Laws for 15 minutes, close your book and draw free-body diagrams and write all 3 laws from memory.',
    activities: {
      min5: 'Brain Dump: Set a 5-min timer. On a blank paper, list every key formula and concept from memory.',
      min15: 'Blurting Sprint: Read for 5 mins, close notes, spend 7 mins blurting everything on paper, spend 3 mins correcting errors.',
      min30: 'Full Active Recall Matrix: 15 mins blind note writing, 10 mins flashcards from memory, 5 mins error correction.'
    }
  },
  {
    id: 'spaced-repetition',
    name: 'Spaced Repetition',
    tagline: 'Reviewing concepts at expanding time intervals to beat the forgetting curve',
    category: 'Memory & Retention',
    difficulty: 'Easy',
    recommendedDuration: '15–20 mins daily',
    description: 'Spaced Repetition is a memory technique where reviews of learned material are spaced out over increasing intervals (e.g., 1 day, 3 days, 7 days, 14 days, 30 days).',
    bestUsedWhen: [
      'Preparing for exams weeks in advance',
      'Long-term vocabulary, formulas, and definitions',
      'When performance drops several days after initial learning',
      'Building permanent knowledge for future courses'
    ],
    notIdealWhen: [
      'Your exam is TOMORROW (you need rapid recall testing, not long-term spacing)',
      'You are trying to understand deep conceptual problem-solving for the first time'
    ],
    steps: [
      'Learn the target topic on Day 1.',
      'Review key cards or questions on Day 2 (24 hours later).',
      'Review again on Day 5 (3 days later).',
      'Review again on Day 12 (7 days later).',
      'If you forget a item during review, reset its interval back to Day 1.'
    ],
    whyItWorks: 'According to Ebbinghaus\' Forgetting Curve, memory decays exponentially. Reviewing right at the moment of forgetting resets the curve and consolidates memory into long-term storage.',
    expectedBenefit: 'Ensures 85%+ long-term retention with 50% less total study time compared to cramming.',
    commonMistakes: [
      'Cramming all reviews into a single weekend session.',
      'Reviewing easy cards too frequently while ignoring difficult ones.'
    ],
    example: 'Review Java OOP flashcards today, then schedule the next review for 3 days later, then 7 days later.',
    activities: {
      min5: 'Quick Deck Review: Review 10 due flashcards rated by difficulty.',
      min15: 'Spaced Deck Session: Complete 25 due cards across 3 subject topics.',
      min30: 'Deep Spaced Master: Complete all due cards + create 5 new cards for newly studied concepts.'
    }
  },
  {
    id: 'retrieval-practice',
    name: 'Retrieval Practice',
    tagline: 'Deliberate practice tests and low-stakes self-quizzing',
    category: 'Assessment & Practice',
    difficulty: 'Moderate',
    recommendedDuration: '20–30 mins',
    description: 'Retrieval Practice involves intentionally bringing learned information to mind through diagnostic questions, practice problems, and low-stakes self-quizzing.',
    bestUsedWhen: [
      'Preparing for quizzes and exams',
      'When you consume lots of textbook/video content without testing yourself',
      'When you want to convert passive knowledge into active problem solving'
    ],
    notIdealWhen: [
      'When you have zero familiarity with the subject vocabulary',
      'When you are seeking high-level visual mind map connections'
    ],
    steps: [
      'Select 5–10 diagnostic practice questions.',
      'Attempt all questions without looking at hints or notes.',
      'Check your answers and grade your performance.',
      'Analyze the root cause of every incorrect response.',
      'Re-attempt missed questions 24 hours later.'
    ],
    whyItWorks: 'Forces your mind to evaluate application strategies rather than passive reading.',
    expectedBenefit: 'Sharpens problem-solving speed and eliminates exam anxiety.',
    commonMistakes: ['Checking answer keys after every single question.'],
    example: 'Solve 5 physics numerical problems on Thermodynamics without looking at solved examples.',
    activities: {
      min5: '5-Question Sprint: Answer 5 rapid-fire diagnostic questions.',
      min15: 'Diagnostic Problem Set: Complete 3 medium-difficulty diagnostic questions with timed pressure.',
      min30: 'Full Retrieval Mock: Complete a 15-question diagnostic test followed by error analysis.'
    }
  },
  {
    id: 'practice-testing',
    name: 'Practice Testing',
    tagline: 'Simulating exam conditions under strict time constraints',
    category: 'Assessment & Practice',
    difficulty: 'Hard',
    recommendedDuration: '30–60 mins',
    description: 'Practice Testing consists of taking simulated full-length tests under realistic exam conditions without open books or extensions.',
    bestUsedWhen: [
      'Exam is in 1–3 days',
      'You understand theory but struggle with time management during tests',
      'You need to build exam stamina and speed'
    ],
    notIdealWhen: [
      'You are just starting to learn a subject',
      'You have not reviewed basic definitions yet'
    ],
    steps: [
      'Select a full mock test paper or chapter problem set.',
      'Set a strict countdown timer.',
      'Hide all books, notes, and phones.',
      'Complete the entire test without stopping.',
      'Perform a thorough error audit after finishing.'
    ],
    whyItWorks: 'Builds stamina, pacing speed, and psychological resilience under time pressure.',
    expectedBenefit: 'Prepares you for exam pressure and optimizes question pacing.',
    commonMistakes: ['Pausing the timer or checking notes midway.'],
    example: 'Complete a timed 30-minute practice test on Chapter 4 without opening notes.',
    activities: {
      min5: 'Speed Audit: Answer 3 timed exam questions in 5 minutes.',
      min15: 'Mini Mock Test: Complete a 10-question timed practice test.',
      min30: 'Sectional Exam Simulation: Complete a 20-question timed unit assessment.'
    }
  },
  {
    id: 'feynman-technique',
    name: 'Feynman Technique',
    tagline: 'Explaining concepts in simple, plain language as if teaching a 12-year-old',
    category: 'Deep Understanding',
    difficulty: 'Moderate',
    recommendedDuration: '15–30 mins',
    description: 'Named after Nobel laureate Richard Feynman, this technique requires you to explain a complex topic in simple terms as if teaching a beginner.',
    bestUsedWhen: [
      'Understanding a brand new or very difficult topic',
      'When you get confused between similar concepts',
      'When you memorize definitions but struggle with conceptual questions'
    ],
    notIdealWhen: [
      'You need quick speed memorization of 50 raw dates or formulas 1 hour before an exam'
    ],
    steps: [
      'Choose a concept (e.g., Recursion, Photosynthesis, Gravitational Potential).',
      'Write an explanation on paper using simple everyday words and analogies.',
      'Identify places where you got stuck or used complex jargon.',
      'Return to the textbook/notes to clarify your understanding.',
      'Simplify your explanation again until a child could understand it.'
    ],
    whyItWorks: 'Jargon masks gaps in your understanding. Forcing yourself to use simple analogies exposes exactly where comprehension breaks down.',
    expectedBenefit: 'Transforms weak memorization into deep, intuitive mastery.',
    commonMistakes: ['Using technical jargon or textbook definitions in your explanation.'],
    example: 'Explain recursion by using the analogy of standing between two parallel mirrors.',
    activities: {
      min5: 'ELI5 Challenge: Write a 3-sentence explanation using zero technical jargon.',
      min15: 'Feynman Draft & Refine: Write out explanation, highlight jargon, rewrite with analogies.',
      min30: 'Teaching Simulation: Record a 5-minute explanation and review against textbook facts.'
    }
  },
  {
    id: 'interleaving',
    name: 'Interleaving',
    tagline: 'Alternating between different subjects or problem types in one session',
    category: 'Problem Solving',
    difficulty: 'Hard',
    recommendedDuration: '30–45 mins',
    description: 'Interleaving is a technique where you mix different topics, subjects, or problem types within a single study session rather than block-studying one topic for hours.',
    bestUsedWhen: [
      'You understand theory but cannot solve mixed exam problems',
      'You get confused between related formulas or problem approaches',
      'Studying math, physics, coding, or problem-heavy subjects'
    ],
    notIdealWhen: [
      'You are encountering a topic for the very first time'
    ],
    steps: [
      'Pick 3 related topics (e.g., Quadratics, Polynomials, Linear Systems).',
      'Spend 15 minutes on Topic A, then switch immediately to Topic B, then Topic C.',
      'Mix practice problems so you cannot guess the solution method from context.',
      'Analyze why a specific approach works for each problem.'
    ],
    whyItWorks: 'Block studying tricks your brain into using the same formula repeatedly. Interleaving trains your brain to select the correct approach when faced with mixed exam questions.',
    expectedBenefit: 'Dramatically improves problem discrimination and conceptual agility.',
    commonMistakes: ['Switching topics too rapidly before understanding baseline concepts.'],
    example: 'Solve 2 Calculus integrals, 2 Geometry proofs, and 2 Probability questions in one 30-minute practice session.',
    activities: {
      min5: 'Mixed Warmup: Solve 1 Math problem, 1 Physics problem, and 1 Chemistry question.',
      min15: 'Triple-Topic Switch: 5 mins Algebra + 5 mins Geometry + 5 mins Statistics.',
      min30: 'Interleaved Problem Matrix: Solve a randomized deck of 10 mixed-concept problem cards.'
    }
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro / Focus Sessions',
    tagline: 'Structured 25-minute focused work intervals with 5-minute restorative breaks',
    category: 'Focus & Discipline',
    difficulty: 'Easy',
    recommendedDuration: '25–50 mins',
    description: 'The Pomodoro Technique breaks study time into intense 25-minute focus intervals followed by 5-minute breaks, preserving energy and preventing cognitive fatigue.',
    bestUsedWhen: [
      'You cannot concentrate or feel overwhelmed',
      'Your interest level in the subject is low',
      'You procrastinate or get distracted by your phone'
    ],
    notIdealWhen: [
      'You are in a state of deep, uninterrupted flow state'
    ],
    steps: [
      'Select a single specific learning task.',
      'Set a timer for 25 minutes.',
      'Work with 100% focus until the timer rings.',
      'Take a 5-minute break away from screens.',
      'After 4 pomodoros, take a longer 20-minute break.'
    ],
    whyItWorks: 'Protects focus by creating urgency and providing structured rest to prevent burnout.',
    expectedBenefit: 'Eliminates procrastination and doubles focus duration.',
    commonMistakes: ['Checking phone notifications during the 25-minute focus interval.'],
    example: 'Run a 25-minute distraction-free reading session on Cell Biology.',
    activities: {
      min5: 'Micro Sprint: 5-minute hyper-focus task completion.',
      min15: 'Single Sprint: 15-minute uninterrupted study sprint.',
      min30: 'Classic Pomodoro: 25 minutes of deep focus + 5 minutes rest.'
    }
  },
  {
    id: 'concept-mapping',
    name: 'Concept Mapping',
    tagline: 'Visualizing connections between ideas, themes, and sub-concepts',
    category: 'Deep Understanding',
    difficulty: 'Moderate',
    recommendedDuration: '20–30 mins',
    description: 'Concept Mapping is a visual learning technique where you construct web diagrams showing relationships between main concepts and sub-topics.',
    bestUsedWhen: [
      'You get confused between concepts',
      'Studying broad interconnected subjects like Biology, History, DBMS, or System Design',
      'Synthesizing a full unit after reading several topics'
    ],
    notIdealWhen: [
      'You need fast numerical problem-solving practice 2 hours before an exam'
    ],
    steps: [
      'Place the central topic in the middle of a canvas/paper.',
      'Draw branch nodes for main sub-themes.',
      'Add connecting arrows labeled with relationship descriptions (e.g., "causes", "requires", "leads to").',
      'Identify cross-links between different branches.'
    ],
    whyItWorks: 'Human memory is associative. Mapping ideas visually mirrors how knowledge graphs are structured in long-term memory.',
    expectedBenefit: 'Improves high-level synthesis and structural understanding.',
    commonMistakes: ['Creating linear outlines instead of branching network diagrams.'],
    example: 'Map out the relationship between Photosynthesis, Cellular Respiration, and ATP energy.',
    activities: {
      min5: 'Quick Mind Tree: Draw a 5-branch concept tree for today\'s topic.',
      min15: 'Interactive Knowledge Map: Connect 10 concepts on a canvas with relationship lines.',
      min30: 'Full Unit Diagram: Create a comprehensive mind map linking all topics in the unit.'
    }
  },
  {
    id: 'blurting',
    name: 'Blurting Method',
    tagline: 'Reading a section, closing notes, and rapidly writing everything remembered',
    category: 'Retrieval & Memory',
    difficulty: 'Moderate',
    recommendedDuration: '15–20 mins',
    description: 'The Blurting Method involves reading a page or chapter section, closing the notes, and rapidly writing down every single fact, diagram, and keyword remembered on paper.',
    bestUsedWhen: [
      'Exam is tomorrow or in 1–2 days',
      'Need quick revision of facts, diagrams, and definitions',
      'Want to quickly uncover missing knowledge gaps'
    ],
    notIdealWhen: [
      'Learning complex multi-step mathematical problem solving'
    ],
    steps: [
      'Read a textbook section or slide deck for 5 minutes.',
      'Hide all study materials.',
      'Set a 5-minute timer and write/draw everything you remember as fast as possible.',
      'Open your notes with a red pen.',
      'Add missing facts and correct mistakes in red.',
      'Focus your next blurting cycle only on the red pen items.'
    ],
    whyItWorks: 'Combines active recall with immediate visual error correction.',
    expectedBenefit: 'Provides an instant diagnostic map of what you actually know.',
    commonMistakes: ['Writing neatly instead of blurting rapidly.'],
    example: 'Blurt out all DBMS normalization rules (1NF, 2NF, 3NF, BCNF) in 5 minutes.',
    activities: {
      min5: '5-Min Blurt: Rapidly blurt formulas on paper.',
      min15: 'Section Blurt & Check: Read for 5m, blurt for 7m, check for 3m.',
      min30: 'Multi-Topic Blurt Matrix: Blurt 3 separate sub-topics sequentially.'
    }
  },
  {
    id: 'sq3r',
    name: 'SQ3R (Survey, Question, Read, Recite, Review)',
    tagline: 'Structured 5-step comprehension framework for textbook reading',
    category: 'Organization',
    difficulty: 'Moderate',
    recommendedDuration: '30–45 mins',
    description: 'SQ3R is a comprehension framework consisting of 5 steps: Survey, Question, Read, Recite, and Review to maximize reading retention.',
    bestUsedWhen: [
      'Reading long dense chapters, research papers, or heavy textbooks',
      'When you don\'t know where to start',
      'When passive reading makes you sleepy or unfocused'
    ],
    notIdealWhen: [
      'You have less than 1 hour before an exam'
    ],
    steps: [
      'Survey: Skim headings, charts, and summaries for 2 minutes.',
      'Question: Turn headings into questions (e.g., "What is BCNF?").',
      'Read: Read section with the goal of answering your questions.',
      'Recite: Answer the questions out loud in your own words from memory.',
      'Review: Re-scan the section to verify accuracy.'
    ],
    whyItWorks: 'Turns passive reading into an active search for answers.',
    expectedBenefit: 'Doubles reading comprehension and retention.',
    commonMistakes: ['Skipping the Question and Recite steps.'],
    example: 'Use SQ3R to read Chapter 5 on Operating System Deadlocks.',
    activities: {
      min5: 'Survey & Question: Skim chapter headings and write 3 key questions.',
      min15: 'Single SQ3R Pass: Complete Survey, Question, Read, Recite for 1 section.',
      min30: 'Full SQ3R Chapter Module: Process an entire textbook section.'
    }
  },
  {
    id: 'teach-back',
    name: 'Teach-Back Method',
    tagline: 'Explaining a topic out loud to a peer or AI mentor twin',
    category: 'Deep Understanding',
    difficulty: 'Moderate',
    recommendedDuration: '20–30 mins',
    description: 'The Teach-Back Method involves presenting a topic out loud to a peer or AI mentor twin as if delivering a short tutorial, answering follow-up questions to verify fluency.',
    bestUsedWhen: [
      'Preparing for oral exams or technical interviews',
      'Verifying mastery after completing a major unit',
      'When studying in peer groups or with AI study twins'
    ],
    notIdealWhen: [
      'You are in a quiet library environment where speaking out loud is prohibited'
    ],
    steps: [
      'Prepare a 3-minute lesson outline on a topic.',
      'Explain the topic out loud to a peer or AI mentor without notes.',
      'Ask the listener to challenge you with edge-case questions.',
      'Note any point where your speech hesitated or sounded confusing.',
      'Refine those specific weak points in your notes.'
    ],
    whyItWorks: 'Speaking out loud activates verbal processing centers and instantly exposes hesitation.',
    expectedBenefit: 'Builds articulative confidence and interview fluency.',
    commonMistakes: ['Reading from notes while explaining.'],
    example: 'Teach your AI Learning Twin how Object-Oriented Inheritance works in Java.',
    activities: {
      min5: 'Elevator Pitch: Teach a concept in 90 seconds out loud.',
      min15: 'Interactive Teach-Back: Teach for 10 mins and answer 3 questions.',
      min30: 'Full Lecture Simulation: Deliver a 20-minute mini-lecture.'
    }
  },
  {
    id: 'exam-simulation',
    name: 'Exam Simulation',
    tagline: 'Full mock exam under strict timed, silent test conditions',
    category: 'Assessment & Practice',
    difficulty: 'Hard',
    recommendedDuration: '45–90 mins',
    description: 'Exam Simulation replicates full test-day environment including exact question counts, strict timers, zero notes, and silent conditions.',
    bestUsedWhen: [
      'Exam is tomorrow or in 1–2 days',
      'Need exam-focused preparation under true pressure',
      'Want to evaluate final readiness and pacing'
    ],
    notIdealWhen: [
      'Learning a new topic for the first time'
    ],
    steps: [
      'Obtain a previous year paper or full diagnostic mock test.',
      'Clear your desk completely of books, phones, and notes.',
      'Set an uninterrupted countdown timer.',
      'Complete the exam without stopping.',
      'Grade your paper and record missed questions for final review.'
    ],
    whyItWorks: 'Eliminates test anxiety by acclimatizing your brain to test-day conditions.',
    expectedBenefit: 'Ensures optimal test-day confidence and pacing.',
    commonMistakes: ['Giving yourself extra time after timer expires.'],
    example: 'Take a 45-minute timed mock test for Computer Networks.',
    activities: {
      min5: 'Mini Exam Blitz: Answer 5 hard exam questions in 5 minutes.',
      min15: '15-Min Timed Section: Complete 1 sectional test block.',
      min30: '30-Min Full Simulated Exam: Complete a timed unit mock exam.'
    }
  }
]
