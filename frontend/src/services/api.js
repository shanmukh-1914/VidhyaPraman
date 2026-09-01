/**
 * Vidhya Praman Unified API Client
 * Connects to the FastAPI backend running on http://127.0.0.1:8000 by default.
 */

let BASE_URL = localStorage.getItem('vidhyapraman_api_url') || localStorage.getItem('skillforge_api_url') || 'http://127.0.0.1:8000';
let DJANGO_URL = localStorage.getItem('vidhyapraman_django_url') || localStorage.getItem('skillforge_django_url') || 'http://127.0.0.1:8001';

export const setApiBaseUrl = (url) => {
  BASE_URL = url.replace(/\/+$/, '');
  localStorage.setItem('vidhyapraman_api_url', BASE_URL);
};

export const setDjangoBaseUrl = (url) => {
  DJANGO_URL = url.replace(/\/+$/, '');
  localStorage.setItem('vidhyapraman_django_url', DJANGO_URL);
};

export const getApiBaseUrl = () => BASE_URL;
export const getDjangoBaseUrl = () => DJANGO_URL;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errDetail = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errDetail = typeof errorData.detail === 'string' 
            ? errorData.detail 
            : JSON.stringify(errorData.detail);
        }
      } catch (e) {
        // use default statusText
      }
      throw new Error(errDetail);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error on [${endpoint}]:`, error);
    throw error;
  }
}

async function djangoRequest(endpoint, options = {}) {
  const url = `${DJANGO_URL}${endpoint}`;
  try {
    const headers = { ...options.headers };
    const token = localStorage.getItem('vidhyapraman_auth_token') || localStorage.getItem('skillforge_auth_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errDetail = data.error || data.detail || `HTTP Error ${response.status}: ${response.statusText}`;
      if (typeof errDetail === 'object') {
        const firstKey = Object.keys(errDetail)[0];
        errDetail = `${firstKey}: ${Array.isArray(errDetail[firstKey]) ? errDetail[firstKey][0] : errDetail[firstKey]}`;
      }
      throw new Error(errDetail);
    }

    return data;
  } catch (error) {
    console.error(`Django API Error on [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // 0. System & Health
  checkHealth: () => request('/health'),
  getRoot: () => request('/'),

  // 1. Biometric Identity Verification
  identity: {
    enroll: (imageUrlOrBase64) =>
      request('/identity/enroll', {
        method: 'POST',
        body: JSON.stringify({ image_url_or_base64: imageUrlOrBase64 }),
      }),
    enrollUpload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/identity/enroll-upload', {
        method: 'POST',
        body: formData,
      });
    },
    verify: (currentImage, refEmbedding = null, refImage = null, threshold = 0.60) =>
      request('/identity/verify', {
        method: 'POST',
        body: JSON.stringify({
          current_image_url_or_base64: currentImage,
          reference_embedding: refEmbedding,
          reference_image_url_or_base64: refImage,
          threshold: parseFloat(threshold),
        }),
      }),
    verifyUpload: (refFile, curFile, threshold = 0.60) => {
      const formData = new FormData();
      formData.append('reference_file', refFile);
      formData.append('current_file', curFile);
      return request(`/identity/verify-upload?threshold=${threshold}`, {
        method: 'POST',
        body: formData,
      });
    },
    runTestSuite: () =>
      request('/identity/test-suite', {
        method: 'POST',
      }),
  },

  // 2. Exam Proctoring (YOLOv8)
  proctoring: {
    analyze: (imageUrlOrBase64, confThreshold = 0.25) =>
      request('/proctoring/analyze', {
        method: 'POST',
        body: JSON.stringify({
          image_url_or_base64: imageUrlOrBase64,
          conf_threshold: parseFloat(confThreshold),
        }),
      }),
    analyzeUpload: (file, confThreshold = 0.25) => {
      const formData = new FormData();
      formData.append('file', file);
      return request(`/proctoring/analyze-upload?conf_threshold=${confThreshold}`, {
        method: 'POST',
        body: formData,
      });
    },
    runTestSuite: () =>
      request('/proctoring/test-suite', {
        method: 'POST',
      }),
  },

  // 3. Skill Confidence Scoring (GradientBoosting ML)
  skillConfidence: {
    score: (skillName, features) =>
      request('/skill-confidence/score', {
        method: 'POST',
        body: JSON.stringify({
          skill_name: skillName,
          features: {
            github_repos_count: Number(features.github_repos_count || 0),
            commit_frequency_monthly: Number(features.commit_frequency_monthly || 0),
            code_quality_score: Number(features.code_quality_score || 0),
            pr_acceptance_rate: Number(features.pr_acceptance_rate || 0),
            test_coverage_pct: Number(features.test_coverage_pct || 0),
            primary_language_match: Number(features.primary_language_match || 0),
            documentation_quality: Number(features.documentation_quality || 0),
          },
        }),
      }),
    getFeatureImportances: () =>
      request('/skill-confidence/feature-importances'),
    retrain: (nSamples = 600) =>
      request(`/skill-confidence/retrain?n_samples=${nSamples}`, {
        method: 'POST',
      }),
  },

  // 4. Assessment & Hybrid Grading Engine
  assessment: {
    generate: (moduleTopic, difficulty = 'medium', apiKey = null) =>
      request('/assessment/generate', {
        method: 'POST',
        body: JSON.stringify({
          module_topic: moduleTopic,
          difficulty: difficulty,
          api_key: apiKey || undefined,
        }),
      }),
    grade: (questions, answerKey, learnerAnswers, apiKey = null) =>
      request('/assessment/grade', {
        method: 'POST',
        body: JSON.stringify({
          questions: questions,
          answer_key: answerKey,
          learner_answers: learnerAnswers,
          api_key: apiKey || undefined,
        }),
      }),
  },

  // 5. Learning Plan & Curriculum Generator
  learningPlan: {
    generate: (goal, durationWeeks = 4, baselineSkills = {}, apiKey = null) => {
      let skillsDict = {};
      if (Array.isArray(baselineSkills)) {
        baselineSkills.forEach((s) => {
          if (typeof s === 'string' && s.trim()) {
            const parts = s.split(':');
            const name = parts[0].trim();
            const score = parts.length > 1 ? parseFloat(parts[1]) || 0.5 : 0.5;
            if (name) skillsDict[name] = score;
          }
        });
      } else if (typeof baselineSkills === 'object' && baselineSkills !== null) {
        skillsDict = baselineSkills;
      } else if (typeof baselineSkills === 'string') {
        baselineSkills.split(',').forEach((s) => {
          const parts = s.split(':');
          const name = parts[0].trim();
          const score = parts.length > 1 ? parseFloat(parts[1]) || 0.5 : 0.5;
          if (name) skillsDict[name] = score;
        });
      }

      if (Object.keys(skillsDict).length === 0) {
        skillsDict = { python: 0.5, linux: 0.3 };
      }

      return request('/learning-plan/generate', {
        method: 'POST',
        body: JSON.stringify({
          goal: goal,
          duration_weeks: Number(durationWeeks),
          baseline_skills: skillsDict,
          api_key: apiKey || undefined,
        }),
      });
    },
  },

  // 6. RAG Retrieval Vector Store
  rag: {
    addMemory: (userId, text, metadata = {}) =>
      request('/rag/memory', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          text: text,
          metadata: metadata,
        }),
      }),
    addBatchMemories: (userId, memories) =>
      request('/rag/memories/batch', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          memories: memories,
        }),
      }),
    retrieve: (userId, query, topK = 3) =>
      request('/rag/retrieve', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          query: query,
          top_k: Number(topK),
        }),
      }),
    getUserMemoryCount: (userId) =>
      request(`/rag/memories/${encodeURIComponent(userId)}/count`),
    clearMemories: (userId = null) =>
      request(userId ? `/rag/memories?user_id=${encodeURIComponent(userId)}` : '/rag/memories', {
        method: 'DELETE',
      }),
  },

  // 7. AI Tutoring Engine
  tutoring: {
    turn: (userId, moduleTopic, learnerMessage, language = 'English', apiKey = null) =>
      request('/tutoring/turn', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          module_topic: moduleTopic,
          learner_message: learnerMessage,
          language: language,
          api_key: apiKey || undefined,
        }),
      }),
    generateNotes: (moduleTopic, userQuery = null, language = 'English', apiKey = null) =>
      request('/tutoring/generate-notes', {
        method: 'POST',
        body: JSON.stringify({
          module_topic: moduleTopic,
          user_query: userQuery || undefined,
          language: language,
          api_key: apiKey || undefined,
        }),
      }),
  },

  // 8. Verified Document Generation (Resume & LOR)
  documents: {
    generateResume: (verifiedData, apiKey = null) =>
      request('/documents/resume', {
        method: 'POST',
        body: JSON.stringify({
          verified_data: verifiedData,
          api_key: apiKey || undefined,
        }),
      }),
    generateLOR: (verifiedData, apiKey = null) =>
      request('/documents/lor', {
        method: 'POST',
        body: JSON.stringify({
          verified_data: verifiedData,
          api_key: apiKey || undefined,
        }),
      }),
  },

  // 9. Certificate OCR & Entity Extraction
  certificate: {
    extract: (imageUrlOrBase64) =>
      request('/certificate/extract', {
        method: 'POST',
        body: JSON.stringify({ image_url_or_base64: imageUrlOrBase64 }),
      }),
    extractUpload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/certificate/extract-upload', {
        method: 'POST',
        body: formData,
      });
    },
    generateSynthetic: () =>
      request('/certificate/generate-synthetic', {
        method: 'POST',
      }),
  },

  // 10. Django Auth, Profiles & OAuth Synchronization Engine
  auth: {
    google: (credential) =>
      djangoRequest('/api/auth/google/', {
        method: 'POST',
        body: JSON.stringify({ credential }),
      }),
    github: (code, redirectUri = null) =>
      djangoRequest('/api/auth/github/', {
        method: 'POST',
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      }),
    linkGitHub: (code, redirectUri = null) =>
      djangoRequest('/api/auth/github/link/', {
        method: 'POST',
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      }),
    signup: (data) =>
      djangoRequest('/api/auth/signup/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    signin: (credentials) =>
      djangoRequest('/api/auth/signin/', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    getProfile: (username = null) =>
      djangoRequest(username ? `/api/auth/profile/?username=${encodeURIComponent(username)}` : '/api/auth/profile/', {
        method: 'GET',
      }),
    updateProfile: (profileData) =>
      djangoRequest('/api/auth/profile/update/', {
        method: 'PATCH',
        body: JSON.stringify(profileData),
      }),
    refreshToken: (refreshToken) =>
      djangoRequest('/api/auth/refresh/', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
    getActivities: (username = null) =>
      djangoRequest(username ? `/api/auth/activity/?username=${encodeURIComponent(username)}` : '/api/auth/activity/', {
        method: 'GET',
      }),
    logActivity: (activityData) =>
      djangoRequest('/api/auth/activity/', {
        method: 'POST',
        body: JSON.stringify(activityData),
      }),
  },

  // 11. Onboarding Branching & 20-Question Skill Assessments
  onboarding: {
    getBranchInfo: (username = null) =>
      djangoRequest(username ? `/api/onboarding/branch-info/?username=${encodeURIComponent(username)}` : '/api/onboarding/branch-info/', {
        method: 'GET',
      }),
    generateSkillTest: (skillName, difficulty = 'medium', apiKey = null) =>
      djangoRequest('/api/onboarding/generate-skill-test/', {
        method: 'POST',
        body: JSON.stringify({ skill_name: skillName, difficulty, api_key: apiKey }),
      }),
    gradeSkillTest: (skillName, questions, answerKey, learnerAnswers, proctoringOutcome = 'pass', apiKey = null) =>
      djangoRequest('/api/onboarding/grade-skill-test/', {
        method: 'POST',
        body: JSON.stringify({
          skill_name: skillName,
          questions,
          answer_key: answerKey,
          learner_answers: learnerAnswers,
          proctoring_outcome: proctoringOutcome,
          api_key: apiKey,
        }),
      }),
    generatePath: (targetRole = null, interests = [], durationWeeks = 8, apiKey = null) =>
      djangoRequest('/api/onboarding/generate-path/', {
        method: 'POST',
        body: JSON.stringify({
          target_role: targetRole,
          interests,
          duration_weeks: durationWeeks,
          api_key: apiKey,
        }),
      }),
    customizePath: (customPath) =>
      djangoRequest('/api/onboarding/customize-path/', {
        method: 'PUT',
        body: JSON.stringify({ custom_path: customPath }),
      }),
  },

  // 12. Proctoring Session Lifecycle Bridge (Single Shared Service)
  proctoringSession: {
    start: (sessionType, targetName, metadata = {}) =>
      djangoRequest('/api/proctoring/session/start/', {
        method: 'POST',
        body: JSON.stringify({ session_type: sessionType, target_name: targetName, metadata }),
      }),
    analyzeFrame: (sessionId, imageBase64) =>
      djangoRequest('/api/proctoring/session/analyze-frame/', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, image: imageBase64 }),
      }),
    end: (sessionId, score = null, passingThreshold = 0.70) =>
      djangoRequest('/api/proctoring/session/end/', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          score,
          passing_threshold: passingThreshold,
        }),
      }),
    getAuditTrail: (sessionId) =>
      djangoRequest(`/api/proctoring/session/audit-trail/?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
      }),
  },

  // 13. Sequential Learning Module System & Content Engine
  modules: {
    getTree: () =>
      djangoRequest('/api/modules/tree/', {
        method: 'GET',
      }),
    startSkill: (skillId) =>
      djangoRequest('/api/modules/start-skill/', {
        method: 'POST',
        body: JSON.stringify({ skill_id: skillId }),
      }),
    getContent: (skillId, moduleId, title = null, apiKey = null) =>
      djangoRequest('/api/modules/content/', {
        method: 'POST',
        body: JSON.stringify({ skill_id: skillId, module_id: moduleId, title, api_key: apiKey }),
      }),
    submitAssignment: (skillId, moduleId, submissionCode, submissionNotes = null) =>
      djangoRequest('/api/modules/assignment/submit/', {
        method: 'POST',
        body: JSON.stringify({
          skill_id: skillId,
          module_id: moduleId,
          submission_code: submissionCode,
          submission_notes: submissionNotes,
        }),
      }),
    recordExamOutcome: (skillId, moduleId, outcome = 'pass', score = 1.0, sessionId = null, flags = []) =>
      djangoRequest('/api/modules/exam/record-outcome/', {
        method: 'POST',
        body: JSON.stringify({
          skill_id: skillId,
          module_id: moduleId,
          outcome,
          score,
          session_id: sessionId,
          flags,
        }),
      }),
  },

  // 14. Unified Assessment Outcome Router (Pass / Fail-Remediation / Malpractice-Reset / Voluntary-Exit)
  outcomes: {
    process: (payload) =>
      djangoRequest('/api/outcomes/process/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getReadinessCheck: (skillId) =>
      djangoRequest(`/api/outcomes/readiness-check/?skill_id=${encodeURIComponent(skillId)}`, {
        method: 'GET',
      }),
    submitReadinessCheck: (skillId, answers) =>
      djangoRequest('/api/outcomes/readiness-check/submit/', {
        method: 'POST',
        body: JSON.stringify({ skill_id: skillId, answers }),
      }),
  },

  // 15. Badges & External Certification Engine
  badges: {
    checkAward: (skillId) =>
      djangoRequest('/api/badges/check-award/', {
        method: 'POST',
        body: JSON.stringify({ skill_id: skillId }),
      }),
    getSummary: (username = null) =>
      djangoRequest(username ? `/api/badges/summary/?username=${encodeURIComponent(username)}` : '/api/badges/summary/', {
        method: 'GET',
      }),
  },

  certificates: {
    verifyUpload: (certData) =>
      djangoRequest('/api/certificates/verify-upload/', {
        method: 'POST',
        body: JSON.stringify(certData),
      }),
    getCurated: (skillId = 'default') =>
      djangoRequest(`/api/certificates/curated/?skill_id=${encodeURIComponent(skillId)}`, {
        method: 'GET',
      }),
  },

  // 16. Resume Upload & Independent Claim Verification Engine
  resumeImport: {
    parseResume: (resumeText, fileName = 'Uploaded Resume') =>
      djangoRequest('/api/resume/import/parse/', {
        method: 'POST',
        body: JSON.stringify({ resume_text: resumeText, file_name: fileName }),
      }),
    parseResumeUpload: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return djangoRequest('/api/resume/import/parse/', {
        method: 'POST',
        body: formData,
      });
    },
    getClaims: () =>
      djangoRequest('/api/resume/import/claims/', {
        method: 'GET',
      }),
    generateProjectQA: (projectClaimId) =>
      djangoRequest('/api/resume/import/verify-project-qa/', {
        method: 'POST',
        body: JSON.stringify({ project_claim_id: projectClaimId }),
      }),
    submitProjectQA: (projectClaimId, answers) =>
      djangoRequest('/api/resume/import/submit-project-qa/', {
        method: 'POST',
        body: JSON.stringify({ project_claim_id: projectClaimId, answers }),
      }),
    verifyCertificateClaim: (certClaimId, verificationId = null, credentialUrl = null) =>
      djangoRequest('/api/resume/import/verify-certificate-claim/', {
        method: 'POST',
        body: JSON.stringify({
          cert_claim_id: certClaimId,
          verification_id: verificationId,
          credential_url: credentialUrl,
        }),
      }),
  },

  // 17. Portfolio & Verified Resume Generation Engine
  portfolio: {
    getStatus: (username = null) =>
      djangoRequest(username ? `/api/portfolio/status/?username=${encodeURIComponent(username)}` : '/api/portfolio/status/', {
        method: 'GET',
      }),
    generate: () =>
      djangoRequest('/api/portfolio/generate/', {
        method: 'POST',
      }),
  },

  // 18. Self-Test Practice Sandbox (Strictly Stateless & Unpersisted)
  practice: {
    generate: (topic = 'Python Core & Advanced Internals', numQuestions = 5, difficulty = 'medium') =>
      djangoRequest('/api/practice/generate/', {
        method: 'POST',
        body: JSON.stringify({ topic, num_questions: numQuestions, difficulty }),
      }),
    grade: (questions, answerKey, explanations, learnerAnswers) =>
      djangoRequest('/api/practice/grade/', {
        method: 'POST',
        body: JSON.stringify({
          questions,
          answer_key: answerKey,
          explanations,
          learner_answers: learnerAnswers,
        }),
      }),
  },
};
