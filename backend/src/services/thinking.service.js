import axios from 'axios'
import { thinkingRepository } from '../repositories/thinking.repository.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'
import { callGroqJson } from '../utils/groqClient.js'

const now = () => new Date()
const boundedLimit = (value, fallback, maximum) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.min(maximum, Math.max(1, parsed)) : fallback
}
const GEOAPIFY_PLACES_URL = process.env.GEOAPIFY_PLACES_URL || 'https://api.geoapify.com/v2/places'
const NEARBY_RADIUS_METERS = Number(process.env.THINKING_LAB_NEARBY_RADIUS_METERS) || 10000

const sourceCatalog = {
  telanganaEnergy: {
    name: 'Telangana renewable energy public information',
    sourceUrl: 'https://tsredco.telangana.gov.in/',
    sourceType: 'official',
    reliability: 'high',
  },
  skillIndia: {
    name: 'Skill India Digital',
    sourceUrl: 'https://www.skillindiadigital.gov.in/',
    sourceType: 'official',
    reliability: 'high',
  },
  isro: {
    name: 'Indian Space Research Organisation',
    sourceUrl: 'https://www.isro.gov.in/',
    sourceType: 'official',
    reliability: 'high',
  },
  osm: {
    name: 'OpenStreetMap community map data',
    sourceUrl: 'https://www.openstreetmap.org/',
    sourceType: 'open-data',
    reliability: 'medium',
  },
}

const placeTypeLabels = {
  school: 'education',
  college: 'college',
  university: 'university',
  library: 'library',
  hospital: 'healthcare',
  research: 'research',
  government: 'government',
  skill_center: 'skill center',
  industry: 'industrial',
  museum: 'culture & museum',
  park: 'nature & park',
  natural: 'nature',
  place: 'nearby place',
}

const placeFallbacks = {
  school: {
    description: 'A school is a place where students build basic knowledge, habits, and confidence.',
    whyItMatters: 'Schools show how education shapes the future of a local community.',
    thinkingQuestion: 'What is one problem students near you could study and solve together?',
  },
  college: {
    description: 'A college can connect classroom learning with practical skills, projects, and career pathways.',
    whyItMatters: 'It may help students discover higher education options close to home.',
    thinkingQuestion: 'What local problem could college students solve using science or technology?',
  },
  university: {
    description: 'A university brings together advanced learning, research, and professional courses.',
    whyItMatters: 'Universities can create opportunities in science, careers, innovation, and public service.',
    thinkingQuestion: 'Which subject would you research if you wanted to improve life in your area?',
  },
  library: {
    description: 'A library gives people access to books, newspapers, digital resources, and quiet study space.',
    whyItMatters: 'It can help students verify facts and learn beyond textbooks.',
    thinkingQuestion: 'How would you use a library to check whether a local claim is true?',
  },
  hospital: {
    description: 'A hospital is a key public service where health workers solve urgent human problems.',
    whyItMatters: 'Health connects biology, technology, transport, planning, and community awareness.',
    thinkingQuestion: 'What could students do to help people understand one important health habit?',
  },
  research: {
    description: 'A research center studies problems carefully and tests possible solutions.',
    whyItMatters: 'Research turns curiosity into evidence that can improve real life.',
    thinkingQuestion: 'What local question would be worth researching with data?',
  },
  government: {
    description: 'A government office helps provide public services, records, schemes, and local administration.',
    whyItMatters: 'Understanding public offices helps students know how communities make decisions.',
    thinkingQuestion: 'Which public service near you could be made easier for people to use?',
  },
  skill_center: {
    description: 'A skill center helps people practice job-ready abilities like technology, trades, and entrepreneurship.',
    whyItMatters: 'Skills can help young people create opportunities without leaving their region immediately.',
    thinkingQuestion: 'Which skill would help students in your area earn, build, or solve something useful?',
  },
  industry: {
    description: 'An industry or industrial area shows how raw materials, machines, workers, and markets connect.',
    whyItMatters: 'It can reveal nearby jobs, supply chains, safety questions, and entrepreneurship ideas.',
    thinkingQuestion: 'What product or service could be improved by understanding this local industry?',
  },
  museum: {
    description: 'A museum preserves objects, stories, science, art, or history so people can learn from them.',
    whyItMatters: 'Museums help students connect identity, culture, evidence, and curiosity.',
    thinkingQuestion: 'What local story or discovery should be preserved for future students?',
  },
  park: {
    description: 'A park is a public space for nature, exercise, observation, and community life.',
    whyItMatters: 'Parks connect environment, health, city planning, and shared responsibility.',
    thinkingQuestion: 'How could students make a public place cleaner, safer, or more useful?',
  },
  natural: {
    description: 'A natural place can reveal how water, soil, plants, animals, and people affect each other.',
    whyItMatters: 'Local nature helps students understand climate, resources, and environmental care.',
    thinkingQuestion: 'What change in this natural place would you observe and measure over one month?',
  },
  place: {
    description: 'A local place that offers real-world context for learning and community problem-solving.',
    whyItMatters: 'Observing everyday places helps build social awareness and analytical thinking.',
    thinkingQuestion: 'How does this place impact the daily life and needs of people in your area?',
  },
}

const indiaThinkingChallenges = [
  {
    id: 'india-water-scarcity',
    issue: 'Water scarcity',
    region: 'Marathwada, Maharashtra',
    title: 'When the village well runs low',
    scenario: 'A village faces water shortages every summer. Some families want deeper borewells, while others worry that groundwater will fall even faster.',
    question: 'If you were part of a student team asked to help, what practical plan would you suggest and why?',
    skills: ['critical thinking', 'problem solving', 'decision making'],
  },
  {
    id: 'india-farmer-challenges',
    issue: 'Farmer challenges',
    region: 'Vidarbha, Maharashtra',
    title: 'A farmer has a crop but no fair price',
    scenario: 'Small farmers grow cotton, but market prices change suddenly. Transport costs are high, and farmers do not always know where to sell.',
    question: 'What solution could help farmers make better selling decisions or reduce risk? Explain how it would work.',
    skills: ['reasoning', 'empathy', 'problem solving'],
  },
  {
    id: 'india-rural-education',
    issue: 'Rural education',
    region: 'Bastar, Chhattisgarh',
    title: 'A school has teachers but few learning resources',
    scenario: 'Students attend school regularly, but the library is small, science materials are limited, and many children are first-generation learners.',
    question: 'If you had to improve learning without a large budget, what would you do first and why?',
    skills: ['creativity', 'social awareness', 'decision making'],
  },
  {
    id: 'india-waste-management',
    issue: 'Waste management',
    region: 'Kochi, Kerala',
    title: 'A market street fills with mixed waste',
    scenario: 'A busy market produces food waste, plastic, and packaging every day. Shopkeepers blame the municipality, and the municipality blames poor sorting.',
    question: 'How would you design a simple waste-management system that people would actually follow?',
    skills: ['systems thinking', 'creativity', 'problem solving'],
  },
  {
    id: 'india-public-transport',
    issue: 'Traffic and public transport',
    region: 'Bengaluru, Karnataka',
    title: 'Students lose hours in traffic',
    scenario: 'Many students travel long distances to coaching centers. Buses are crowded, roads are congested, and private transport increases pollution.',
    question: 'What transport or scheduling solution would reduce stress for students while being realistic for the city?',
    skills: ['critical thinking', 'decision making', 'empathy'],
  },
  {
    id: 'india-digital-divide',
    issue: 'Digital divide',
    region: 'Araria, Bihar',
    title: 'Online learning does not reach everyone',
    scenario: 'Some students have smartphones and fast internet, but many share one phone with family members or have weak connectivity.',
    question: 'How would you improve learning access for these students without assuming every child has internet all day?',
    skills: ['empathy', 'creativity', 'social awareness'],
  },
  {
    id: 'india-skill-gap',
    issue: 'Unemployment and skill gap',
    region: 'Kanpur, Uttar Pradesh',
    title: 'Young people want jobs but lack job-ready skills',
    scenario: 'Many young people finish school but are unsure how to find work. Local businesses need basic digital, repair, sales, and communication skills.',
    question: 'What local skill-building program would you create, and how would you know if it is working?',
    skills: ['problem solving', 'decision making', 'reasoning'],
  },
  {
    id: 'india-pollution',
    issue: 'Environmental pollution',
    region: 'Yamuna river belt, Delhi',
    title: 'A river is part of daily life but heavily polluted',
    scenario: 'People depend on a nearby river, but sewage, plastic, and industrial waste have made the water unsafe in many areas.',
    question: 'What actions should students, residents, businesses, and government each take? Which step should happen first?',
    skills: ['social awareness', 'critical thinking', 'problem solving'],
  },
]

const seededKnowledge = [
  {
    title: 'Solar irrigation can reduce electricity pressure on small farms',
    summary: 'Solar-powered pumps use sunlight to move water for farming, which can help when grid electricity is unreliable.',
    whatIsHappening: 'More farms are exploring solar pumps and careful water scheduling to make irrigation less dependent on power cuts.',
    whyCare: 'It connects science, electricity, agriculture, and family income in farming regions.',
    category: 'near_me',
    awarenessLevel: 'near_me',
    location: { state: 'Telangana', district: 'Wanaparthy', displayName: 'Wanaparthy district' },
    difficulty: 'beginner',
    explanations: {
      beginner: 'Solar panels convert sunlight into electricity. A pump can use that electricity to move water.',
      intermediate: 'Solar irrigation combines photovoltaic panels, a controller, and a pump so farmers can irrigate during sunny hours.',
      advanced: 'Photovoltaic cells generate current when photons transfer energy to semiconductor electrons, powering pump motors through control electronics.',
    },
    source: sourceCatalog.telanganaEnergy,
    publishedAt: now(),
    tags: ['science', 'agriculture', 'energy', 'water'],
    verificationNotes: 'Use official renewable energy and agriculture sources before showing scheme details or subsidy claims.',
  },
  {
    title: 'Skill centers can turn local problems into career practice',
    summary: 'Training centers help students learn practical skills like computer basics, repair work, coding, and entrepreneurship.',
    whatIsHappening: 'India is expanding digital and skill-based learning pathways so students can prepare for jobs close to home and beyond.',
    whyCare: 'A student can connect school subjects with employable skills and local needs.',
    category: 'careers',
    awarenessLevel: 'india',
    location: { state: 'India', district: '', displayName: 'India' },
    difficulty: 'beginner',
    explanations: {
      beginner: 'A skill center is a place where people practice job-ready skills.',
      intermediate: 'Skill programs focus on practical abilities, certificates, and projects that match workplace needs.',
      advanced: 'Skill ecosystems connect competency standards, local labor demand, digital credentials, and apprenticeships.',
    },
    source: sourceCatalog.skillIndia,
    publishedAt: now(),
    tags: ['careers', 'skills', 'education', 'entrepreneurship'],
    verificationNotes: 'Official portals should be checked for current course availability and eligibility.',
  },
  {
    title: 'AI tools are changing how software is built',
    summary: 'Programmers increasingly use AI assistants to explain code, find bugs, and draft first versions of software.',
    whatIsHappening: 'AI is becoming part of software engineering workflows, but humans still decide goals, quality, privacy, and safety.',
    whyCare: 'Students who learn programming and careful reasoning can use AI as a tool instead of being replaced by it.',
    category: 'science_technology',
    awarenessLevel: 'world',
    location: { state: 'Global', district: '', displayName: 'Worldwide' },
    difficulty: 'intermediate',
    explanations: {
      beginner: 'AI can help write and explain computer code, but a person must check whether the answer is useful.',
      intermediate: 'AI coding tools predict and transform code from instructions, while developers review logic, tests, and security.',
      advanced: 'Modern coding assistants use large models trained on code and text, making verification, context quality, and evaluation essential.',
    },
    source: {
      name: 'Open technology reporting and education sources',
      sourceUrl: 'https://www.nist.gov/artificial-intelligence',
      sourceType: 'open-data',
      reliability: 'medium',
    },
    publishedAt: now(),
    tags: ['technology', 'ai', 'programming', 'careers'],
    verificationNotes: 'Avoid presenting claims about specific AI products without current source verification.',
  },
  {
    title: 'Space missions create new learning and career pathways',
    summary: 'Space science combines physics, mathematics, engineering, computing, design, and teamwork.',
    whatIsHappening: 'India and other countries continue investing in satellites, space exploration, and Earth observation.',
    whyCare: 'Space technology affects weather forecasts, communication, disaster response, maps, and scientific discovery.',
    category: 'science_technology',
    awarenessLevel: 'india',
    location: { state: 'India', district: '', displayName: 'India' },
    difficulty: 'beginner',
    explanations: {
      beginner: 'Satellites are machines sent into space to collect information or help communication.',
      intermediate: 'Space missions use sensors, rockets, software, and orbital mechanics to solve Earth and exploration problems.',
      advanced: 'Mission design balances payload goals, propulsion limits, telemetry, orbital dynamics, risk, and cost.',
    },
    source: sourceCatalog.isro,
    publishedAt: now(),
    tags: ['science', 'space', 'technology', 'careers'],
    verificationNotes: 'Mission dates and achievements must be verified against official ISRO releases.',
  },
]

const seededLocations = [
  {
    name: 'Government Polytechnic',
    type: 'college',
    distanceKm: 18,
    district: 'Wanaparthy',
    state: 'Telangana',
    learningOpportunity: 'Explore diploma paths in engineering, electronics, and practical technology.',
    challengePrompt: 'What local problem could a polytechnic student solve with a simple engineering project?',
    source: sourceCatalog.osm,
  },
  {
    name: 'District Library',
    type: 'library',
    distanceKm: 6,
    district: 'Wanaparthy',
    state: 'Telangana',
    learningOpportunity: 'Use newspapers, books, and digital resources to compare facts from different sources.',
    challengePrompt: 'How would you verify whether a local claim is true using library resources?',
    source: sourceCatalog.osm,
  },
  {
    name: 'Skill Development Center',
    type: 'skill_center',
    distanceKm: 22,
    district: 'Wanaparthy',
    state: 'Telangana',
    learningOpportunity: 'Connect school learning with job-ready skills and small business ideas.',
    challengePrompt: 'Which one skill could help young people create more local opportunities?',
    source: sourceCatalog.skillIndia,
  },
  {
    name: 'Agricultural Extension Office',
    type: 'agriculture',
    distanceKm: 12,
    district: 'Wanaparthy',
    state: 'Telangana',
    learningOpportunity: 'Learn how soil, water, seeds, weather, and markets affect farmers.',
    challengePrompt: 'How could students help farmers test a water-saving method safely?',
    source: sourceCatalog.osm,
  },
]

const challengeTemplates = {
  why: 'Why does this matter for students or families in your area?',
  what_if: 'What if this problem became more serious next year? What would change first?',
  decision_making: 'If you had limited money and time, what option would you choose and why?',
  problem_solving: 'Suggest two practical solutions. Which one would you test first?',
  comparison: 'Compare two possible choices. Which is better for this situation and why?',
  cause_effect: 'What could happen if people ignore this issue for a long time?',
  prediction: 'What might change in the next five years if this idea spreads?',
  creative: 'Design a simple tool, service, or student project that could help.',
}

const difficultyRank = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
}

const normalizeProfile = (user = {}, profile = {}) => {
  const interests = Array.isArray(profile.interests)
    ? profile.interests
    : typeof profile.interests === 'string'
      ? profile.interests.split(',').map((interest) => interest.trim()).filter(Boolean)
      : ['Science', 'Technology', 'Careers']

  return {
    studentId: user.id,
    name: user.name || 'Student',
    district: profile.district || profile.location?.district || 'Wanaparthy',
    state: profile.state || profile.location?.state || 'Telangana',
    educationLevel: profile.educationLevel || profile.classLevel || 'Class 10',
    interests: interests.length ? interests : ['Science', 'Technology', 'Careers'],
    learningLevel: profile.learningLevel || user.level || 'beginner',
    weakReasoningAreas: profile.weakReasoningAreas || [],
  }
}

const asPlainItem = (item) => ({
  id: String(item._id || item.id || item.title),
  title: item.title,
  summary: item.summary,
  whatIsHappening: item.whatIsHappening,
  whyCare: item.whyCare,
  category: item.category,
  awarenessLevel: item.awarenessLevel,
  location: item.location,
  difficulty: item.difficulty,
  explanations: item.explanations,
  source: item.source,
  publishedAt: item.publishedAt,
  relevanceScore: Math.round(item.relevanceScore || 0),
  tags: item.tags || [],
  verificationNotes: item.verificationNotes,
})

const asPlainChallenge = (challenge) => ({
  id: String(challenge._id || challenge.id || challenge.question),
  knowledgeItemId: challenge.knowledgeItemId ? String(challenge.knowledgeItemId) : undefined,
  challengeType: challenge.challengeType,
  question: challenge.question,
  difficulty: challenge.difficulty,
  expectedSkills: challenge.expectedSkills || [],
  hints: challenge.hints || [],
})

const calculateRelevance = (item, profile) => {
  const districtMatch = item.location?.district && item.location.district === profile.district
  const stateMatch = item.location?.state && item.location.state === profile.state
  const locationRelevance = districtMatch ? 35 : stateMatch ? 24 : item.awarenessLevel === 'india' ? 14 : 8
  const lowerInterests = profile.interests.map((interest) => interest.toLowerCase())
  const studentInterest = item.tags?.some((tag) => lowerInterests.some((interest) => tag.toLowerCase().includes(interest.toLowerCase()) || interest.includes(tag.toLowerCase()))) ? 24 : 12
  const educationLevel = item.difficulty === profile.learningLevel ? 14 : 10
  const learningNeed = profile.weakReasoningAreas?.length ? 8 : 6
  const freshness = 10
  const sourceReliability = item.source?.reliability === 'high' ? 12 : 7

  return locationRelevance + studentInterest + educationLevel + learningNeed + freshness + sourceReliability
}

const selectChallengeType = (profile) => {
  const weak = profile.weakReasoningAreas?.[0]?.toLowerCase() || ''
  if (weak.includes('evidence')) return 'comparison'
  if (weak.includes('decision')) return 'decision_making'
  if (weak.includes('creativity')) return 'creative'
  if (weak.includes('cause')) return 'cause_effect'
  return 'problem_solving'
}

const buildChallenge = (knowledgeItem, profile, preferredType) => {
  const challengeType = preferredType || selectChallengeType(profile)
  return {
    id: `seed-${knowledgeItem.id || knowledgeItem.title}-${challengeType}`,
    knowledgeItemId: knowledgeItem.id,
    challengeType,
    question: `${challengeTemplates[challengeType]} Use "${knowledgeItem.title}" as your example.`,
    difficulty: profile.learningLevel,
    expectedSkills: ['understanding', 'reasoning', 'evidence', 'clarity'],
    hints: [
      'Start with the real problem.',
      'Explain who is affected.',
      'Give one reason or example.',
    ],
  }
}

const evaluateLocally = (answer, challengeType) => {
  const words = answer.trim().split(/\s+/).filter(Boolean)
  const hasBecause = /\b(because|so|therefore|if|then|reason|impact)\b/i.test(answer)
  const hasEvidence = /\b(example|data|source|cost|water|electricity|students|farmers|jobs|weather)\b/i.test(answer)
  const hasAlternative = /\b(or|another|instead|option|compare|but|however)\b/i.test(answer)
  const lengthScore = Math.min(35, words.length * 1.4)

  const understanding = Math.round(Math.min(95, 35 + lengthScore + (hasBecause ? 12 : 0)))
  const reasoning = Math.round(Math.min(95, 30 + lengthScore + (hasBecause ? 18 : 0) + (hasAlternative ? 8 : 0)))
  const evidence = Math.round(Math.min(90, 22 + lengthScore + (hasEvidence ? 22 : 0)))
  const creativity = Math.round(Math.min(92, 34 + lengthScore + (challengeType === 'creative' ? 10 : 0) + (hasAlternative ? 8 : 0)))
  const problemSolving = Math.round(Math.min(94, 32 + lengthScore + (hasBecause ? 10 : 0) + (hasAlternative ? 10 : 0)))
  const clarity = Math.round(Math.min(94, 40 + lengthScore + (words.length > 18 ? 10 : 0)))
  const overall = Math.round((understanding + reasoning + evidence + creativity + problemSolving + clarity) / 6)

  const feedback = overall >= 75
    ? 'Strong thinking. You explained the situation, gave reasons, and started connecting your idea to real people. To improve further, add one source, number, or local example.'
    : overall >= 55
      ? 'Good starting point. You identified an important idea. Now think deeper: who is affected, what evidence supports your choice, and what trade-off should be considered?'
      : 'You have the beginning of an answer. Try adding why it matters, one real example, and one possible risk or alternative.'

  return {
    understanding,
    reasoning,
    evidence,
    creativity,
    problemSolving,
    clarity,
    overall,
    feedback,
    nextChallengeType: evidence < 55 ? 'comparison' : reasoning < 60 ? 'cause_effect' : 'creative',
  }
}

const evaluateIndiaAnswerLocally = (answer) => {
  const words = answer.trim().split(/\s+/).filter(Boolean)
  const hasReasoning = /\b(because|so|therefore|if|then|reason|impact|trade.?off)\b/i.test(answer)
  const hasPeople = /\b(student|farmer|family|women|children|community|worker|resident|government|business)\b/i.test(answer)
  const hasAction = /\b(plan|step|build|start|create|organize|teach|collect|measure|test|train|reduce|improve)\b/i.test(answer)
  const hasConstraint = /\b(cost|budget|limited|internet|time|water|funding|transport|maintenance|local)\b/i.test(answer)
  const lengthScore = Math.min(30, words.length * 1.2)

  const criticalThinking = Math.round(Math.min(92, 35 + lengthScore + (hasConstraint ? 14 : 0)))
  const reasoning = Math.round(Math.min(92, 34 + lengthScore + (hasReasoning ? 16 : 0)))
  const creativity = Math.round(Math.min(90, 36 + lengthScore + (hasAction ? 12 : 0)))
  const socialAwareness = Math.round(Math.min(92, 34 + lengthScore + (hasPeople ? 18 : 0)))
  const problemSolving = Math.round(Math.min(92, 34 + lengthScore + (hasAction ? 16 : 0) + (hasConstraint ? 8 : 0)))
  const score = Math.round((criticalThinking + reasoning + creativity + socialAwareness + problemSolving) / 5)

  return {
    score,
    criticalThinking,
    reasoning,
    creativity,
    socialAwareness,
    problemSolving,
    feedback: score >= 75
      ? 'Strong response. You considered people, practical steps, and real-world limits. To improve further, add how you would measure success.'
      : score >= 55
        ? 'Good idea. Consider the people affected, the resources available, and one practical first step that could be tested.'
        : 'You have a starting point. Try explaining why your solution matters, who it helps, and how it could work with limited resources.',
  }
}

const clampScore = (value, fallback) => Math.max(0, Math.min(100, Math.round(Number(value) || fallback)))

const normalizeIndiaEvaluation = (evaluation, fallback) => {
  const normalized = {
    score: clampScore(evaluation?.score, fallback.score),
    criticalThinking: clampScore(evaluation?.criticalThinking, fallback.criticalThinking),
    reasoning: clampScore(evaluation?.reasoning, fallback.reasoning),
    creativity: clampScore(evaluation?.creativity, fallback.creativity),
    socialAwareness: clampScore(evaluation?.socialAwareness, fallback.socialAwareness),
    problemSolving: clampScore(evaluation?.problemSolving, fallback.problemSolving),
    feedback: typeof evaluation?.feedback === 'string' && evaluation.feedback.trim()
      ? evaluation.feedback.trim()
      : fallback.feedback,
  }

  normalized.score = Math.round(
    (normalized.criticalThinking
      + normalized.reasoning
      + normalized.creativity
      + normalized.socialAwareness
      + normalized.problemSolving) / 5
  )

  return normalized
}

const evaluateWithAIProvider = async ({ challenge, answer }) => {
  return callGroqJson({
    systemPrompt: [
      'You evaluate student thinking for open-ended social problem scenarios.',
      'Do not mark answers simply correct or wrong.',
      'Return only valid JSON with keys: score, criticalThinking, reasoning, creativity, socialAwareness, problemSolving, feedback.',
      'All scores must be integers from 0 to 100. Feedback must be short, constructive, and student-friendly.',
    ].join(' '),
    userPayload: {
      scenario: challenge.scenario,
      question: challenge.question,
      studentAnswer: answer,
      rubric: ['critical thinking', 'reasoning', 'creativity', 'social awareness', 'problem solving'],
    },
    maxTokens: 450,
    temperature: 0.2,
  })
}

const tryAi = async (path, payload) => {
  try {
    const response = await aiServiceClient.post(path, payload)
    return response.data
  } catch (error) {
    return null
  }
}

const isValidLatitude = (value) => Number.isFinite(value) && value >= -90 && value <= 90
const isValidLongitude = (value) => Number.isFinite(value) && value >= -180 && value <= 180

const validateCoordinates = ({ latitude, longitude }) => {
  const lat = Number(latitude)
  const lon = Number(longitude)

  if (!isValidLatitude(lat) || !isValidLongitude(lon)) {
    const error = new Error('Valid latitude and longitude are required')
    error.statusCode = 400
    throw error
  }

  return { latitude: lat, longitude: lon }
}

const toRadians = (degrees) => degrees * (Math.PI / 180)

const distanceInKm = (origin, point) => {
  const earthRadiusKm = 6371
  const dLat = toRadians(point.latitude - origin.latitude)
  const dLon = toRadians(point.longitude - origin.longitude)
  const lat1 = toRadians(origin.latitude)
  const lat2 = toRadians(point.latitude)

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const geoapifyCategories = [
  'education',
  'education.school',
  'education.college',
  'education.university',
  'education.library',
  'healthcare',
  'healthcare.hospital',
  'healthcare.clinic',
  'office.government',
  'building.government',
  'service.government',
  'office.research',
  'building.research',
  'service.research',
  'industrial',
  'building.industrial',
  'natural',
  'leisure.park',
  'national_park',
  'tourism.sights',
  'entertainment.museum',
  'entertainment.culture',
  'heritage',
].join(',')

const classifyGeoapifyPlace = (categories = [], name = '') => {
  const joined = categories.join(' ')
  const lowerName = (name || '').toLowerCase()

  if (/university/i.test(joined) || /university/i.test(lowerName)) return 'university'
  if (/college/i.test(joined) || /college|polytechnic|institute/i.test(lowerName)) return 'college'
  if (/library/i.test(joined) || /library/i.test(lowerName)) return 'library'
  if (/school|education/i.test(joined) || /school|academy|vidyalaya/i.test(lowerName)) return 'school'
  if (/hospital|healthcare|clinic/i.test(joined) || /hospital|clinic|dispensary/i.test(lowerName)) return 'hospital'
  if (/research/i.test(joined) || /research|laborator|science|isro|drdo/i.test(lowerName)) return 'research'
  if (/government/i.test(joined) || /government|collectorate|panchayat|municipal|office/i.test(lowerName)) return 'government'
  if (/industrial|factory|production/i.test(joined) || /industrial|factory|works|plant/i.test(lowerName)) return 'industry'
  if (/museum|culture|heritage|tourism/i.test(joined) || /museum|gallery|heritage|fort|palace/i.test(lowerName)) return 'museum'
  if (/natural|park|forest|water|river|lake|national_park/i.test(joined) || /park|garden|lake|river|forest/i.test(lowerName)) return 'natural'

  return 'place'
}

const normalizeGeoapifyPlace = (feature, origin) => {
  const properties = feature.properties || {}
  const coordinates = feature.geometry?.coordinates || []
  const longitude = Number(properties.lon ?? coordinates[0])
  const latitude = Number(properties.lat ?? coordinates[1])
  const name = properties.name || properties.address_line1 || properties.street || 'Nearby Place'
  const categories = Array.isArray(properties.categories) ? properties.categories : []

  if (!name || !isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null
  }

  const type = classifyGeoapifyPlace(categories, name)

  const distance = Number.isFinite(Number(properties.distance))
    ? Number((Number(properties.distance) / 1000).toFixed(1))
    : Number(distanceInKm(origin, { latitude, longitude }).toFixed(1))

  return {
    id: properties.place_id || `${latitude}-${longitude}-${name}`,
    name,
    type,
    category: placeTypeLabels[type] || type,
    address: properties.formatted || properties.address_line2 || '',
    latitude,
    longitude,
    distance,
    sourceUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
  }
}

const dedupePlaces = (places) => {
  const seen = new Set()
  return places.filter((place) => {
    const key = `${place.name.toLowerCase()}-${place.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const fetchNearbyPlacesFromGeoapify = async (coordinates) => {
  const apiKey = process.env.GEOAPIFY_API_KEY
  if (!apiKey) {
    return []
  }

  const response = await axios.get(GEOAPIFY_PLACES_URL, {
    params: {
      categories: geoapifyCategories,
      filter: `circle:${coordinates.longitude},${coordinates.latitude},${NEARBY_RADIUS_METERS}`,
      bias: `proximity:${coordinates.longitude},${coordinates.latitude}`,
      limit: 20,
      apiKey,
    },
    timeout: 30000,
  })

  const features = Array.isArray(response.data?.features) ? response.data.features : []
  return dedupePlaces(
    features
      .map((feature) => normalizeGeoapifyPlace(feature, coordinates))
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
  ).slice(0, 10)
}

const fallbackKnowledgeCard = (place) => {
  const fallback = placeFallbacks[place.type] || placeFallbacks.place || {
    description: 'This nearby place can help you observe how people, systems, and real-world problems connect.',
    whyItMatters: 'Your surroundings can become a living classroom when you ask good questions.',
    thinkingQuestion: 'What can this place teach students about solving real problems?',
  }

  return {
    id: place.id,
    place,
    name: place.name,
    title: place.name,
    category: placeTypeLabels[place.type] || place.category || 'nearby place',
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    description: fallback.description,
    whyItMatters: fallback.whyItMatters,
    thinkingQuestion: fallback.thinkingQuestion,
    distance: place.distance,
    sourceUrl: place.sourceUrl,
  }
}

const generateKnowledgeCard = async (place, studentProfile = {}) => {
  const aiCard = await tryAi('/thinking-lab/location-card/generate', {
    place: {
      name: place.name,
      type: place.type,
      distance: place.distance,
    },
    studentProfile,
  })

  if (aiCard?.title && aiCard?.description && aiCard?.whyItMatters && aiCard?.thinkingQuestion) {
    return {
      id: place.id,
      place,
      name: place.name,
      title: aiCard.title || place.name,
      category: aiCard.category || placeTypeLabels[place.type] || place.category || place.type,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      description: aiCard.description,
      whyItMatters: aiCard.whyItMatters,
      thinkingQuestion: aiCard.thinkingQuestion,
      distance: place.distance,
      sourceUrl: place.sourceUrl,
    }
  }

  return fallbackKnowledgeCard(place)
}

const indiaChallengeToCard = (challenge) => ({
  id: challenge.id,
  place: { type: 'government' },
  name: challenge.title,
  title: challenge.title,
  category: challenge.issue,
  address: challenge.region,
  latitude: null,
  longitude: null,
  description: challenge.scenario,
  whyItMatters: `${challenge.region} - builds ${challenge.skills.join(', ')}.`,
  thinkingQuestion: challenge.question,
  distance: null,
  sourceUrl: null,
  fallback: true,
  indiaChallenge: challenge,
})

const buildIndiaFallbackCards = () => indiaThinkingChallenges.map(indiaChallengeToCard)

const persistSeedData = async (profile) => {
  try {
    const ranked = seededKnowledge.map((item) => ({
      ...item,
      relevanceScore: calculateRelevance(item, profile),
    }))

    const existing = await thinkingRepository.findKnowledgeItems({ limit: 1 })
    if (!existing.length) {
      for (const item of ranked) {
        await thinkingRepository.createKnowledgeItem(item)
      }
    }

    await thinkingRepository.upsertLocationItems(seededLocations)
  } catch (error) {
    // Local fallbacks keep the product usable when MongoDB is unavailable.
  }
}

export const thinkingService = {
  getIndiaThinkingChallenges() {
    return indiaThinkingChallenges
  },

  async evaluateIndiaThinkingAnswer(user, challengeId, payload = {}) {
    const answer = payload.answer || ''
    if (!answer.trim()) {
      const error = new Error('Answer is required')
      error.statusCode = 400
      throw error
    }

    const challenge = indiaThinkingChallenges.find((item) => item.id === challengeId)
    if (!challenge) {
      const error = new Error('India thinking challenge not found')
      error.statusCode = 404
      throw error
    }

    const fallback = evaluateIndiaAnswerLocally(answer)
    const aiEvaluation = await evaluateWithAIProvider({ challenge, answer })
    const evaluation = normalizeIndiaEvaluation(aiEvaluation, fallback)

    try {
      await this.updateThinkingProfile(user.id, {
        answer,
        challengeType: 'problem_solving',
        evaluation: {
          reasoning: evaluation.reasoning,
          problemSolving: evaluation.problemSolving,
          creativity: evaluation.creativity,
          evidence: evaluation.socialAwareness,
          overall: evaluation.score,
        },
        topic: challenge.issue,
      })
    } catch (error) {
      // Evaluation should still be returned if profile persistence is unavailable.
    }

    return evaluation
  },

  async getNearbyKnowledgeCards(user, payload = {}) {
    const coordinates = validateCoordinates(payload)
    const studentProfile = normalizeProfile(user, payload.studentProfile || {})

    let places = []
    let fetchError = null
    try {
      places = await fetchNearbyPlacesFromGeoapify(coordinates)
    } catch (error) {
      fetchError = error
    }

    if (!places.length) {
      const fallbackCards = buildIndiaFallbackCards()
      return {
        cards: fallbackCards,
        places: [],
        count: fallbackCards.length,
        radiusKm: Math.round(NEARBY_RADIUS_METERS / 1000),
        fallback: true,
        message: fetchError
          ? 'Nearby discovery is unavailable, so India-wide thinking challenges are ready.'
          : 'No useful nearby places were found in this area yet, so India-wide thinking challenges are ready.',
      }
    }

    const cards = await Promise.all(
      places.map((place) => generateKnowledgeCard(place, studentProfile))
    )

    return {
      cards,
      places,
      count: cards.length,
      radiusKm: Math.round(NEARBY_RADIUS_METERS / 1000),
      fallback: false,
      message: 'Nearby learning places found.',
    }
  },

  async getFeed(user, filters = {}) {
    const profile = normalizeProfile(user, filters.profile || filters)
    await persistSeedData(profile)

    try {
      const dbItems = await thinkingRepository.findKnowledgeItems({
        category: filters.category,
        awarenessLevel: filters.awarenessLevel,
        limit: boundedLimit(filters.limit, 12, 50),
      })

      if (dbItems.length) {
        return dbItems
          .map((item) => {
            const plain = asPlainItem(item)
            return { ...plain, relevanceScore: calculateRelevance(plain, profile) }
          })
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
      }
    } catch (error) {
      // Fall through to seeded content.
    }

    return seededKnowledge
      .filter((item) => !filters.category || filters.category === 'all' || item.category === filters.category)
      .filter((item) => !filters.awarenessLevel || filters.awarenessLevel === 'all' || item.awarenessLevel === filters.awarenessLevel)
      .map((item, index) => asPlainItem({ ...item, id: `seed-${index}`, relevanceScore: calculateRelevance(item, profile) }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  },

  async getNearby(user, filters = {}) {
    const profile = normalizeProfile(user, filters)
    await persistSeedData(profile)

    try {
      const nearby = await thinkingRepository.findLocationItems({
        district: profile.district,
        state: profile.state,
        limit: boundedLimit(filters.limit, 8, 30),
      })

      if (nearby.length) {
        return nearby.map((item) => ({
          id: String(item._id),
          name: item.name,
          type: item.type,
          distanceKm: item.distanceKm,
          district: item.district,
          state: item.state,
          learningOpportunity: item.learningOpportunity,
          challengePrompt: item.challengePrompt,
          source: item.source,
        }))
      }
    } catch (error) {
      // Fall through to seeded locations.
    }

    return seededLocations
  },

  async getKnowledge(user, knowledgeId, filters = {}) {
    const feed = await this.getFeed(user, filters)
    const found = feed.find((item) => item.id === knowledgeId)
    if (found) return found

    try {
      const dbItem = await thinkingRepository.findKnowledgeItemById(knowledgeId)
      if (dbItem) return asPlainItem(dbItem)
    } catch (error) {
      // Return a useful item below.
    }

    return feed[0]
  },

  async getChallenge(user, filters = {}) {
    const profile = normalizeProfile(user, filters.profile || filters)
    const feed = await this.getFeed(user, filters)
    const knowledgeItem = feed[0]
    const aiChallenge = await tryAi('/thinking-lab/challenge/generate', {
      studentProfile: profile,
      knowledgeItem,
    })

    const challenge = aiChallenge?.question
      ? {
          id: `seed-${knowledgeItem.id || knowledgeItem.title}-${aiChallenge.challengeType || 'problem_solving'}`,
          challengeType: aiChallenge.challengeType || selectChallengeType(profile),
          question: aiChallenge.question,
          difficulty: aiChallenge.difficulty || profile.learningLevel,
          expectedSkills: aiChallenge.expectedSkills || ['understanding', 'reasoning', 'evidence'],
          hints: aiChallenge.hints || [],
        }
      : buildChallenge(knowledgeItem, profile)

    try {
      const saved = await thinkingRepository.createThinkingChallenge({
        ...challenge,
        knowledgeItemId: /^[a-f\d]{24}$/i.test(knowledgeItem.id) ? knowledgeItem.id : undefined,
      })
      return {
        knowledgeItem,
        challenge: asPlainChallenge(saved),
      }
    } catch (error) {
      return {
        knowledgeItem,
        challenge,
      }
    }
  },

  async submitThinkingLabAnswer(user, challengeId, payload) {
    const answer = payload.answer || ''
    if (!answer.trim()) {
      const error = new Error('Answer is required')
      error.statusCode = 400
      throw error
    }

    let challenge = null
    try {
      challenge = await thinkingRepository.findThinkingChallengeById(challengeId)
    } catch (error) {
      // Seeded challenge ids are handled with local evaluation.
    }

    const aiEvaluation = await tryAi('/thinking-lab/answer/evaluate', {
      studentId: user.id,
      challengeId,
      answer,
      challengeType: challenge?.challengeType || payload.challengeType,
      question: challenge?.question || payload.question,
    })

    const localEvaluation = evaluateLocally(answer, challenge?.challengeType || payload.challengeType || 'problem_solving')
    const evaluation = {
      ...localEvaluation,
      ...aiEvaluation,
      problemSolving: aiEvaluation?.problem_solving ?? aiEvaluation?.problemSolving ?? localEvaluation.problemSolving,
      overall: aiEvaluation?.overall ?? localEvaluation.overall,
    }

    try {
      await thinkingRepository.createChallengeAttempt({
        studentId: user.id,
        challengeId: /^[a-f\d]{24}$/i.test(challengeId) ? challengeId : undefined,
        knowledgeItemId: challenge?.knowledgeItemId,
        answer,
        challengeType: challenge?.challengeType || payload.challengeType,
        difficulty: challenge?.difficulty || payload.difficulty || 'beginner',
        timeSpentSeconds: payload.timeSpentSeconds,
        hintUsage: payload.hintUsage || 0,
        scores: evaluation,
        feedback: evaluation.feedback,
        nextChallengeType: evaluation.nextChallengeType,
      })

      await this.updateThinkingProfile(user.id, {
        answer,
        challengeType: challenge?.challengeType || payload.challengeType || 'problem_solving',
        evaluation,
        topic: payload.topic,
      })
    } catch (error) {
      // Keep feedback available even if persistence is unavailable.
    }

    return {
      evaluation: {
        score: evaluation.overall ?? evaluation.score,
        criticalThinking: evaluation.understanding ?? evaluation.criticalThinking ?? 60,
        reasoning: evaluation.reasoning ?? 60,
        creativity: evaluation.creativity ?? 60,
        socialAwareness: evaluation.evidence ?? evaluation.socialAwareness ?? 60,
        problemSolving: evaluation.problemSolving ?? 60,
        understanding: evaluation.understanding ?? evaluation.criticalThinking ?? 60,
        evidence: evaluation.evidence ?? evaluation.socialAwareness ?? 60,
        overall: evaluation.overall ?? evaluation.score ?? 60,
        feedback: evaluation.feedback,
        nextChallengeType: evaluation.nextChallengeType,
      },
      learningTwinUpdated: true,
    }
  },

  async getProgress(user) {
    const profile = await thinkingRepository.findStudentThinkingProfile(user.id)
    const attempts = await thinkingRepository.findChallengeAttemptsByStudent(user.id, 10)

    return {
      skillAverages: profile?.skillAverages || {
        criticalThinking: 0,
        problemSolving: 0,
        creativity: 0,
        evidenceReasoning: 0,
        decisionMaking: 0,
        curiosity: 0,
      },
      weakReasoningAreas: profile?.weakReasoningAreas || [],
      topicsExplored: profile?.topicsExplored || [],
      questionsAttempted: profile?.questionsAttempted || 0,
      recentAttempts: attempts.map((attempt) => ({
        id: String(attempt._id),
        createdAt: attempt.createdAt,
        challengeType: attempt.challengeType,
        overall: attempt.scores?.overall || 0,
      })),
    }
  },

  async updateThinkingProfile(studentId, activity) {
    const existing = await thinkingRepository.findStudentThinkingProfile(studentId)
    const current = existing?.skillAverages || {}
    const attempted = existing?.questionsAttempted || 0
    const average = (oldValue = 45, newValue = 50) => Math.round(((oldValue * attempted) + newValue) / (attempted + 1))
    const challengeType = activity.challengeType || 'problem_solving'
    const topics = new Set([...(existing?.topicsExplored || [])])
    if (activity.topic) topics.add(activity.topic)

    const skillAverages = {
      criticalThinking: average(current.criticalThinking, activity.evaluation.reasoning),
      problemSolving: average(current.problemSolving, activity.evaluation.problemSolving),
      creativity: average(current.creativity, activity.evaluation.creativity),
      evidenceReasoning: average(current.evidenceReasoning, activity.evaluation.evidence),
      decisionMaking: average(current.decisionMaking, challengeType === 'decision_making' ? activity.evaluation.overall : current.decisionMaking || 44),
      curiosity: Math.min(100, average(current.curiosity, 62) + 1),
    }

    const weakReasoningAreas = Object.entries(skillAverages)
      .filter(([, value]) => value < 55)
      .map(([key]) => key)

    return thinkingRepository.updateStudentThinkingProfile(studentId, {
      $set: {
        skillAverages,
        weakReasoningAreas,
        topicsExplored: [...topics].slice(-30),
        preferredDifficulty: skillAverages.criticalThinking > 72 ? 'intermediate' : 'beginner',
        lastActivityAt: new Date(),
      },
      $inc: {
        questionsAttempted: 1,
        [`challengeTypeCounts.${challengeType}`]: 1,
      },
    })
  },

  async getDailyChallenge(userId) {
    const todayChallenge = await thinkingRepository.findTodayChallenge(userId)

    if (todayChallenge) {
      return {
        id: todayChallenge._id,
        type: todayChallenge.type,
        title: todayChallenge.title,
        description: todayChallenge.description,
        bloomLevel: todayChallenge.bloomLevel,
        timeLimit: todayChallenge.timeLimit,
        difficulty: todayChallenge.difficulty,
        points: todayChallenge.points,
        completed: todayChallenge.completed,
      }
    }

    const aiResponse = await tryAi('/thinking/challenge/generate', { userId })
    const challengeData = aiResponse || {
      type: 'scenario',
      title: 'The Solar Village Problem',
      description: 'A rural village needs sustainable energy. Design a solution with limited resources, maintenance challenges, and local conditions.',
      bloomLevel: 'create',
      timeLimit: '30 min',
      difficulty: 'medium',
      points: 100,
      expectedAnswer: 'A thoughtful answer should explain users, resources, costs, maintenance, risks, and testing.',
    }

    const challenge = await thinkingRepository.createChallenge({
      userId,
      ...challengeData,
    })

    return {
      id: challenge._id,
      type: challenge.type,
      title: challenge.title,
      description: challenge.description,
      bloomLevel: challenge.bloomLevel,
      timeLimit: challenge.timeLimit,
      difficulty: challenge.difficulty,
      points: challenge.points,
      completed: false,
    }
  },

  async submitAnswer(userId, challengeId, answer) {
    const challenge = await thinkingRepository.findChallengeById(challengeId, userId)
    if (!challenge) {
      throw new Error('Challenge not found')
    }

    const aiResponse = await tryAi('/thinking/answer/evaluate', {
      challengeId,
      answer,
      expectedAnswer: challenge.expectedAnswer,
    })
    const evaluation = aiResponse || evaluateLocally(answer, 'problem_solving')

    const submission = await thinkingRepository.createSubmission({
      userId,
      challengeId,
      challengeTitle: challenge.title,
      answer,
      score: evaluation.score || evaluation.overall,
      feedback: evaluation.feedback,
      reasoning: evaluation.reasoning,
    })

    await thinkingRepository.markChallengeCompleted(challengeId)
    await thinkingRepository.updateThinkingSkills(userId, evaluation.skills || {
      criticalThinking: 1,
      problemSolving: 1,
      creativity: 1,
      logicalReasoning: 1,
      overallScore: evaluation.overall,
    })

    return {
      submissionId: submission._id,
      score: evaluation.score || evaluation.overall,
      feedback: evaluation.feedback,
      reasoning: evaluation.reasoning,
      skillsUpdated: evaluation.skills || {},
      pointsEarned: challenge.points * ((evaluation.score || evaluation.overall) / 100),
    }
  },

  async getThinkingScore(userId) {
    const skills = await thinkingRepository.findThinkingSkills(userId)

    return {
      overallScore: skills?.overallScore || 0,
      criticalThinking: skills?.criticalThinking || 0,
      problemSolving: skills?.problemSolving || 0,
      creativity: skills?.creativity || 0,
      logicalReasoning: skills?.logicalReasoning || 0,
      trends: skills?.trends || {},
    }
  },

  async getHistory(userId) {
    const submissions = await thinkingRepository.findSubmissionsByUserId(userId)

    return {
      submissions: submissions.map((sub) => ({
        id: sub._id,
        date: sub.createdAt,
        challenge: sub.challengeTitle,
        score: sub.score,
        status: sub.score >= 70 ? 'completed' : 'needs-improvement',
      })),
      totalSubmissions: submissions.length,
      averageScore:
        submissions.length > 0
          ? submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length
          : 0,
    }
  },
}
