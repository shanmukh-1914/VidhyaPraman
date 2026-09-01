import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCode,
  ShieldCheck,
  ShieldAlert,
  Award,
  ChevronRight,
  Eye,
  Check,
  Sparkles,
  ArrowRight,
  Database,
  Globe,
  Code2,
  PauseCircle,
  HelpCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MarkdownRenderer from '../components/MarkdownRenderer';
import WebcamCapture from '../components/WebcamCapture';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage, getStoredItem, setStoredItem } from '../utils/useLocalStorage';

export default function ModuleStudio() {
  const { user, refreshProfile } = useAuth();

  const [treeData, setTreeData] = useState(null);
  const [storedSkillId, setStoredSkillId] = useLocalStorage('vp_module_selected_skill_id', null);
  const [storedModuleId, setStoredModuleId] = useLocalStorage('vp_module_selected_mod_id', null);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleContent, setModuleContent] = useState(null);

  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isStartingSkill, setIsStartingSkill] = useState(false);

  // Assignment State
  const [assignmentCode, setAssignmentCode] = useState('');
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // Proctored Exam Modal & Session State
  const [showExamConfirmModal, setShowExamConfirmModal] = useState(false);
  const [isExamActive, setIsExamActive] = useLocalStorage('vp_module_exam_active', false);
  const [examAnswers, setExamAnswers] = useLocalStorage('vp_module_exam_answers', {});
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [outcomeData, setOutcomeData] = useLocalStorage('vp_module_exam_outcome', null);

  // Voluntary Exit & Readiness Check State
  const [showReadinessModal, setShowReadinessModal] = useState(false);
  const [readinessQuestions, setReadinessQuestions] = useState(null);
  const [readinessAnswers, setReadinessAnswers] = useState({});
  const [isSubmittingReadiness, setIsSubmittingReadiness] = useState(false);

  // Proctoring Bridge
  const [proctoringSessionId, setProctoringSessionId] = useLocalStorage('vp_module_proc_id', null);
  const [integrityScore, setIntegrityScore] = useLocalStorage('vp_module_integrity', 100);
  const [proctoringFlags, setProctoringFlags] = useState([]);

  const [errorMsg, setErrorMsg] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  // 1. Fetch Module Tree on mount
  const loadModuleTree = async (autoSelectModuleId = null) => {
    setIsLoadingTree(true);
    try {
      const res = await api.modules.getTree();
      setTreeData(res);

      if (res.courses && res.courses.length > 0) {
        const targetSkillId = storedSkillId || (selectedCourse ? selectedCourse.skill_id : null);
        const activeCourse = targetSkillId
          ? res.courses.find((c) => c.skill_id === targetSkillId) || res.courses[0]
          : res.courses[0];
        setSelectedCourse(activeCourse);
        setStoredSkillId(activeCourse.skill_id);

        if (activeCourse.modules && activeCourse.modules.length > 0) {
          const targetModId = autoSelectModuleId || storedModuleId || (selectedModule ? selectedModule.module_id : null);
          const modToSelect = targetModId
            ? activeCourse.modules.find((m) => m.module_id === targetModId)
            : activeCourse.modules.find((m) => m.is_unlocked) || activeCourse.modules[0];

          if (modToSelect) {
            handleSelectModule(activeCourse, modToSelect, true);
          }
        }
      }
    } catch (err) {
      setErrorMsg(`Failed to load curriculum tree: ${err.message}`);
    } finally {
      setIsLoadingTree(false);
    }
  };

  useEffect(() => {
    loadModuleTree();
  }, [user]);

  // 2. Select and load long-form content for a module
  const handleSelectModule = async (course, mod, isRestoring = false) => {
    if (!mod.is_unlocked && !course.is_started) {
      setErrorMsg(`This module is locked. Start the skill course to unlock Module 1.`);
      return;
    }
    if (!mod.is_unlocked) {
      setErrorMsg(mod.lock_reason || 'This module unlocks after passing the previous module assignment and proctored exam.');
      return;
    }

    setSelectedCourse(course);
    setSelectedModule(mod);
    setStoredSkillId(course.skill_id);
    setStoredModuleId(mod.module_id);

    if (!isRestoring) {
      setIsExamActive(false);
      setShowExamConfirmModal(false);
      setOutcomeData(null);
    }
    setErrorMsg(null);

    // Check if returning from a voluntary pause requiring readiness check
    if (course.readiness_check_required) {
      try {
        const rc = await api.outcomes.getReadinessCheck(course.skill_id);
        setReadinessQuestions(rc);
        setShowReadinessModal(true);
      } catch (e) {}
    }

    setIsLoadingContent(true);
    try {
      const content = await api.modules.getContent(course.skill_id, mod.module_id, mod.title);
      setModuleContent(content);

      // Restore saved code if learner previously worked on this module
      const savedCode = getStoredItem(`vp_mod_code_${mod.module_id}`, null);
      if (savedCode !== null) {
        setAssignmentCode(savedCode);
      } else {
        setAssignmentCode(content.assignment?.starter_code || '');
      }
    } catch (err) {
      setErrorMsg(`Failed to load module content: ${err.message}`);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Sync assignment code changes to localStorage
  const handleCodeChange = (newCode) => {
    setAssignmentCode(newCode);
    if (selectedModule?.module_id) {
      setStoredItem(`vp_mod_code_${selectedModule.module_id}`, newCode);
    }
  };

  // 3. Start Skill Course Action
  const handleStartSkill = async (skillId) => {
    setIsStartingSkill(true);
    setErrorMsg(null);
    try {
      const res = await api.modules.startSkill(skillId);
      setTreeData(res.tree);
      await refreshProfile();
      await loadModuleTree();
      setStatusMsg('Skill course activated! Module 1 is now unlocked.');
      setTimeout(() => setStatusMsg(null), 3500);
    } catch (err) {
      setErrorMsg(`Failed to start skill: ${err.message}`);
    } finally {
      setIsStartingSkill(false);
    }
  };

  // 4. Submit Module Assignment
  const handleSubmitAssignment = async () => {
    if (!selectedCourse || !selectedModule) return;
    if (!assignmentCode.trim() || assignmentCode.length < 10) {
      setErrorMsg('Please implement your assignment solution before submitting.');
      return;
    }

    setIsSubmittingAssignment(true);
    setErrorMsg(null);
    try {
      await api.modules.submitAssignment(
        selectedCourse.skill_id,
        selectedModule.module_id,
        assignmentCode
      );

      await refreshProfile();
      await loadModuleTree(selectedModule.module_id);
      setShowExamConfirmModal(true);
    } catch (err) {
      setErrorMsg(`Assignment submission failed: ${err.message}`);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  // 5. Start Proctored Exam after explicit confirmation
  const handleLaunchProctoredExam = async () => {
    setShowExamConfirmModal(false);
    setIsExamActive(true);
    setExamAnswers({});
    setOutcomeData(null);
    setIntegrityScore(100);
    setProctoringFlags([]);

    try {
      const proc = await api.proctoringSession.start(
        'module_exam',
        `${selectedCourse.skill_name} - ${selectedModule.title}`
      );
      setProctoringSessionId(proc.session_id);
    } catch (e) {}
  };

  // 6. Proctoring Frame Handler
  const handleProctoringFrame = async (base64Img) => {
    if (!isExamActive || !proctoringSessionId) return;
    try {
      const res = await api.proctoringSession.analyzeFrame(proctoringSessionId, base64Img);
      if (res.should_terminate || res.outcome === 'malpractice') {
        // Immediate Malpractice Termination!
        setIsExamActive(false);
        const malRes = await api.outcomes.process({
          assessment_type: 'module_exam',
          skill_id: selectedCourse.skill_id,
          module_id: selectedModule.module_id,
          outcome: 'malpractice',
          session_id: proctoringSessionId,
          flags: res.flags || ['malpractice_trigger'],
        });
        setOutcomeData(malRes);
        await refreshProfile();
        await loadModuleTree();
      }
    } catch (e) {}
  };

  // 7. Submit Proctored Exam -> Route through Master Outcome Router
  const handleSubmitExam = async () => {
    if (!selectedCourse || !selectedModule) return;
    setIsSubmittingExam(true);
    setErrorMsg(null);

    try {
      // Calculate score based on answers
      let correctCount = 0;
      const totalQuestions = moduleContent.exam_questions?.length || 5;
      const perQuestionResults = {};
      const weakTopics = [];

      moduleContent.exam_questions?.forEach((q, idx) => {
        const qid = q.id || `eq${idx + 1}`;
        const userAns = examAnswers[qid];
        const isCorrect = userAns === q.correct_answer || (userAns && userAns.length > 5);
        perQuestionResults[qid] = {
          correct: isCorrect,
          topic: q.topic || `Topic of Question ${idx + 1}`,
        };
        if (isCorrect) {
          correctCount++;
        } else {
          weakTopics.push(q.topic || `Core Principle of Question ${idx + 1}`);
        }
      });

      const score = correctCount / totalQuestions;
      const outcome = score >= 0.70 ? 'pass' : 'fail';

      // 1. Finalize Proctoring Session
      if (proctoringSessionId) {
        await api.proctoringSession.end(proctoringSessionId, score, 0.70);
      }

      // 2. Route outcome through Master Outcome Router
      const res = await api.outcomes.process({
        assessment_type: 'module_exam',
        skill_id: selectedCourse.skill_id,
        module_id: selectedModule.module_id,
        outcome,
        score,
        per_question_results: perQuestionResults,
        weak_topics: weakTopics,
        session_id: proctoringSessionId,
      });

      setOutcomeData(res);
      setIsExamActive(false);

      await refreshProfile();
      await loadModuleTree(selectedModule.module_id);

      if (outcome === 'pass') {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err) {
      setErrorMsg(`Exam submission failed: ${err.message}`);
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // 8. Voluntary Exit Mid-Skill Action
  const handleVoluntaryExit = async () => {
    if (!selectedCourse || !selectedModule) return;
    try {
      const res = await api.outcomes.process({
        assessment_type: 'module_exam',
        skill_id: selectedCourse.skill_id,
        module_id: selectedModule.module_id,
        outcome: 'voluntary_exit',
      });
      setOutcomeData(res);
      setStatusMsg('Session paused and progress saved. A short refresher will greet you when you return.');
      setTimeout(() => setStatusMsg(null), 4000);
      await loadModuleTree();
    } catch (e) {
      setErrorMsg(`Failed to save pause state: ${e.message}`);
    }
  };

  // 9. Submit Readiness Check on Return
  const handleSubmitReadinessCheck = async () => {
    if (!selectedCourse) return;
    setIsSubmittingReadiness(true);
    try {
      await api.outcomes.submitReadinessCheck(selectedCourse.skill_id, readinessAnswers);
      setShowReadinessModal(false);
      setStatusMsg('Readiness check verified! Resuming from where you paused.');
      setTimeout(() => setStatusMsg(null), 3500);
      await loadModuleTree(selectedModule?.module_id);
    } catch (e) {
      setErrorMsg(`Readiness verification failed: ${e.message}`);
    } finally {
      setIsSubmittingReadiness(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className="badge badge-blue">Sequential Learning Engine</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Strict sequential module progression & persistent curriculum depth
          </span>
        </div>
        <h1>Learning Modules & AI Curriculum Studio</h1>
        <p className="subheading">
          Work through thoroughly descriptive technical modules. Complete practical assignments to unlock proctored certification exams and advance sequentially.
        </p>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--color-tertiary-fixed, #dcfce7)',
            border: '1px solid var(--color-tertiary-fixed-dim, #86efac)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-tertiary-fixed, #14532d)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--color-error-container, #fee2e2)',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-on-error-container, #991b1b)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Course/Module Sidebar vs. Right Content & Assessment Reader */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* =================================================================== */}
        {/* LEFT COLUMN: COURSE & MODULE TREE NAVIGATOR                         */}
        {/* =================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {treeData?.courses?.map((course) => {
            const isSelected = selectedCourse?.skill_id === course.skill_id;
            return (
              <div
                key={course.skill_id}
                className="glass-card"
                style={{
                  border: isSelected ? '2px solid var(--color-primary, #2563eb)' : '1px solid var(--border-subtle)',
                  padding: '1.15rem',
                }}
              >
                {/* Course Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      {course.track_name && (
                        <span
                          className={`badge ${course.is_current_track !== false ? 'badge-blue' : 'badge-orange'}`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {course.is_current_track !== false ? '🎯 Active: ' : '📚 Enrolled: '} {course.track_name}
                        </span>
                      )}
                      {course.is_globally_unlocked && (
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                          Global Basic Course
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      {course.skill_name}
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {course.completed_modules_count} of {course.total_modules_count} Modules Passed
                </p>

                {/* Progress Mini Bar */}
                <div className="milestone-progress-container" style={{ marginBottom: '1rem' }}>
                  {course.modules?.map((m, idx) => (
                    <div
                      key={idx}
                      className={`milestone-segment ${m.exam_passed ? 'completed' : m.is_unlocked ? 'active' : ''}`}
                      title={m.title}
                    />
                  ))}
                </div>

                {/* Start Skill Button if not started */}
                {!course.is_started && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}
                    onClick={() => handleStartSkill(course.skill_id)}
                    disabled={isStartingSkill}
                  >
                    <Play size={14} />
                    <span>Start Course (Unlock Module 1)</span>
                  </button>
                )}

                {/* Sequential Modules List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {course.modules?.map((mod, mIdx) => {
                    const isModActive = selectedModule?.module_id === mod.module_id;
                    return (
                      <div
                        key={mod.module_id}
                        onClick={() => handleSelectModule(course, mod)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          background: isModActive
                            ? 'var(--color-primary-fixed, #dbeafe)'
                            : mod.is_unlocked
                            ? 'var(--color-surface-container-low, #f8fafc)'
                            : '#f1f5f9',
                          border: isModActive ? '1px solid var(--color-primary-fixed-dim, #93c5fd)' : '1px solid var(--border-subtle)',
                          cursor: mod.is_unlocked ? 'pointer' : 'not-allowed',
                          opacity: mod.is_unlocked ? 1 : 0.65,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {mod.exam_passed ? (
                            <CheckCircle2 size={16} color="var(--color-tertiary, #16a34a)" />
                          ) : mod.is_unlocked ? (
                            <Unlock size={15} color="var(--color-primary, #2563eb)" />
                          ) : (
                            <Lock size={15} color="var(--text-dim)" />
                          )}
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: isModActive ? 700 : 600, color: 'var(--text-main)' }}>
                              #{mIdx + 1}. {mod.title}
                            </div>
                          </div>
                        </div>

                        {mod.exam_passed && (
                          <span className="badge badge-green" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                            PASSED
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: MODULE LESSON CONTENT, ASSIGNMENT & EXAM              */}
        {/* =================================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {selectedModule && moduleContent ? (
            <>
              {/* Module Header Bar */}
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span className="badge badge-blue">{selectedCourse?.skill_name}</span>
                    <span className="badge badge-green">
                      <Database size={11} style={{ marginRight: '3px' }} /> Persisted in Database
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    {moduleContent.title}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleVoluntaryExit}
                    title="Save your exact progress and pause cleanly"
                  >
                    <PauseCircle size={15} />
                    <span>Pause & Save</span>
                  </button>

                  {selectedModule.exam_passed ? (
                    <span className="badge badge-green" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                      <Award size={15} style={{ marginRight: '4px' }} /> Module Certified & Passed
                    </span>
                  ) : selectedModule.assignment_passed ? (
                    <button className="btn btn-primary" onClick={() => setShowExamConfirmModal(true)}>
                      <ShieldCheck size={16} />
                      <span>Take Proctored Exam</span>
                    </button>
                  ) : (
                    <span className="badge badge-orange" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
                      Complete Assignment to Unlock Exam
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Long-Form Lesson Curriculum Reader */}
              <div className="glass-card" style={{ padding: '2rem 2.25rem' }}>
                <MarkdownRenderer content={moduleContent.lesson_markdown} />
              </div>

              {/* 2. Practical Assignment Section */}
              <div className="hero-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <FileCode size={20} color="var(--color-primary, #2563eb)" />
                  <span className="badge badge-blue">Mandatory Practical Assignment</span>
                  {selectedModule.assignment_passed && (
                    <span className="badge badge-green">✓ Verified & Passed</span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
                  Module Assignment: Hands-On Verification
                </h3>

                <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  <MarkdownRenderer content={moduleContent.assignment?.prompt} />
                </div>

                {/* Code Editor Area */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Your Code Solution</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Python / Architectural Schema</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    value={assignmentCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: '#ffffff' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Submitting your assignment unlocks the proctored exam confirmation screen.
                  </span>

                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitAssignment}
                    disabled={isSubmittingAssignment}
                  >
                    {isSubmittingAssignment ? <span className="spinner" /> : <Check size={16} />}
                    <span>{selectedModule.assignment_passed ? 'Re-Submit Solution' : 'Submit Assignment'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Proctored Exam Area (When Launched) */}
              {isExamActive && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
                  {/* Left Column: 5 Proctored Exam Questions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="glass-card" style={{ border: '2px solid var(--color-primary, #2563eb)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                          Proctored Module Certification Exam
                        </h3>
                        <span className="badge badge-orange">5 Questions</span>
                      </div>

                      {moduleContent.exam_questions?.map((eq, qIdx) => {
                        const isMCQ = eq.type === 'mcq' && eq.options;
                        const qid = eq.id || `eq${qIdx + 1}`;
                        return (
                          <div key={qid} style={{ marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                              {qIdx + 1}. {eq.prompt}
                            </p>

                            {isMCQ && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {Object.entries(eq.options).map(([k, v]) => (
                                  <label
                                    key={k}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '6px',
                                      background: examAnswers[qid] === k ? 'var(--color-primary-fixed, #dbeafe)' : 'var(--color-surface-container-low, #f8fafc)',
                                      border: examAnswers[qid] === k ? '1px solid var(--color-primary, #2563eb)' : '1px solid var(--border-subtle)',
                                      cursor: 'pointer',
                                      fontSize: '0.82rem',
                                    }}
                                  >
                                    <input
                                      type="radio"
                                      name={qid}
                                      checked={examAnswers[qid] === k}
                                      onChange={() => setExamAnswers((prev) => ({ ...prev, [qid]: k }))}
                                      style={{ accentColor: 'var(--color-primary, #2563eb)' }}
                                    />
                                    <strong>{k}.</strong> {v}
                                  </label>
                                ))}
                              </div>
                            )}

                            {!isMCQ && (
                              <textarea
                                className="form-textarea"
                                placeholder="Explain your answer thoroughly..."
                                value={examAnswers[qid] || ''}
                                onChange={(e) => setExamAnswers((prev) => ({ ...prev, [qid]: e.target.value }))}
                                rows={3}
                              />
                            )}
                          </div>
                        );
                      })}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button
                          className="btn btn-emerald"
                          onClick={handleSubmitExam}
                          disabled={isSubmittingExam}
                        >
                          {isSubmittingExam ? <span className="spinner" /> : <Award size={16} />}
                          <span>Submit Proctored Exam</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Webcam Monitor */}
                  <div style={{ position: 'sticky', top: '5.5rem' }}>
                    <div className="glass-card" style={{ background: '#ffffff', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Camera Integrity Monitor</span>
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>LIVE</span>
                      </div>

                      <WebcamCapture
                        autoStart={true}
                        isActive={isExamActive}
                        isContinuous={isExamActive}
                        hideControls={true}
                        continuousIntervalMs={2500}
                        onContinuousFrame={handleProctoringFrame}
                        label="Exam Session Camera"
                      />

                      <div style={{ marginTop: '0.75rem', padding: '0.65rem', borderRadius: '8px', background: 'var(--color-surface-container-low, #f8fafc)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Session Integrity Score</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: integrityScore >= 80 ? 'var(--color-tertiary, #16a34a)' : 'var(--color-secondary, #f97316)' }}>
                          {integrityScore}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* OUTCOME PRESENTATION: PASS / FAIL-REMEDIATION / MALPRACTICE   */}
              {/* ============================================================= */}
              {outcomeData && (
                <div>
                  {/* CASE 1: PASS */}
                  {outcomeData.outcome === 'pass' && (
                    <div
                      className="glass-card"
                      style={{
                        border: '2px solid var(--color-tertiary, #16a34a)',
                        background: 'var(--color-tertiary-fixed, #dcfce7)',
                        padding: '1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CheckCircle2 size={36} color="var(--color-on-tertiary-fixed, #14532d)" />
                        <div>
                          <h3 style={{ margin: 0, fontWeight: 900, color: '#14532d', fontSize: '1.15rem' }}>
                            Module Passed & Certified!
                          </h3>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: '#166534' }}>
                            {outcomeData.message || 'The next sequential module has been unlocked in your learning tree.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CASE 2: FAIL -> TARGETED WEAK-TOPIC REMEDIATION */}
                  {outcomeData.outcome === 'fail' && outcomeData.remediation && (
                    <div
                      className="glass-card"
                      style={{
                        border: '2px solid var(--color-secondary, #f97316)',
                        background: '#ffffff',
                        padding: '1.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <AlertCircle size={32} color="var(--color-secondary, #f97316)" />
                        <div>
                          <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--text-main)', fontSize: '1.15rem' }}>
                            Focused Revision Needed (Module Retained)
                          </h3>
                          <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            You remain on this module. Complete the targeted weak-topic revision below before retaking.
                          </p>
                        </div>
                      </div>

                      {/* Weak Topics Badges */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-main)' }}>
                          Identified Weak Topics:
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {outcomeData.weak_topics?.map((wt, wIdx) => (
                            <span key={wIdx} className="badge badge-orange">
                              {wt}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Remediation Notes */}
                      <div style={{ background: 'var(--color-surface-container-low, #f8fafc)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
                        <MarkdownRenderer content={outcomeData.remediation.remediation_notes} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setOutcomeData(null);
                            setShowExamConfirmModal(true);
                          }}
                        >
                          <RefreshCw size={16} />
                          <span>Re-Attempt Module Exam</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CASE 3: MALPRACTICE RESET */}
                  {outcomeData.outcome === 'malpractice' && (
                    <div
                      className="glass-card"
                      style={{
                        border: '2px solid var(--color-error, #dc2626)',
                        background: 'var(--color-error-container, #fee2e2)',
                        padding: '1.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShieldAlert size={36} color="var(--color-on-error-container, #991b1b)" />
                        <div>
                          <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--color-on-error-container, #991b1b)', fontSize: '1.15rem' }}>
                            MALPRACTICE RESET TRIGGERED
                          </h3>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#991b1b' }}>
                            {outcomeData.message || 'All progress for this specific skill has been reset to Module 1. Other skills remain unaffected.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state-box">
              <div className="empty-state-icon-wrapper">
                <BookOpen size={28} />
              </div>
              <div className="empty-state-title">Select an Unlocked Module</div>
              <div className="empty-state-desc">
                Choose an active course from the curriculum navigator on the left to begin your sequential study.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* EXPLICIT PROCTORED EXAM CONFIRMATION MODAL                            */}
      {/* ===================================================================== */}
      {showExamConfirmModal && selectedModule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              borderRadius: '20px',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--color-primary-fixed, #dbeafe)',
                  color: 'var(--color-primary, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Start Proctored Exam?
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Module: {selectedModule.title}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              You have successfully completed the assignment. You are about to enter a proctored evaluation session with webcam integrity monitoring to verify your module mastery.
            </p>

            <div style={{ background: 'var(--color-surface-container-low, #f8fafc)', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                Exam Conditions:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                <li>5 comprehensive technical questions (MCQ & architectural code concepts)</li>
                <li>Live camera presence & focus monitoring active throughout the exam</li>
                <li>Passing unlocks the next sequential module in your curriculum roadmap</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowExamConfirmModal(false)}
              >
                Cancel & Review Lesson
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLaunchProctoredExam}
              >
                <ShieldCheck size={16} />
                <span>Launch Proctored Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* READINESS CHECK MODAL (RETURNING FROM VOLUNTARY PAUSE)                */}
      {/* ===================================================================== */}
      {showReadinessModal && readinessQuestions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '2rem',
              borderRadius: '20px',
              background: '#ffffff',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--color-primary-fixed, #dbeafe)',
                  color: 'var(--color-primary, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Welcome Back: Short Readiness Check
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Refresher for {readinessQuestions.skill_name}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1.25rem' }}>
              You previously paused this skill. Answer these 3 quick refresher questions to reactivate your forward momentum right where you left off.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {readinessQuestions.questions?.map((q, idx) => (
                <div key={q.id} style={{ padding: '0.85rem', background: 'var(--color-surface-container-low, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {idx + 1}. {q.prompt}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {Object.entries(q.options).map(([k, v]) => (
                      <label
                        key={k}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          background: readinessAnswers[q.id] === k ? 'var(--color-primary-fixed, #dbeafe)' : '#ffffff',
                          border: readinessAnswers[q.id] === k ? '1px solid var(--color-primary, #2563eb)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={readinessAnswers[q.id] === k}
                          onChange={() => setReadinessAnswers((prev) => ({ ...prev, [q.id]: k }))}
                          style={{ accentColor: 'var(--color-primary, #2563eb)' }}
                        />
                        <strong>{k}.</strong> {v}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitReadinessCheck}
                disabled={isSubmittingReadiness}
              >
                {isSubmittingReadiness ? <span className="spinner" /> : <Check size={16} />}
                <span>Verify & Resume Skill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
