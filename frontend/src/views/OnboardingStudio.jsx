import React, { useState, useEffect } from 'react';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Award,
  BookOpen,
  Sliders,
  Eye,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Github from '../components/GithubIcon';
import WebcamCapture from '../components/WebcamCapture';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../utils/useLocalStorage';

export default function OnboardingStudio() {
  const { user, refreshProfile } = useAuth();

  // Onboarding Step: 1 = Branch / Intake, 2 = 20-Question Skill Test, 3 = Editable Path
  const [step, setStep] = useLocalStorage('vp_onboarding_step', 1);

  // Branch Info State
  const [branchInfo, setBranchInfo] = useState(null);
  const [isLoadingBranch, setIsLoadingBranch] = useState(true);

  // Google Branch Manual Inputs
  const [manualSkillsInput, setManualSkillsInput] = useLocalStorage('vp_onboarding_manual_skills', '');
  const [isZeroSkills, setIsZeroSkills] = useLocalStorage('vp_onboarding_zero_skills', false);
  const [selectedInterests, setSelectedInterests] = useLocalStorage('vp_onboarding_interests', []);

  // Selected Skill for 20-Question Assessment
  const [selectedSkill, setSelectedSkill] = useLocalStorage('vp_onboarding_selected_skill', '');
  const [assessmentData, setAssessmentData] = useLocalStorage('vp_onboarding_assessment_data', null);
  const [learnerAnswers, setLearnerAnswers] = useLocalStorage('vp_onboarding_learner_answers', {});
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [isGradingTest, setIsGradingTest] = useState(false);
  const [gradingResult, setGradingResult] = useLocalStorage('vp_onboarding_grading_result', null);

  // Proctoring Session Bridge
  const [proctoringSessionId, setProctoringSessionId] = useLocalStorage('vp_onboarding_proc_id', null);
  const [proctoringActive, setProctoringActive] = useLocalStorage('vp_onboarding_proc_active', false);
  const [integrityScore, setIntegrityScore] = useLocalStorage('vp_onboarding_integrity', 100);
  const [proctoringFlags, setProctoringFlags] = useState([]);

  // Learning Path State
  const [learningPath, setLearningPath] = useLocalStorage('vp_onboarding_learning_path', null);
  const [customPath, setCustomPath] = useLocalStorage('vp_onboarding_custom_path', []);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [isSavingPath, setIsSavingPath] = useState(false);
  const [pathSavedSuccess, setPathSavedSuccess] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');

  const [statusMsg, setStatusMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const interestOptions = [
    'Full Stack Web Architecture & React',
    'Python Async Backend & Microservices',
    'PyTorch & Deep Learning Models',
    'Cloud Native DevOps & Kubernetes',
    'Data Structures & Algorithm Design',
    'Relational Databases & SQL Optimization',
  ];

  // Load Branch Info on mount
  useEffect(() => {
    async function loadBranch() {
      setIsLoadingBranch(true);
      try {
        const res = await api.onboarding.getBranchInfo();
        setBranchInfo(res);
        if (res.inferred_skills && res.inferred_skills.length > 0) {
          setSelectedSkill(res.inferred_skills[0]);
        }
      } catch (err) {
        console.warn('Branch info fetch warning:', err);
      } finally {
        setIsLoadingBranch(false);
      }
    }
    loadBranch();
  }, [user]);

  // ---------------------------------------------------------------------------
  // Step 1 -> Step 2: Start 20-Question Skill Test
  // ---------------------------------------------------------------------------
  const handleStartSkillTest = async (skillToTest) => {
    const targetSkill = skillToTest || selectedSkill || manualSkillsInput.split(',')[0]?.trim();
    if (!targetSkill) {
      setErrorMsg('Please specify or select a skill to test.');
      return;
    }

    setSelectedSkill(targetSkill);
    setIsGeneratingTest(true);
    setErrorMsg(null);
    setAssessmentData(null);
    setGradingResult(null);
    setLearnerAnswers({});
    setIntegrityScore(100);
    setProctoringFlags([]);

    try {
      // 1. Initialize Proctoring Session Lifecycle Bridge
      const procRes = await api.proctoringSession.start('initial_skill_test', targetSkill);
      setProctoringSessionId(procRes.session_id);
      setProctoringActive(true);

      // 2. Generate 20-Question Test
      const testRes = await api.onboarding.generateSkillTest(targetSkill, 'medium');
      setAssessmentData(testRes);
      setStep(2);
    } catch (err) {
      setErrorMsg(`Failed to initiate skill test: ${err.message}`);
    } finally {
      setIsGeneratingTest(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Proctoring Frame Handler
  // ---------------------------------------------------------------------------
  const handleProctoringFrame = async (base64Img) => {
    if (!proctoringActive) return;
    try {
      const res = await api.proctoring.analyze(base64Img, 0.25);
      if (!res.is_compliant || (res.flags && res.flags.length > 0)) {
        setProctoringFlags((prev) => [...prev, ...res.flags]);
        setIntegrityScore((prev) => Math.max(30, prev - 7));
      }
    } catch (e) {
      // Background vision analysis error catch
    }
  };

  // ---------------------------------------------------------------------------
  // Submit & Grade 20-Question Assessment -> Assign Level
  // ---------------------------------------------------------------------------
  const handleSubmitSkillTest = async () => {
    if (!assessmentData) return;
    setIsGradingTest(true);
    setErrorMsg(null);
    setProctoringActive(false);

    try {
      const outcome = integrityScore < 40 ? 'malpractice' : 'pass';

      // 1. End Proctoring Session
      if (proctoringSessionId) {
        await api.proctoringSession.end(
          proctoringSessionId,
          outcome,
          integrityScore,
          proctoringFlags,
          selectedSkill
        );
      }

      // 2. Grade and assign Level in UserProfile.skills_matrix
      const gradeRes = await api.onboarding.gradeSkillTest(
        selectedSkill,
        assessmentData.questions,
        assessmentData.answer_key,
        learnerAnswers,
        outcome
      );

      setGradingResult(gradeRes.result);
      await refreshProfile();

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err) {
      setErrorMsg(`Grading failed: ${err.message}`);
    } finally {
      setIsGradingTest(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 1/2 -> Step 3: Generate Suggested & Editable Learning Path
  // ---------------------------------------------------------------------------
  const handleGeneratePath = async () => {
    setIsGeneratingPath(true);
    setErrorMsg(null);
    try {
      const res = await api.onboarding.generatePath(
        user?.target_role || 'Full Stack & AI Engineer',
        selectedInterests
      );
      setLearningPath(res.learning_path);
      setCustomPath(res.learning_path?.custom_path || []);
      setStep(3);
      await refreshProfile();
    } catch (err) {
      setErrorMsg(`Failed to generate roadmap: ${err.message}`);
    } finally {
      setIsGeneratingPath(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Path Reordering & Customization Controls
  // ---------------------------------------------------------------------------
  const moveSkill = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= customPath.length) return;
    const updated = [...customPath];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(newIndex, 0, movedItem);
    setCustomPath(updated);
    setPathSavedSuccess(false);
  };

  const removeSkill = (index) => {
    if (customPath.length <= 1) {
      setErrorMsg('A learning path must have at least 1 skill milestone.');
      return;
    }
    const updated = customPath.filter((_, idx) => idx !== index);
    setCustomPath(updated);
    setPathSavedSuccess(false);
  };

  const addCustomSkill = () => {
    if (!newSkillName.trim()) return;
    const newEntry = {
      sequence_order: customPath.length + 1,
      skill_id: `custom_skill_${Date.now()}`,
      skill_name: newSkillName.trim(),
      current_level: 'untested',
      target_level: 'advanced',
      estimated_weeks: 2,
      is_started: false,
      modules: [
        {
          module_id: `mod_${Date.now()}_1`,
          title: `Core Fundamentals & Patterns in ${newSkillName.trim()}`,
          duration_hours: 10,
          status: 'suggested_pending_start',
          assignment_passed: false,
          exam_passed: false,
        },
        {
          module_id: `mod_${Date.now()}_2`,
          title: `Applied Project & Architecture for ${newSkillName.trim()}`,
          duration_hours: 12,
          status: 'suggested_pending_start',
          assignment_passed: false,
          exam_passed: false,
        },
      ],
    };

    setCustomPath([...customPath, newEntry]);
    setNewSkillName('');
    setPathSavedSuccess(false);
  };

  const handleResetToSuggested = () => {
    if (learningPath?.suggested_path) {
      setCustomPath([...learningPath.suggested_path]);
      setPathSavedSuccess(false);
    }
  };

  const handleSaveCustomPath = async () => {
    setIsSavingPath(true);
    setErrorMsg(null);
    try {
      const res = await api.onboarding.customizePath(customPath);
      setLearningPath(res.learning_path);
      setCustomPath(res.learning_path?.custom_path || []);
      setPathSavedSuccess(true);
      await refreshProfile();
      setTimeout(() => setPathSavedSuccess(false), 4000);
    } catch (err) {
      setErrorMsg(`Failed to save roadmap: ${err.message}`);
    } finally {
      setIsSavingPath(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-orange">Personalized Onboarding</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Candidate skill testing & editable milestone roadmaps
          </span>
        </div>
        <h1>Onboarding & Technical Skill Diagnostics</h1>
        <p className="subheading">
          Diagnose baseline skill proficiencies through 20-question proctored evaluations and build an editable roadmap toward your target engineering role.
        </p>
      </div>

      {/* Step Progress Pills */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            className={`badge ${step === 1 ? 'badge-blue' : 'badge-green'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', cursor: 'pointer' }}
            onClick={() => setStep(1)}
          >
            1. Skill Intake & Branching
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div
            className={`badge ${step === 2 ? 'badge-blue' : step > 2 ? 'badge-green' : 'badge-orange'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', opacity: step >= 2 ? 1 : 0.6, cursor: step >= 2 ? 'pointer' : 'default' }}
            onClick={() => { if (step >= 2 || assessmentData) setStep(2); }}
          >
            2. 20-Question Proctored Skill Diagnostic
          </div>
          <ArrowRight size={14} color="var(--text-muted)" />
          <div
            className={`badge ${step === 3 ? 'badge-blue' : 'badge-orange'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', opacity: step === 3 ? 1 : 0.6, cursor: (customPath.length > 0 || learningPath) ? 'pointer' : 'default' }}
            onClick={() => { if (customPath.length > 0 || learningPath) setStep(3); }}
          >
            3. Editable Ordered Learning Roadmap
          </div>
        </div>

        {(step > 1 || assessmentData || customPath.length > 0) && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => {
              if (window.confirm('Reset onboarding diagnostic state and start over?')) {
                setStep(1);
                setAssessmentData(null);
                setLearnerAnswers({});
                setGradingResult(null);
                setProctoringSessionId(null);
                setProctoringActive(false);
                setIntegrityScore(100);
                setProctoringFlags([]);
                setLearningPath(null);
                setCustomPath([]);
              }
            }}
          >
            <RotateCcw size={13} />
            Reset Intake
          </button>
        )}
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            background: 'var(--color-error-container, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-error-container, #fca5a5)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1: ONBOARDING BRANCH INTAKE                                      */}
      {/* ===================================================================== */}
      {step === 1 && (
        <div className="grid-2">
          {/* Branch Decision Card */}
          <div className="hero-card">
            {branchInfo?.is_github ? (
              /* GitHub-Authenticated Branch */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Github size={20} color="var(--color-primary, #2563eb)" />
                  <span className="badge badge-green">GitHub OAuth Connected</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
                  Inferred Candidate Skills
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  We automatically analyzed your GitHub repositories and identified these candidate competencies. Select a skill to begin the 20-question proctored evaluation:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  {branchInfo.inferred_skills?.map((skill, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: selectedSkill === skill ? 'rgba(37, 99, 235, 0.2)' : '#18181b',
                        border: selectedSkill === skill ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                      }}
                      onClick={() => setSelectedSkill(skill)}
                    >
                      <span>{skill}</span>
                      <input
                        type="radio"
                        name="inferred_skill"
                        checked={selectedSkill === skill}
                        onChange={() => setSelectedSkill(skill)}
                        style={{ accentColor: 'var(--color-primary, #2563eb)' }}
                      />
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleStartSkillTest(selectedSkill)}
                    disabled={isGeneratingTest || !selectedSkill}
                  >
                    {isGeneratingTest ? <span className="spinner" /> : <ShieldCheck size={16} />}
                    <span>Start 20-Question Proctored Test</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={handleGeneratePath}
                    disabled={isGeneratingPath}
                  >
                    <span>Skip to Path Suggestion</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Google-Authenticated / Manual Branch */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span className="badge badge-blue">Direct Skills Intake</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
                  What Technical Skills Do You Have?
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  List any programming languages or frameworks you have experience with, or choose zero prior skills if you're starting from the ground up.
                </p>

                {!isZeroSkills ? (
                  <div>
                    <div className="form-group">
                      <label className="form-label">Your Technical Skills (Comma Separated)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Python, React, FastAPI, SQL"
                        value={manualSkillsInput}
                        onChange={(e) => setManualSkillsInput(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => handleStartSkillTest(manualSkillsInput.split(',')[0]?.trim())}
                        disabled={isGeneratingTest || !manualSkillsInput.trim()}
                      >
                        {isGeneratingTest ? <span className="spinner" /> : <ShieldCheck size={16} />}
                        <span>Take 20-Question Skill Test</span>
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: '0.82rem' }}
                        onClick={() => setIsZeroSkills(true)}
                      >
                        <span>I have no prior skills (Starting from Zero)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Zero Skills -> Ask for Interests Branch */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>Select Your Technical Interests</label>
                      <button
                        className="badge badge-orange"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setIsZeroSkills(false)}
                      >
                        I have skills to test
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      {interestOptions.map((interest, idx) => {
                        const isSelected = selectedInterests.includes(interest);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setSelectedInterests((prev) =>
                                isSelected ? prev.filter((i) => i !== interest) : [...prev, interest]
                              );
                            }}
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'rgba(37, 99, 235, 0.2)' : '#18181b',
                              border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                            }}
                          >
                            {isSelected ? '✓ ' : '+ '} {interest}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={handleGeneratePath}
                      disabled={isGeneratingPath}
                    >
                      {isGeneratingPath ? <span className="spinner" /> : <Sparkles size={16} />}
                      <span>Generate Suggested Learning Path from Interests</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Existing Tested Skills Matrix Preview */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
              Verified Skill Matrix
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Your profile's persistent skill competency ratings derived from proctored assessments.
            </p>

            {user?.skills_matrix && Object.keys(user.skills_matrix).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {Object.entries(user.skills_matrix).map(([sName, info]) => (
                  <div
                    key={sName}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{sName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Assessed Score: {info.score_percentage || `${(info.score * 100).toFixed(0)}%`} ({info.earned_points || 0}/{info.total_questions || 20} pts)
                      </div>
                    </div>
                    <span
                      className={`badge ${
                        info.level === 'advanced' ? 'badge-green' : info.level === 'intermediate' ? 'badge-orange' : 'badge-blue'
                      }`}
                    >
                      {info.level?.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-box" style={{ border: 'none', background: 'transparent', padding: '2rem 1rem' }}>
                <div className="empty-state-icon-wrapper">
                  <Sliders size={22} />
                </div>
                <div className="empty-state-title">No Skills Assessed Yet</div>
                <div className="empty-state-desc">
                  Complete a 20-question proctored test to establish your verified baseline level.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: 20-QUESTION PROCTORED SKILL ASSESSMENT                        */}
      {/* ===================================================================== */}
      {step === 2 && assessmentData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Left Column: 20 Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header / Tracker */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Skill Test: <span className="gradient-text">{assessmentData.skill_name}</span>
                </h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  20 Proctored Questions • {Object.keys(learnerAnswers).length} of 20 Answered
                </span>
              </div>

              <div style={{ width: '140px' }}>
                <div className="milestone-progress-container">
                  {assessmentData.questions?.map((_, idx) => (
                    <div
                      key={idx}
                      className={`milestone-segment ${learnerAnswers[`q${idx + 1}`] ? 'completed' : ''}`}
                      title={`Q${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Questions List */}
            {assessmentData.questions?.map((q, idx) => {
              const qid = q.id || `q${idx + 1}`;
              const isMCQ = q.type === 'mcq' && q.options;

              return (
                <div key={qid} className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span className="badge badge-blue">
                      Question {idx + 1} of 20 • {isMCQ ? 'Multiple Choice' : 'Architecture Short Answer'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {q.prompt}
                  </p>

                  {/* MCQ Options */}
                  {isMCQ && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Object.entries(q.options).map(([optKey, optText]) => {
                        const isSelected = learnerAnswers[qid] === optKey;
                        return (
                          <label
                            key={optKey}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.65rem 0.9rem',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'rgba(37, 99, 235, 0.2)' : '#18181b',
                              border: isSelected ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              fontSize: '0.86rem',
                              color: 'var(--text-main)',
                            }}
                          >
                            <input
                              type="radio"
                              name={`ans_${qid}`}
                              checked={isSelected}
                              onChange={() => setLearnerAnswers((prev) => ({ ...prev, [qid]: optKey }))}
                              style={{ accentColor: 'var(--color-primary, #2563eb)' }}
                            />
                            <span style={{ fontWeight: 700, color: 'var(--color-primary, #2563eb)' }}>{optKey}.</span>
                            <span>{optText}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer */}
                  {!isMCQ && (
                    <textarea
                      className="form-textarea"
                      placeholder="Explain the architectural concept and trade-offs..."
                      value={learnerAnswers[qid] || ''}
                      onChange={(e) => setLearnerAnswers((prev) => ({ ...prev, [qid]: e.target.value }))}
                      style={{ minHeight: '80px' }}
                    />
                  )}
                </div>
              );
            })}

            {/* Submission Bar */}
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {gradingResult ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                      Assigned Level: {gradingResult.assigned_level?.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                      Score: {gradingResult.score_percentage} ({gradingResult.earned_points}/{gradingResult.total_questions} pts)
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Complete all 20 questions to assign your baseline level.
                  </span>
                )}
              </div>

              {gradingResult ? (
                <button className="btn btn-primary" onClick={handleGeneratePath}>
                  <span>Proceed to Learning Roadmap</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="btn btn-emerald"
                  onClick={handleSubmitSkillTest}
                  disabled={isGradingTest}
                >
                  {isGradingTest ? <span className="spinner" /> : <Check size={16} />}
                  <span>Submit 20-Question Test</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Live Proctoring Monitor Bridge */}
          <div style={{ position: 'sticky', top: '5.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-card" style={{ background: 'var(--bg-card)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Eye size={18} color="var(--color-primary, #2563eb)" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Proctoring Verification Bridge
                  </h3>
                </div>
                <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                  Session: {proctoringActive ? 'ACTIVE' : 'FINALIZED'}
                </span>
              </div>

              <WebcamCapture
                autoStart={true}
                isActive={proctoringActive}
                isContinuous={proctoringActive}
                hideControls={true}
                continuousIntervalMs={3000}
                onContinuousFrame={handleProctoringFrame}
                label="Proctored Skill Test Camera"
              />

              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Integrity Score</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: integrityScore >= 80 ? 'var(--color-tertiary, #16a34a)' : 'var(--color-secondary, #f97316)' }}>
                    {integrityScore}%
                  </div>
                </div>
                <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Flags Recorded</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {proctoringFlags.length} Events
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: SUGGESTED & EDITABLE ORDERED LEARNING PATH                    */}
      {/* ===================================================================== */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Banner */}
          <div className="hero-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <span className="badge badge-orange">Suggested Learning Path</span>
                <span className="badge badge-blue">Editable Before Starting</span>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Target Role: {user?.target_role || 'Full Stack & AI Engineer'}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.3rem 0 0' }}>
                Reorder, add, or remove skill milestones below before locking in your sequence. (Zero modules marked in progress until started).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={handleResetToSuggested}>
                <RotateCcw size={14} />
                <span>Reset to AI Suggestion</span>
              </button>

              <button className="btn btn-primary" onClick={handleSaveCustomPath} disabled={isSavingPath}>
                {isSavingPath ? <span className="spinner" /> : <Check size={16} />}
                <span>Save Customized Roadmap</span>
              </button>
            </div>
          </div>

          {pathSavedSuccess && (
            <div
              style={{
                padding: '0.85rem 1.25rem',
                background: 'var(--color-tertiary-fixed, #dcfce7)',
                border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-on-tertiary-fixed, #86efac)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} />
              <span>Your customized learning roadmap is saved! Starting a skill is a separate step that locks in the path sequence.</span>
            </div>
          )}

          {/* Add Custom Skill Bar */}
          <div className="glass-card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Add a new technical skill to this learning roadmap..."
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={addCustomSkill} disabled={!newSkillName.trim()}>
              <Plus size={16} />
              <span>Add Skill Milestone</span>
            </button>
          </div>

          {/* Ordered Skill Sequence */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {customPath.map((skillItem, sIdx) => (
              <div
                key={skillItem.skill_id || sIdx}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Sequence Order Tag */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'var(--color-primary-fixed, #dbeafe)',
                      color: 'var(--color-primary, #2563eb)',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                    }}
                  >
                    #{sIdx + 1}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {skillItem.skill_name}
                      </h3>
                      <span
                        className={`badge ${
                          skillItem.current_level === 'advanced'
                            ? 'badge-green'
                            : skillItem.current_level === 'intermediate'
                            ? 'badge-orange'
                            : 'badge-blue'
                        }`}
                        style={{ fontSize: '0.68rem' }}
                      >
                        Level: {skillItem.current_level?.toUpperCase() || 'UNTESTED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {skillItem.modules?.length || 0} Modules • Est. {skillItem.estimated_weeks || 2} Weeks • Target: ADVANCED
                    </div>
                  </div>
                </div>

                {/* Reorder and Remove Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.6rem' }}
                    onClick={() => moveSkill(sIdx, -1)}
                    disabled={sIdx === 0}
                    title="Move Up in Sequence"
                  >
                    <ChevronUp size={16} />
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.6rem' }}
                    onClick={() => moveSkill(sIdx, 1)}
                    disabled={sIdx === customPath.length - 1}
                    title="Move Down in Sequence"
                  >
                    <ChevronDown size={16} />
                  </button>

                  <button
                    className="btn btn-danger"
                    style={{ padding: '0.35rem 0.6rem' }}
                    onClick={() => removeSkill(sIdx)}
                    title="Remove Skill"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
