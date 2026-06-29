'use client';

import { tracks, type Track, type Unit, type Lesson, type Exercise, type ExerciseType, type FinalProject } from '@/lib/curriculum-data';
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ebsopensource_progress';

interface ProgressState {
  xp: number;
  streak: number;
  lastActiveDate: string;
  completedExercises: string[];
  completedLessons: string[];
  currentTrack: string;
}

function getInitialProgress(): ProgressState {
  const base: ProgressState = { xp: 0, streak: 0, lastActiveDate: '', completedExercises: [], completedLessons: [], currentTrack: 'r' };
  if (typeof window === 'undefined') return base;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ProgressState;
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (parsed.lastActiveDate !== today) {
        parsed.streak = parsed.lastActiveDate === yesterday ? parsed.streak + 1 : 1;
        parsed.lastActiveDate = today;
      }
      return parsed;
    } catch { /* ignore */ }
  }
  return base;
}

function saveProgress(p: ProgressState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

function getLessonProgress(lessonId: string, completedExercises: string[]): number {
  const lesson = tracks.flatMap(t => t.units).flatMap(u => u.lessons).find(l => l.id === lessonId);
  if (!lesson) return 0;
  const done = lesson.exercises.filter(e => completedExercises.includes(e.id)).length;
  return Math.round((done / lesson.exercises.length) * 100);
}

function getUnitProgress(unit: Unit, completedExercises: string[]): number {
  const total = unit.lessons.reduce((s, l) => s + l.exercises.length, 0);
  const done = unit.lessons.reduce((s, l) => s + l.exercises.filter(e => completedExercises.includes(e.id)).length, 0);
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

// ============================================================
// Main Page
// ============================================================
export default function Home() {
  const [progress, setProgress] = useState<ProgressState>(getInitialProgress);
  const [currentTrack, setCurrentTrack] = useState<string>(progress.currentTrack || 'r');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'teaching' | 'quiz' | 'result' | 'finalproject'>('intro');
  const [activeFinalProject, setActiveFinalProject] = useState<FinalProject | null>(null);
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  const track = tracks.find(t => t.id === currentTrack)!;

  useEffect(() => { saveProgress(progress); }, [progress]);

  const handleAnswer = useCallback((exercise: Exercise, answer: string | number) => {
    const isCorrect = String(answer).toLowerCase().trim() === String(exercise.correctAnswer).toLowerCase().trim();
    if (isCorrect) {
      const xpGain = activeLesson?.xpReward || 10;
      setEarnedXP(xpGain);
      setShowXPAnimation(true);
      setTimeout(() => setShowXPAnimation(false), 1500);
      setProgress(p => ({ ...p, xp: p.xp + xpGain, completedExercises: [...new Set([...p.completedExercises, exercise.id])] }));
    }
    return isCorrect;
  }, [activeLesson]);

  const checkLessonComplete = useCallback((lesson: Lesson) => {
    const allDone = lesson.exercises.every(e => progress.completedExercises.includes(e.id));
    if (allDone && !progress.completedLessons.includes(lesson.id)) {
      setProgress(p => ({ ...p, completedLessons: [...new Set([...p.completedLessons, lesson.id])] }));
    }
  }, [progress.completedExercises, progress.completedLessons]);

  // ── FINAL PROJECT DETAIL VIEW ─────────────────────────
  if (phase === 'finalproject' && activeFinalProject) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-[#0a0a0a] text-white">
          <div className="max-w-[1140px] mx-auto flex items-center justify-between px-5 py-2.5">
            <button
              onClick={() => { setActiveFinalProject(null); setPhase('intro'); setActiveLesson(null); }}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              ← Back to Curriculum
            </button>
          </div>
        </header>
        <div className="h-0.5 bg-[#A31F34]" />

        <main className="flex-1 max-w-[1140px] mx-auto w-full px-5 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-[#A31F34]">Final Project</span>
                <span className="text-[10px] font-bold text-[#A31F34] bg-[#A31F34]/10 px-2 py-0.5 rounded-full">+{activeFinalProject.xpReward} XP</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{activeFinalProject.title}</h1>
            </div>

            {/* Scenario */}
            <div className="border border-border rounded-lg p-6">
              <h2 className="font-bold text-foreground text-sm mb-2">Scenario</h2>
              <p className="text-muted-foreground leading-7">{activeFinalProject.scenario}</p>
            </div>

            {/* Tasks */}
            <div className="border border-border rounded-lg p-6">
              <h2 className="font-bold text-foreground text-sm mb-3">Your Tasks</h2>
              <ol className="space-y-2">
                {activeFinalProject.tasks.map((task, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="font-bold text-[#A31F34] flex-shrink-0">{i + 1}.</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Deliverables */}
            <div className="border border-border rounded-lg p-6">
              <h2 className="font-bold text-foreground text-sm mb-3">Deliverables</h2>
              <ul className="space-y-1.5">
                {activeFinalProject.deliverables.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-[#A31F34]">●</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills */}
            <div>
              <h2 className="font-bold text-foreground text-sm mb-2">Skills You Will Use</h2>
              <div className="flex flex-wrap gap-2">
                {activeFinalProject.skills.map((s, i) => (
                  <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">{s}</span>
                ))}
              </div>
            </div>

            {/* Starter Code */}
            {activeFinalProject.starterCode && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-[#A31F34] px-4 py-2">
                  <span className="text-white text-xs font-semibold">Starter Code</span>
                </div>
                <pre className="bg-[#0a0a0a] text-[#e2697d] p-4 text-sm font-mono overflow-x-auto leading-6">
                  {activeFinalProject.starterCode}
                </pre>
              </div>
            )}

            <button
              onClick={() => { setActiveFinalProject(null); setPhase('intro'); setActiveLesson(null); }}
              className="w-full py-3.5 rounded-lg font-semibold text-base bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] active:scale-[0.99] transition-all"
            >
              ← Back to Curriculum
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── LESSON VIEW ──────────────────────────────────────
  if (activeLesson) {
    const exercises = activeLesson.exercises;
    const currentEx = exercises[activeExerciseIdx];
    const completedInLesson = exercises.filter(e => progress.completedExercises.includes(e.id)).length;
    const progressPct = Math.round((completedInLesson / exercises.length) * 100);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* MIT-style top bar */}
        <header className="sticky top-0 z-50 bg-[#0a0a0a] text-white">
          <div className="max-w-[1140px] mx-auto flex items-center justify-between px-5 py-2.5">
            <button
              onClick={() => { setActiveLesson(null); setActiveExerciseIdx(0); setPhase('intro'); }}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <div className="flex-1 mx-6">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#A31F34] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <span className="text-xs font-semibold text-white/50">{completedInLesson}/{exercises.length}</span>
          </div>
        </header>
        {/* Red accent line */}
        <div className="h-0.5 bg-[#A31F34]" />

        <main className="flex-1 max-w-[1140px] mx-auto w-full px-5 py-8">
          {phase === 'intro' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="text-center space-y-4 pt-4">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">{activeLesson.title}</h1>
                <p className="text-muted-foreground text-lg">{activeLesson.description}</p>
              </div>
              <div className="border border-border rounded-lg p-6 space-y-4">
                <p className="text-foreground leading-7">{activeLesson.intro}</p>
                {activeLesson.introCode && (
                  <pre className="bg-[#0a0a0a] text-[#e2697d] rounded-lg p-4 text-sm font-mono overflow-x-auto leading-6">
                    {activeLesson.introCode}
                  </pre>
                )}
              </div>
              <button
                onClick={() => setPhase('teaching')}
                className="w-full py-3.5 rounded-lg font-semibold text-base bg-[#A31F34] text-white hover:bg-[#8B1A2C] active:scale-[0.99] transition-all"
              >
                Start Learning →
              </button>
            </div>
          )}

          {phase === 'teaching' && currentEx && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#A31F34] text-xs font-bold text-white">
                  {activeExerciseIdx + 1}
                </span>
                <span className="uppercase tracking-widest font-semibold text-[11px] text-muted-foreground">Learn this concept</span>
              </div>
              <div className="border border-border rounded-lg p-6 space-y-4">
                <p className="text-foreground leading-7 text-[15px]">{currentEx.teaching}</p>
                {currentEx.teachingCode && (
                  <pre className="bg-[#0a0a0a] text-[#e2697d] rounded-lg p-4 text-sm font-mono overflow-x-auto leading-6">
                    {currentEx.teachingCode}
                  </pre>
                )}
              </div>
              <button
                onClick={() => setPhase('quiz')}
                className="w-full py-3.5 rounded-lg font-semibold text-base bg-[#A31F34] text-white hover:bg-[#8B1A2C] active:scale-[0.99] transition-all"
              >
                Let&apos;s Practice →
              </button>
            </div>
          )}

          {phase === 'quiz' && currentEx && (
            <div className="max-w-2xl mx-auto">
              <ExerciseCard key={currentEx.id} exercise={currentEx} lesson={activeLesson}
                isCompleted={progress.completedExercises.includes(currentEx.id)}
                onAnswer={(answer) => { const correct = handleAnswer(currentEx, answer); setPhase('result'); if (correct) checkLessonComplete(activeLesson); }}
              />
            </div>
          )}

          {phase === 'result' && currentEx && (
            <div className="max-w-2xl mx-auto">
              <ResultCard exercise={currentEx} lesson={activeLesson} isCompleted={progress.completedExercises.includes(currentEx.id)}
                onNext={() => {
                  if (activeExerciseIdx < activeLesson.exercises.length - 1) { setActiveExerciseIdx(i => i + 1); setPhase('teaching'); }
                  else { setActiveLesson(null); setActiveExerciseIdx(0); setPhase('intro'); }
                }}
              />
            </div>
          )}
        </main>

        {showXPAnimation && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="animate-bounce text-4xl font-black text-[#A31F34] drop-shadow-lg">+{earnedXP} XP</div>
          </div>
        )}
      </div>
    );
  }

  // ── MAIN CURRICULUM VIEW ────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* MIT-style main header — black bar */}
      <header className="bg-[#0a0a0a]">
        <div className="max-w-[1140px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-xl tracking-tight">EBSOpenSource</span>
            <span className="text-white/30 text-xl">|</span>
            <span className="text-white/50 text-sm">Computational Biology Curriculum</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
              <span className="text-sm">🔥</span>
              <span className="font-bold text-white text-sm" suppressHydrationWarning>{progress.streak}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#A31F34]/80 rounded-full px-3 py-1.5">
              <span className="text-sm">⭐</span>
              <span className="font-bold text-white text-sm" suppressHydrationWarning>{progress.xp} XP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Red secondary bar with track tabs — MIT nav style */}
      <nav className="bg-[#A31F34]">
        <div className="max-w-[1140px] mx-auto px-5 flex gap-0">
          {tracks.map(t => (
            <button
              key={t.id}
              onClick={() => setCurrentTrack(t.id)}
              className={`px-6 py-2.5 text-sm font-semibold transition-all relative ${
                currentTrack === t.id
                  ? 'text-white bg-white/15'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.title}
              {currentTrack === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-[1140px] mx-auto w-full px-5 py-10">
        {/* Hero section */}
        <div className="mb-12 pb-8 border-b border-border">
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">{track.title}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{track.description}</p>
        </div>

        {/* Curriculum units */}
        <div className="space-y-12">
          {track.units.map((unit, unitIdx) => {
            const unitProg = getUnitProgress(unit, progress.completedExercises);
            return (
              <section key={unit.id}>
                <div className="flex items-baseline gap-4 mb-5">
                  <h2 className="text-xl font-bold text-foreground">{unit.title}</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#A31F34]/10 text-[#A31F34]">
                    {unitProg}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-5 -mt-3 ml-0">{unit.description}</p>

                {/* Lessons grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unit.lessons.map((lesson) => {
                    const lessonProg = getLessonProgress(lesson.id, progress.completedExercises);
                    const isComplete = lessonProg === 100;
                    const isStarted = lessonProg > 0;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setActiveLesson(lesson);
                          const firstIncomplete = lesson.exercises.findIndex(e => !progress.completedExercises.includes(e.id));
                          setActiveExerciseIdx(firstIncomplete >= 0 ? firstIncomplete : 0);
                          setPhase('intro');
                        }}
                        className={`group text-left p-5 rounded-lg border transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
                          isComplete
                            ? 'bg-[#A31F34]/5 border-[#A31F34]/20 hover:border-[#A31F34]/40'
                            : isStarted
                            ? 'bg-[#1E669E]/5 border-[#1E669E]/20 hover:border-[#1E669E]/40'
                            : 'bg-card border-border hover:border-[#A31F34]/30'
                        }`}
                      >
                        {/* Status indicator */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2 h-2 rounded-full ${
                            isComplete ? 'bg-[#A31F34]' : isStarted ? 'bg-[#1E669E]' : 'bg-muted-foreground/30'
                          }`} />
                          <span className={`text-[10px] uppercase tracking-widest font-semibold ${
                            isComplete ? 'text-[#A31F34]' : isStarted ? 'text-[#1E669E]' : 'text-muted-foreground'
                          }`}>
                            {isComplete ? 'Complete' : isStarted ? 'In Progress' : 'Not Started'}
                          </span>
                          <span className="ml-auto text-xs font-bold text-[#A31F34]">+{lesson.xpReward} XP</span>
                        </div>

                        <h3 className="font-semibold text-foreground text-sm mb-1">{lesson.title}</h3>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{lesson.description}</p>

                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-[#A31F34]' : isStarted ? 'bg-[#1E669E]' : 'bg-muted-foreground/20'}`}
                            style={{ width: `${lessonProg}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Final Project Card */}
                {unit.finalProject && (
                  <div className="mt-5 p-5 rounded-lg border-2 border-dashed border-[#A31F34]/30 bg-[#A31F34]/[0.03]">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#A31F34] flex items-center justify-center flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-foreground text-sm">Final Project: {unit.finalProject.title}</h3>
                          <span className="text-[10px] font-bold text-[#A31F34] bg-[#A31F34]/10 px-2 py-0.5 rounded-full">+{unit.finalProject.xpReward} XP</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{unit.finalProject.description}</p>
                        <button
                          onClick={() => { setActiveFinalProject(unit.finalProject); setPhase('finalproject'); }}
                          className="text-xs font-semibold text-[#A31F34] hover:text-[#8B1A2C] transition-colors"
                        >
                          View Project Details →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>

      {/* Footer — MIT-style black footer */}
      <footer className="mt-auto bg-[#0a0a0a] text-white/50 py-6">
        <div className="max-w-[1140px] mx-auto px-5 flex items-center justify-between">
          <span className="text-sm">EBSOpenSource — R & Python for Computational Biology</span>
          <span className="text-xs">Inspired by MIT OpenCourseWare</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Exercise Card — QUIZ phase
// ============================================================
function ExerciseCard({ exercise, lesson, isCompleted, onAnswer }: {
  exercise: Exercise; lesson: Lesson; isCompleted: boolean; onAnswer: (answer: string | number) => boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  const typeLabel: Record<ExerciseType, string> = {
    multiple_choice: 'Multiple Choice', fill_blank: 'Fill in the Blank', code_order: 'Arrange the Code',
    true_false: 'True or False', match_pairs: 'Match the Pairs', code_output: 'Code Output', code_fix: 'Fix the Code',
  };

  const handleSubmit = () => {
    const answer = exercise.type === 'fill_blank' || exercise.type === 'code_output' ? textInput : selected || '';
    onAnswer(answer);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{typeLabel[exercise.type]}</span>
        {isCompleted && <span className="text-[10px] font-semibold text-[#A31F34] uppercase tracking-widest">Completed</span>}
      </div>

      <div className="border border-border rounded-lg p-5">
        <h2 className="text-lg font-bold text-foreground mb-3">{exercise.question}</h2>
        {exercise.code && (
          <pre className="bg-[#0a0a0a] text-[#e2697d] rounded-lg p-4 text-sm font-mono overflow-x-auto leading-6">{exercise.code}</pre>
        )}
      </div>

      <div className="space-y-2">
        {(exercise.type === 'multiple_choice' || exercise.type === 'code_order' || exercise.type === 'code_fix') && exercise.options && (
          exercise.options.map((opt, i) => {
            const isSelected = selected === opt;
            return (
              <button key={i} onClick={() => setSelected(opt)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 text-sm ${
                  isSelected ? 'bg-[#A31F34]/5 border-[#A31F34] text-foreground' : 'bg-card border-border text-foreground hover:border-[#A31F34]/30'
                }`}>
                <span className="inline-flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
                    isSelected ? 'bg-[#A31F34] text-white border-[#A31F34]' : 'border-border text-muted-foreground'
                  }`}>{isSelected ? '●' : String.fromCharCode(65 + i)}</span>
                  {opt}
                </span>
              </button>
            );
          })
        )}

        {(exercise.type === 'fill_blank' || exercise.type === 'code_output') && exercise.options && (
          exercise.options.map((opt, i) => {
            const isSelected = selected === opt;
            return (
              <button key={i} onClick={() => { setSelected(opt); setTextInput(opt); }}
                className={`w-full text-left p-3.5 rounded-lg border transition-all duration-150 font-mono text-sm ${
                  isSelected ? 'bg-[#A31F34]/5 border-[#A31F34] text-foreground' : 'bg-card border-border text-foreground hover:border-[#A31F34]/30'
                }`}>{opt}</button>
            );
          })
        )}

        {exercise.type === 'true_false' && (
          <div className="flex gap-3">
            {['true', 'false'].map(opt => {
              const isSelected = selected === opt;
              return (
                <button key={opt} onClick={() => setSelected(opt)}
                  className={`flex-1 py-3.5 rounded-lg border-2 font-semibold text-sm transition-all duration-150 ${
                    isSelected
                      ? opt === 'true' ? 'bg-[#A31F34]/10 border-[#A31F34] text-[#A31F34]' : 'bg-destructive/10 border-destructive text-destructive'
                      : 'bg-card border-border text-foreground hover:border-[#A31F34]/30'
                  }`}>
                  {opt === 'true' ? 'True' : 'False'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button onClick={handleSubmit} disabled={!selected && !textInput}
        className={`w-full py-3.5 rounded-lg font-semibold text-base transition-all duration-150 ${
          selected || textInput
            ? 'bg-[#A31F34] text-white hover:bg-[#8B1A2C] active:scale-[0.99]'
            : 'bg-secondary text-muted-foreground cursor-not-allowed'
        }`}>Check Answer</button>
    </div>
  );
}

// ============================================================
// Result Card
// ============================================================
function ResultCard({ exercise, lesson, isCompleted, onNext }: {
  exercise: Exercise; lesson: Lesson; isCompleted: boolean; onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className={`rounded-lg border p-5 ${isCompleted ? 'bg-[#A31F34]/5 border-[#A31F34]/30' : 'bg-destructive/5 border-destructive/30'}`}>
        <h3 className={`font-bold text-lg ${isCompleted ? 'text-[#A31F34]' : 'text-destructive'}`}>
          {isCompleted ? `Correct — +${lesson.xpReward} XP` : 'Not quite right'}
        </h3>
      </div>
      <div className="border border-border rounded-lg p-5 space-y-2">
        <h4 className="font-semibold text-foreground text-sm">Explanation</h4>
        <p className="text-muted-foreground text-sm leading-7">{exercise.explanation}</p>
      </div>
      {exercise.hint && (
        <div className="bg-[#1E669E]/5 border border-[#1E669E]/20 rounded-lg p-4">
          <p className="text-[#1E669E] text-sm"><span className="font-semibold">Hint:</span> {exercise.hint}</p>
        </div>
      )}
      <button onClick={onNext}
        className="w-full py-3.5 rounded-lg font-semibold text-base bg-[#A31F34] text-white hover:bg-[#8B1A2C] active:scale-[0.99] transition-all">
        Continue →
      </button>
    </div>
  );
}
