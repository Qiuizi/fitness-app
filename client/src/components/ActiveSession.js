import React, { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';
import { useToast } from './Toast';
import { EXERCISE_LIBRARY } from './AddWorkout';

const DRAFT_KEY = 'activeSession.v1';
const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25];
const BAR_WEIGHTS = [20, 15, 10, 0];
const e1RM = (w, r) => (w && r) ? Math.round(w * (1 + r / 30)) : 0;
const vibrate = (ms) => { if (navigator.vibrate) navigator.vibrate(ms); };

const buzz = () => vibrate(18);

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function platesPerSide(targetKg, barKg) {
  if (targetKg <= barKg) return [];
  const remaining = (targetKg - barKg) / 2;
  if (remaining <= 0) return [];
  const plates = [];
  let left = Math.round(remaining * 100) / 100;
  for (const p of PLATE_SIZES) {
    while (left + 0.001 >= p) {
      plates.push(p);
      left = Math.round((left - p) * 100) / 100;
    }
  }
  return plates;
}

const ActiveSession = () => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const toast = useToast();

  const [phase, setPhase] = useState('setup'); // setup | session | finish
  const [exercises, setExercises] = useState([]);
  const [curExIdx, setCurExIdx] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [rest, setRest] = useState({ active: false, endAt: 0, duration: 90 });
  const [tick, setTick] = useState(0);
  const [prs, setPrs] = useState({});
  const [prBurst, setPrBurst] = useState(null);
  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [barKg, setBarKg] = useState(20);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const hapticFiredRef = useRef(false);

  // ── Load draft + PRs
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.exercises?.length) {
          setExercises(d.exercises);
          setCurExIdx(d.curExIdx || 0);
          setStartedAt(d.startedAt || Date.now());
          setPhase(d.phase || 'session');
          setBarKg(d.barKg || 20);
        }
      } catch {}
    }
    fetch(`${API_URL}/api/workouts/pr`, { headers: { 'x-auth-token': token } })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const map = {};
        (list || []).forEach(p => { map[p.exercise] = { weight: p.weight, reps: p.reps, e1RM: p.best1RM || e1RM(p.weight, p.reps) }; });
        setPrs(map);
      }).catch(() => {});
  }, [token]);

  // ── Persist draft
  useEffect(() => {
    if (phase === 'setup' && !exercises.length) return;
    if (phase === 'finish' && saved) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ phase, exercises, curExIdx, startedAt, barKg }));
  }, [phase, exercises, curExIdx, startedAt, barKg, saved]);

  // ── Rest timer tick
  useEffect(() => {
    if (!rest.active) return;
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [rest.active]);

  // ── Haptic when rest hits 0
  useEffect(() => {
    if (!rest.active) { hapticFiredRef.current = false; return; }
    const remaining = Math.max(0, Math.round((rest.endAt - Date.now()) / 1000));
    if (remaining === 0 && !hapticFiredRef.current) {
      hapticFiredRef.current = true;
      vibrate([80, 60, 80, 60, 120]);
    }
  }, [tick, rest]);

  // ── PR burst auto-dismiss
  useEffect(() => {
    if (!prBurst) return;
    const id = setTimeout(() => setPrBurst(null), 2800);
    return () => clearTimeout(id);
  }, [prBurst]);

  const curEx = exercises[curExIdx];
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  const addExercise = useCallback((name, type = 'strength') => {
    setExercises(prev => {
      if (prev.some(e => e.name === name)) return prev;
      return [...prev, {
        name, type,
        targetWeight: '', targetReps: '', targetSets: 3,
        sets: [],
        notes: '',
      }];
    });
  }, []);

  const removeExercise = useCallback((idx) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateExercise = useCallback((idx, patch) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }, []);

  // Prefill targets from last session
  const prefillFromLast = useCallback(async (idx, name) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/last/${encodeURIComponent(name)}`, { headers: { 'x-auth-token': token } });
      if (!res.ok) return;
      const data = await res.json();
      const valid = (data?.sets || []).filter(s => s.weight > 0 || s.reps > 0);
      if (!valid.length) return;
      const top = valid.reduce((a, b) => (b.weight > a.weight ? b : a), valid[0]);
      updateExercise(idx, {
        targetWeight: top.weight || '',
        targetReps: top.reps || '',
        targetSets: Math.max(valid.length, 3),
      });
    } catch {}
  }, [token, updateExercise]);

  const startSession = useCallback(() => {
    if (!exercises.length) { toast.error('至少添加一个动作'); return; }
    setStartedAt(Date.now());
    setCurExIdx(0);
    setPhase('session');
    buzz();
  }, [exercises.length, toast]);

  // ── Log a set for current exercise
  const logSet = useCallback((weight, reps, rpe) => {
    if (!curEx) return;
    const newSet = { weight: Number(weight) || 0, reps: Number(reps) || 0, done: true, setDuration: 0, isWarmup: false, rpe, setType: 'normal' };
    setExercises(prev => prev.map((e, i) => i === curExIdx ? { ...e, sets: [...e.sets, newSet] } : e));
    vibrate(22);
    const pr = prs[curEx.name];
    const newE = e1RM(newSet.weight, newSet.reps);
    if (newSet.weight > 0 && newSet.reps > 0 && (!pr || newE > (pr.e1RM || 0))) {
      setPrBurst({ exercise: curEx.name, weight: newSet.weight, reps: newSet.reps, e1rm: newE });
      setPrs(prev => ({ ...prev, [curEx.name]: { weight: newSet.weight, reps: newSet.reps, e1RM: newE } }));
      vibrate([30, 40, 30, 40, 60]);
    }
    // Auto-start rest
    const dur = rest.duration || 90;
    setRest({ active: true, endAt: Date.now() + dur * 1000, duration: dur });
    hapticFiredRef.current = false;
  }, [curEx, curExIdx, prs, rest.duration]);

  const undoLastSet = useCallback(() => {
    if (!curEx?.sets.length) return;
    setExercises(prev => prev.map((e, i) => i === curExIdx ? { ...e, sets: e.sets.slice(0, -1) } : e));
    setRest(r => ({ ...r, active: false }));
  }, [curEx, curExIdx]);

  const skipRest = useCallback(() => {
    setRest(r => ({ ...r, active: false }));
  }, []);

  const adjustRest = useCallback((deltaSec) => {
    setRest(r => r.active
      ? { ...r, endAt: r.endAt + deltaSec * 1000, duration: Math.max(15, r.duration + deltaSec) }
      : { ...r, duration: Math.max(15, r.duration + deltaSec) });
  }, []);

  const prevExercise = useCallback(() => {
    if (curExIdx > 0) { setCurExIdx(i => i - 1); setRest(r => ({ ...r, active: false })); }
  }, [curExIdx]);

  const nextExercise = useCallback(() => {
    if (curExIdx < exercises.length - 1) { setCurExIdx(i => i + 1); setRest(r => ({ ...r, active: false })); }
    else { setPhase('finish'); }
  }, [curExIdx, exercises.length]);

  // ── Finish + save
  const handleFinish = useCallback(async () => {
    const records = exercises
      .filter(ex => ex.sets.length > 0)
      .map(ex => ({
        date: todayStr(),
        exercise: ex.name,
        type: ex.type || 'strength',
        sets: ex.sets,
        notes: ex.notes || '',
        duration: Math.floor(elapsed / Math.max(1, exercises.length)),
      }));
    if (!records.length) {
      localStorage.removeItem(DRAFT_KEY);
      navigate('/');
      return;
    }
    try {
      await Promise.all(records.map(r => fetch(`${API_URL}/api/workouts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(r),
      })));
      setSaved(true);
      localStorage.removeItem(DRAFT_KEY);
      toast.success('训练已记录');
      setTimeout(() => navigate('/'), 600);
    } catch {
      toast.error('保存失败，请重试');
    }
  }, [exercises, elapsed, token, toast, navigate]);

  const abandonSession = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    navigate('/');
  }, [navigate]);

  // ── Render: shared frame
  const frame = {
    minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text-1)',
    display: 'flex', flexDirection: 'column',
    paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
  };

  if (phase === 'setup') return (
    <SetupView
      frame={frame}
      exercises={exercises}
      addExercise={addExercise}
      removeExercise={removeExercise}
      updateExercise={updateExercise}
      prefillFromLast={prefillFromLast}
      onStart={startSession}
      onCancel={() => { localStorage.removeItem(DRAFT_KEY); navigate('/'); }}
      restDefault={rest.duration}
      setRestDefault={(d) => setRest(r => ({ ...r, duration: d }))}
    />
  );

  if (phase === 'finish') return (
    <FinishView frame={frame} exercises={exercises} elapsed={elapsed} onConfirm={handleFinish} onBack={() => setPhase('session')} />
  );

  // session phase
  return (
    <div style={frame}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setExitConfirm(true)} aria-label="退出" style={headerBtn}>✕</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em' }}>训练中</div>
          <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtDuration(elapsed)}</div>
        </div>
        <button onClick={() => setPhase('finish')} style={{ ...headerBtn, fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 99, background: 'var(--c-blue-dim)', color: 'var(--c-blue)' }}>完成</button>
      </div>

      {/* Exercise nav */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {exercises.map((ex, i) => (
          <button key={ex.name} onClick={() => { setCurExIdx(i); setRest(r => ({ ...r, active: false })); }}
            style={{
              flexShrink: 0, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              border: '1px solid ' + (i === curExIdx ? 'var(--c-blue)' : 'var(--border)'),
              background: i === curExIdx ? 'var(--c-blue)' : 'var(--surface)',
              color: i === curExIdx ? '#fff' : 'var(--text-2)',
              WebkitTapHighlightColor: 'transparent',
            }}>
            {i + 1}. {ex.name.length > 6 ? ex.name.slice(0, 6) + '…' : ex.name}
            {ex.sets.length > 0 && <span style={{ marginLeft: 4, opacity: 0.8 }}>·{ex.sets.length}</span>}
          </button>
        ))}
      </div>

      {curEx && (
        <ExerciseLogView
          key={curEx.name + curExIdx}
          exercise={curEx}
          pr={prs[curEx.name]}
          onLogSet={logSet}
          onUndoLast={undoLastSet}
          onUpdate={(patch) => updateExercise(curExIdx, patch)}
          onOpenPlate={() => setShowPlateCalc(true)}
          onPrev={prevExercise}
          onNext={nextExercise}
          canPrev={curExIdx > 0}
          isLast={curExIdx === exercises.length - 1}
        />
      )}

      {rest.active && (
        <RestOverlay
          remaining={Math.max(0, Math.round((rest.endAt - Date.now()) / 1000))}
          duration={rest.duration}
          onSkip={skipRest}
          onAdjust={adjustRest}
        />
      )}

      {prBurst && <PRBurst {...prBurst} />}

      {showPlateCalc && curEx && (
        <PlateCalcSheet
          target={Number(curEx.targetWeight) || (curEx.sets.at(-1)?.weight) || 0}
          barKg={barKg}
          setBarKg={setBarKg}
          onClose={() => setShowPlateCalc(false)}
        />
      )}

      {exitConfirm && (
        <ExitSheet onKeep={() => setExitConfirm(false)} onAbandon={abandonSession} />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Setup view — pick exercises + target
// ═══════════════════════════════════════════════════════════════
const SetupView = ({ frame, exercises, addExercise, removeExercise, updateExercise, prefillFromLast, onStart, onCancel, restDefault, setRestDefault }) => {
  const [category, setCategory] = useState('胸部');
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return EXERCISE_LIBRARY[category] || [];
    const all = Object.values(EXERCISE_LIBRARY).flat();
    return all.filter(n => n.includes(search.trim()));
  }, [category, search]);

  return (
    <div style={frame}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onCancel} style={headerBtn}>✕</button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>准备训练</div>
        <div style={{ width: 36 }} />
      </div>

      <div style={{ padding: '16px', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* Selected list */}
        {exercises.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>本次训练 · {exercises.length} 项</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {exercises.map((ex, i) => (
                <div key={ex.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{i + 1}. {ex.name}</div>
                    <button onClick={() => removeExercise(i)} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 18, padding: 4, cursor: 'pointer' }} aria-label="移除">×</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <LabeledNum label="重量" suffix="kg" value={ex.targetWeight} onChange={(v) => updateExercise(i, { targetWeight: v })} />
                    <LabeledNum label="次数" value={ex.targetReps} onChange={(v) => updateExercise(i, { targetReps: v })} />
                    <LabeledNum label="组数" value={ex.targetSets} onChange={(v) => updateExercise(i, { targetSets: v })} />
                    <button onClick={() => prefillFromLast(i, ex.name)} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, borderRadius: 'var(--r-s)', background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', whiteSpace: 'nowrap', cursor: 'pointer' }}>上次</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rest default */}
        <div style={{ marginBottom: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>默认休息时长</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[60, 90, 120, 180].map(s => (
              <button key={s} onClick={() => setRestDefault(s)} style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 700, borderRadius: 99,
                border: '1px solid ' + (restDefault === s ? 'var(--c-blue)' : 'var(--border)'),
                background: restDefault === s ? 'var(--c-blue)' : 'var(--surface)',
                color: restDefault === s ? '#fff' : 'var(--text-2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>{s}s</button>
            ))}
          </div>
        </div>

        {/* Search */}
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索动作…"
          style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 'var(--r-m)', background: 'var(--surface)', color: 'var(--text-1)', marginBottom: 10, boxSizing: 'border-box' }}
        />

        {/* Categories */}
        {!search.trim() && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 12, paddingBottom: 4 }}>
            {Object.keys(EXERCISE_LIBRARY).map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                flexShrink: 0, padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 99,
                border: '1px solid ' + (category === c ? 'var(--c-blue)' : 'var(--border)'),
                background: category === c ? 'var(--c-blue)' : 'var(--surface)',
                color: category === c ? '#fff' : 'var(--text-2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>{c}</button>
            ))}
          </div>
        )}

        {/* Library chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {filtered.map(name => {
            const picked = exercises.some(e => e.name === name);
            return (
              <button key={name} onClick={() => addExercise(name)} disabled={picked} style={{
                padding: '8px 12px', fontSize: 12, fontWeight: 600, borderRadius: 99,
                border: '1px solid ' + (picked ? 'var(--c-blue)' : 'var(--border)'),
                background: picked ? 'var(--c-blue-dim)' : 'var(--surface)',
                color: picked ? 'var(--c-blue)' : 'var(--text-2)',
                opacity: picked ? 0.7 : 1, cursor: picked ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
                {picked ? '✓ ' : '+ '}{name}
              </button>
            );
          })}
        </div>

        {/* Custom entry */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          <input
            value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="自定义动作名称"
            style={{ flex: 1, padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 'var(--r-m)', background: 'var(--surface)', color: 'var(--text-1)', boxSizing: 'border-box' }}
          />
          <button onClick={() => { if (customName.trim()) { addExercise(customName.trim()); setCustomName(''); } }} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, borderRadius: 'var(--r-m)', background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>添加</button>
        </div>
      </div>

      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={onStart} disabled={!exercises.length} style={{
          width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, borderRadius: 'var(--r-l)',
          background: exercises.length ? 'var(--c-blue)' : 'var(--border)', color: '#fff', border: 'none',
          cursor: exercises.length ? 'pointer' : 'not-allowed', WebkitTapHighlightColor: 'transparent',
        }}>
          开始训练 {exercises.length > 0 && `· ${exercises.length} 项`}
        </button>
      </div>
    </div>
  );
};

const LabeledNum = ({ label, value, onChange, suffix }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-s)', padding: '6px 8px' }}>
      <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', outline: 'none', minWidth: 0 }} />
      {suffix && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{suffix}</span>}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// ExerciseLogView — big-button per-set logging
// ═══════════════════════════════════════════════════════════════
const ExerciseLogView = ({ exercise, pr, onLogSet, onUndoLast, onUpdate, onOpenPlate, onPrev, onNext, canPrev, isLast }) => {
  const last = exercise.sets.at(-1);
  const [weight, setWeight] = useState(() => String(last?.weight ?? exercise.targetWeight ?? ''));
  const [reps, setReps] = useState(() => String(last?.reps ?? exercise.targetReps ?? ''));
  const [rpe, setRpe] = useState(null);
  const targetSets = Number(exercise.targetSets) || 3;
  const done = exercise.sets.length;

  const bumpWeight = (d) => { buzz(); setWeight(w => String(Math.max(0, (Number(w) || 0) + d))); };
  const bumpReps = (d) => { buzz(); setReps(r => String(Math.max(0, (Number(r) || 0) + d))); };

  const submit = () => {
    const w = Number(weight) || 0, r = Number(reps) || 0;
    if (w <= 0 && r <= 0) return;
    onLogSet(w, r, rpe ?? undefined);
    setRpe(null);
  };

  return (
    <div style={{ flex: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{exercise.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
          目标 {exercise.targetWeight || '—'} kg × {exercise.targetReps || '—'} × {targetSets}
          {pr?.e1RM > 0 && <> · PR e1RM <span style={{ color: 'var(--c-purple)', fontWeight: 700 }}>{pr.e1RM}kg</span></>}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
        {Array.from({ length: Math.max(targetSets, done + 1) }).map((_, i) => (
          <div key={i} style={{
            width: i < done ? 22 : 8, height: 8, borderRadius: 99,
            background: i < done ? 'var(--c-blue)' : 'var(--border)',
            transition: 'width 0.2s',
          }} />
        ))}
      </div>

      {/* Big weight/reps */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <NumberPad label="重量" unit="kg" value={weight} setValue={setWeight} bump={bumpWeight} steps={[-2.5, +2.5]} />
        <NumberPad label="次数" value={reps} setValue={setReps} bump={bumpReps} steps={[-1, +1]} />
      </div>

      {/* RPE */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, textAlign: 'center' }}>RPE · 费力程度（可选）</div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {[6, 7, 8, 9, 10].map(n => (
            <button key={n} onClick={() => { buzz(); setRpe(rpe === n ? null : n); }} style={{
              width: 44, height: 44, borderRadius: 'var(--r-m)', fontSize: 14, fontWeight: 700,
              border: '1px solid ' + (rpe === n ? 'var(--c-orange)' : 'var(--border)'),
              background: rpe === n ? 'var(--c-orange)' : 'var(--surface)',
              color: rpe === n ? '#fff' : 'var(--text-2)', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}>{n}</button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button onClick={submit} style={{
        padding: '18px', fontSize: 17, fontWeight: 800, borderRadius: 'var(--r-l)',
        background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer',
        marginBottom: 10, WebkitTapHighlightColor: 'transparent', boxShadow: 'var(--shadow-l)',
      }}>完成此组</button>

      {/* Side actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={onOpenPlate} style={sideBtn}>🏋️ 配片</button>
        <button onClick={onUndoLast} disabled={!done} style={{ ...sideBtn, opacity: done ? 1 : 0.4 }}>↶ 撤销</button>
      </div>

      {/* Completed sets log */}
      {done > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>已完成 · {done} 组</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {exercise.sets.map((s, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-s)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>第 {i + 1} 组</div>
                <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {s.weight}kg × {s.reps}
                  {s.rpe ? <span style={{ fontSize: 10, color: 'var(--c-orange)', marginLeft: 6 }}>RPE{s.rpe}</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
        <button onClick={onPrev} disabled={!canPrev} style={{ ...sideBtn, opacity: canPrev ? 1 : 0.4, flex: 1 }}>← 上一项</button>
        <button onClick={onNext} style={{ ...sideBtn, flex: 1, background: 'var(--c-green-dim)', color: 'var(--c-green)', border: 'none' }}>{isLast ? '完成训练 →' : '下一项 →'}</button>
      </div>
    </div>
  );
};

const NumberPad = ({ label, unit, value, setValue, bump, steps }) => (
  <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}>{label}</div>
    <input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)}
      style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 32, fontWeight: 800, textAlign: 'center', color: 'var(--text-1)', outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
    {unit && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -4 }}>{unit}</div>}
    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
      {steps.map(s => (
        <button key={s} onClick={() => bump(s)} style={{
          flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 'var(--r-m)',
          border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>{s > 0 ? '+' : ''}{s}</button>
      ))}
    </div>
  </div>
);

const sideBtn = {
  flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--r-m)',
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)',
  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
};

const headerBtn = {
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', color: 'var(--text-2)', fontSize: 18, cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent', borderRadius: 'var(--r-m)',
};

// ═══════════════════════════════════════════════════════════════
// Rest Overlay
// ═══════════════════════════════════════════════════════════════
const RestOverlay = ({ remaining, duration, onSkip, onAdjust }) => {
  const pct = Math.max(0, Math.min(1, remaining / duration));
  const overtime = remaining <= 0;
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, background: 'var(--surface)',
      borderTop: '1px solid var(--border)', padding: '14px 16px calc(14px + env(safe-area-inset-bottom))',
      boxShadow: '0 -8px 32px rgba(0,0,0,0.12)', zIndex: 30,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.1em' }}>休息中</div>
        <button onClick={onSkip} style={{ background: 'transparent', border: 'none', color: 'var(--c-blue)', fontSize: 13, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>跳过</button>
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center', color: overtime ? 'var(--c-green)' : 'var(--text-1)', fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
        {overtime ? '+' : ''}{Math.abs(remaining)}s
      </div>
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${pct * 100}%`, background: overtime ? 'var(--c-green)' : 'var(--c-blue)', transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {[-30, -15, +15, +30].map(d => (
          <button key={d} onClick={() => onAdjust(d)} style={{
            padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 99,
            border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-2)',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>{d > 0 ? '+' : ''}{d}s</button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Plate Calculator Sheet
// ═══════════════════════════════════════════════════════════════
const PlateCalcSheet = ({ target, barKg, setBarKg, onClose }) => {
  const [w, setW] = useState(String(target || ''));
  const kg = Number(w) || 0;
  const plates = platesPerSide(kg, barKg);
  const sum = plates.reduce((a, b) => a + b, 0) * 2 + barKg;
  const isExact = Math.abs(sum - kg) < 0.01;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60,
      display: 'flex', alignItems: 'flex-end', touchAction: 'none',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--surface)', width: '100%', borderTopLeftRadius: 'var(--r-xl)', borderTopRightRadius: 'var(--r-xl)',
        padding: '16px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight: '80dvh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 14px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>杠铃配片</div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>目标重量</div>
            <input type="number" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 18, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 'var(--r-m)', background: 'var(--bg)', color: 'var(--text-1)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>杠铃杆</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {BAR_WEIGHTS.map(b => (
                <button key={b} onClick={() => setBarKg(b)} style={{
                  flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, borderRadius: 'var(--r-m)',
                  border: '1px solid ' + (barKg === b ? 'var(--c-blue)' : 'var(--border)'),
                  background: barKg === b ? 'var(--c-blue)' : 'var(--bg)', color: barKg === b ? '#fff' : 'var(--text-2)',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}>{b === 0 ? '无' : b}</button>
              ))}
            </div>
          </div>
        </div>

        {plates.length > 0 ? (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textAlign: 'center' }}>每侧放：</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 14, flexWrap: 'wrap' }}>
              {plates.map((p, i) => (
                <div key={i} style={{
                  padding: '10px 6px', minWidth: 38, textAlign: 'center', fontSize: 13, fontWeight: 800,
                  background: plateColor(p), color: '#fff', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}>{p}</div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: isExact ? 'var(--c-green)' : 'var(--c-orange)', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
              {isExact ? `✓ 合计 ${sum}kg` : `实际 ${sum}kg（差 ${(kg - sum).toFixed(2)}kg）`}
            </div>
          </>
        ) : kg > 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>
            {kg <= barKg ? '仅需空杆' : '无法用常规片凑齐'}
          </div>
        ) : null}

        <button onClick={onClose} style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 700, borderRadius: 'var(--r-l)', background: 'var(--bg)', color: 'var(--text-1)', border: '1px solid var(--border)', cursor: 'pointer', marginTop: 8 }}>关闭</button>
      </div>
    </div>
  );
};

const plateColor = (p) => {
  if (p >= 25) return '#6a8b85';
  if (p >= 20) return '#7e7a98';
  if (p >= 15) return '#b8845a';
  if (p >= 10) return '#8a9d96';
  if (p >= 5) return '#a08a7e';
  if (p >= 2.5) return '#9d9d9d';
  return '#b0b0b0';
};

// ═══════════════════════════════════════════════════════════════
// Finish View
// ═══════════════════════════════════════════════════════════════
const FinishView = ({ frame, exercises, elapsed, onConfirm, onBack }) => {
  const done = exercises.filter(e => e.sets.length > 0);
  const totalSets = done.reduce((a, e) => a + e.sets.length, 0);
  const totalVol = done.reduce((a, e) => a + e.sets.reduce((s, x) => s + (x.weight || 0) * (x.reps || 0), 0), 0);
  return (
    <div style={frame}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack} style={headerBtn}>←</button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>训练总结</div>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ padding: 16, flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ background: 'linear-gradient(135deg, #6a8b85 0%, #8a9d96 100%)', color: '#fff', borderRadius: 'var(--r-xl)', padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4, letterSpacing: '0.1em' }}>TOTAL</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>{totalVol.toLocaleString()} kg</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{done.length} 个动作 · {totalSets} 组 · {fmtDuration(elapsed)}</div>
        </div>
        {done.map((ex, i) => {
          const vol = ex.sets.reduce((s, x) => s + (x.weight || 0) * (x.reps || 0), 0);
          const best = ex.sets.reduce((a, b) => (e1RM(b.weight, b.reps) > e1RM(a.weight, a.reps) ? b : a), ex.sets[0]);
          return (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: 14, marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{ex.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {ex.sets.length} 组 · {vol.toLocaleString()} kg · 最佳 {best.weight}×{best.reps}
              </div>
            </div>
          );
        })}
        {!done.length && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>没有记录到有效组数</div>
        )}
      </div>
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)' }}>
        <button onClick={onConfirm} style={{ width: '100%', padding: 16, fontSize: 16, fontWeight: 800, borderRadius: 'var(--r-l)', background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          {done.length ? '保存训练' : '返回'}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PR Burst + Exit Sheet
// ═══════════════════════════════════════════════════════════════
const PRBurst = ({ exercise, weight, reps, e1rm }) => (
  <div style={{
    position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 70,
    background: 'linear-gradient(135deg, #b8845a 0%, #8a9d96 100%)', color: '#fff',
    padding: '14px 22px', borderRadius: 'var(--r-xl)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    textAlign: 'center', minWidth: 240, animation: 'prBurst 0.4s ease-out',
  }}>
    <div style={{ fontSize: 22, marginBottom: 4 }}>🏆</div>
    <div style={{ fontSize: 11, opacity: 0.85, letterSpacing: '0.1em', marginBottom: 4 }}>NEW PR</div>
    <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{exercise}</div>
    <div style={{ fontSize: 12, opacity: 0.9 }}>{weight}kg × {reps} · e1RM {e1rm}kg</div>
  </div>
);

const ExitSheet = ({ onKeep, onAbandon }) => (
  <div onClick={onKeep} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 80, display: 'flex', alignItems: 'flex-end', touchAction: 'none' }}>
    <div onClick={(e) => e.stopPropagation()} style={{
      background: 'var(--surface)', width: '100%', borderTopLeftRadius: 'var(--r-xl)', borderTopRightRadius: 'var(--r-xl)',
      padding: '20px 16px calc(20px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 99, margin: '0 auto 14px' }} />
      <div style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>退出训练？</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 16 }}>当前进度已保存为草稿，可随时恢复。</div>
      <button onClick={onKeep} style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 700, borderRadius: 'var(--r-l)', background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: 8 }}>继续训练</button>
      <button onClick={onAbandon} style={{ width: '100%', padding: 14, fontSize: 14, fontWeight: 600, borderRadius: 'var(--r-l)', background: 'var(--bg)', color: 'var(--c-red)', border: '1px solid var(--border)', cursor: 'pointer' }}>放弃本次训练</button>
    </div>
  </div>
);

const fmtDuration = (s) => {
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

export default ActiveSession;
