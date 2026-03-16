import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';

// ─── 动作库 ────────────────────────────────────────────────────────────────────
const EXERCISE_LIBRARY = {
  '胸部': ['杠铃卧推','哑铃卧推','上斜杠铃卧推','上斜哑铃推举','下斜杠铃卧推','哑铃飞鸟','上斜哑铃飞鸟','绳索夹胸','绳索飞鸟','俯卧撑','宽距俯卧撑','钻石俯卧撑','双杠臂屈伸（胸）','史密斯卧推'],
  '背部': ['引体向上','高位下拉','杠铃划船','坐姿划船','T型划船','单臂哑铃划船','硬拉','直腿硬拉','绳索直臂下压','俯身飞鸟','反握引体向上','宽握引体向上','绳索划船','杠铃耸肩'],
  '腿部': ['深蹲','前蹲','腿举','哈克深蹲','罗马尼亚硬拉','腿屈伸','腿弯举','提踵（坐姿）','提踵（立姿）','保加利亚分腿蹲','弓步蹲','相扑深蹲','壶铃深蹲','史密斯深蹲','臀桥'],
  '肩部': ['杠铃推举','哑铃肩推','阿诺德推举','哑铃侧平举','哑铃前平举','绳索面拉','杠铃直立划船','绳索侧平举','俯身哑铃飞鸟','单臂绳索侧平举'],
  '手臂': ['杠铃弯举','哑铃弯举','锤式弯举','绳索弯举','上斜哑铃弯举','三头绳索下压','仰卧臂屈伸','窄距卧推','双杠臂屈伸（三头）','哑铃过头臂屈伸','绳索过头伸展','反握弯举'],
  '核心': ['卷腹','仰卧起坐','平板支撑','侧平板','悬垂举腿','俄罗斯挺身','山地爬行','自行车卷腹','反向卷腹','直腿上举','绳索卷腹','木桩式转体','V字起坐'],
  '臀部': ['臀桥','负重臀桥','深蹲（臀向后）','罗马尼亚硬拉','保加利亚分腿蹲','蚌式训练','侧卧蚌式','绳索臀部后踢','站姿臀部外展'],
  '有氧': ['跑步','快走','椭圆机','动感单车','划船机','跳绳','游泳','爬楼梯','HIIT','跳箱','战绳','开合跳','波比跳'],
};

const EXERCISE_TAGS = {
  '卧推': ['胸部','推','胸'], '飞鸟': ['胸部','夹','飞'], '俯卧撑': ['胸部','自重'],
  '引体': ['背部','自重','拉'], '下拉': ['背部','拉'], '划船': ['背部','拉'],
  '硬拉': ['背部','腿部','拉','臀部'], '深蹲': ['腿部','蹲'], '腿举': ['腿部','腿'],
  '推举': ['肩部','推'], '侧平举': ['肩部','举'], '弯举': ['手臂','二头'],
  '臂屈伸': ['手臂','三头'], '卷腹': ['核心','腹'], '平板': ['核心','支撑'],
  '臀桥': ['臀部','臀'], '跑步': ['有氧','跑'], '跳绳': ['有氧','跳'],
};

const semanticSearch = (query) => {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results = [];
  Object.entries(EXERCISE_LIBRARY).forEach(([cat, exercises]) => {
    exercises.forEach(ex => {
      if (ex.includes(q)) results.push({ exercise: ex, category: cat, score: 100 });
    });
  });
  Object.entries(EXERCISE_TAGS).forEach(([tag, keywords]) => {
    if (q.includes(tag) || keywords.some(k => q.includes(k))) {
      const cat = Object.entries(EXERCISE_LIBRARY).find(([_, exs]) => exs.some(ex => keywords.some(k => ex.includes(k))))?.[0];
      if (cat) {
        EXERCISE_LIBRARY[cat].forEach(ex => {
          if (keywords.some(k => ex.includes(k)) && !results.find(r => r.exercise === ex)) {
            results.push({ exercise: ex, category: cat, score: 80 });
          }
        });
      }
    }
  });
  Object.entries(EXERCISE_LIBRARY).forEach(([cat, exercises]) => {
    exercises.forEach(ex => {
      let sim = 0;
      for (let i = 0; i < Math.min(q.length, ex.length); i++) { if (q[i] === ex[i]) sim++; }
      const score = (sim / Math.max(q.length, ex.length)) * 60;
      if (score > 0.5 && !results.find(r => r.exercise === ex)) results.push({ exercise: ex, category: cat, score });
    });
  });
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
};

const isCardioExercise = (ex, cat) => {
  if (cat === '有氧') return true;
  if (cat === 'Custom') return ['跑','骑','椭圆','划船','跳绳','有氧','游泳','HIIT','爬楼'].some(k => ex.includes(k));
  return false;
};

// ─── 格式化时间 ────────────────────────────────────────────────────────────────
const fmt = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
const fmtShort = s => s < 60 ? `${s}s` : `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

// ─── 每组计时 Hook ─────────────────────────────────────────────────────────────
const useSetTimer = () => {
  const [time, setTime]       = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const ref = useRef(null);

  const start = useCallback(() => {
    setTime(0); setRunning(true); setDone(false);
  }, []);
  const stop = useCallback((finalTime) => {
    setRunning(false); setDone(true);
    if (finalTime !== undefined) setTime(finalTime);
  }, []);
  const reset = useCallback(() => {
    setTime(0); setRunning(false); setDone(false);
  }, []);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      clearInterval(ref.current);
    }
    return () => clearInterval(ref.current);
  }, [running]);

  return { time, running, done, start, stop, reset };
};

// ─── 单组行（含每组计时）──────────────────────────────────────────────────────
const SetRow = ({ set, index, isCardio, isBodyweight, onChange, onRemove, onComplete, isDone, onToggleBodyweight }) => {
  const timer = useSetTimer();

  // 完成组：停止计时并回调
  const handleComplete = () => {
    const elapsed = timer.running ? timer.time : 0;
    timer.stop(elapsed);
    onComplete(index, elapsed);
  };

  return (
    <div style={{
      background: isDone ? 'rgba(52,199,89,0.05)' : 'var(--surface)',
      border: `1.5px solid ${isDone ? 'rgba(52,199,89,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--r-l)',
      padding: '12px 14px',
      transition: 'all 0.25s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* 顶行：组号 + 计时器 + 完成/✓ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* 组号 */}
        <div style={{
          width: 28, height: 28, borderRadius: 99, flexShrink: 0,
          background: isDone ? 'var(--c-green)' : 'var(--surface-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: isDone ? '#fff' : 'var(--text-3)',
          transition: 'all 0.2s',
        }}>{isDone ? '✓' : index + 1}</div>

        {/* 计时器区域（力量组，未完成时显示） */}
        {!isCardio && (
          <div style={{ flex: 1 }}>
            {isDone ? (
              /* 已完成：显示本组用时 */
              set.setDuration > 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  本组用时 {fmtShort(set.setDuration)}
                </span>
              )
            ) : (
              /* 未完成：显示计时控制 */
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!timer.running && !timer.done ? (
                  <button
                    type="button"
                    onClick={timer.start}
                    style={{
                      background: 'var(--c-blue-dim)', color: 'var(--c-blue)',
                      border: 'none', borderRadius: 99, padding: '5px 12px',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >▶ 开始本组</button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                      color: timer.running ? 'var(--c-blue)' : 'var(--text-3)',
                      minWidth: 44,
                      animation: timer.running ? 'pulse-text 1s infinite' : 'none',
                    }}>
                      {fmt(timer.time)}
                    </div>
                    {timer.running && (
                      <button
                        type="button"
                        onClick={() => timer.stop(timer.time)}
                        style={{ background: 'var(--surface-3)', border: 'none', borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-3)' }}
                      >暂停</button>
                    )}
                    {timer.done && !timer.running && (
                      <button
                        type="button"
                        onClick={timer.start}
                        style={{ background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', borderRadius: 99, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >继续</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 完成按钮 / 已完成标志 */}
        {!isDone ? (
          <button
            type="button"
            onClick={handleComplete}
            style={{
              background: 'var(--c-blue)', color: '#fff', border: 'none',
              borderRadius: 99, padding: '7px 16px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
            }}
          >完成</button>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--c-green)', fontWeight: 700, flexShrink: 0 }}>已完成</div>
        )}

        {/* 删除按钮 */}
        {!isDone && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 18, padding: '0 4px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
          >×</button>
        )}
      </div>

      {/* 输入行 */}
      {!isDone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 重量/时长 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isBodyweight ? (
              <div
                onClick={() => onToggleBodyweight?.(index)}
                style={{
                  width: '100%', textAlign: 'center', background: 'var(--c-blue-dim)',
                  color: 'var(--c-blue)', fontWeight: 700, fontSize: 20, borderRadius: 10,
                  padding: '10px 8px', cursor: 'pointer', border: '1px solid rgba(0,113,227,0.2)',
                }}
              >自重</div>
            ) : (
              <input
                type="number"
                inputMode="decimal"
                value={set.weight === 0 || set.weight === '' ? '' : set.weight}
                onChange={e => onChange(index, 'weight', e.target.value)}
                placeholder="0"
                disabled={isDone}
                step={isCardio ? '1' : '0.5'}
                style={{
                  width: '100%', fontSize: 24, fontWeight: 700, textAlign: 'center',
                  border: 'none', background: 'var(--surface-3)', borderRadius: 10,
                  padding: '10px 6px', color: 'var(--text-1)', outline: 'none',
                  margin: 0, MozAppearance: 'textfield',
                }}
              />
            )}
            <span style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isCardio ? '分钟' : isBodyweight ? '自重' : 'kg'}
            </span>
          </div>

          {!isBodyweight && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
              <button type="button" onClick={() => onChange(index, 'weight', Math.max(0, (parseFloat(set.weight) || 0) + (isCardio ? 5 : 2.5)))}
                style={{ width: 36, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--c-blue)', padding: 0 }}>
                {isCardio ? '+5' : '+'}
              </button>
              <button type="button" onClick={() => onChange(index, 'weight', Math.max(0, (parseFloat(set.weight) || 0) - (isCardio ? 5 : 2.5)))}
                style={{ width: 36, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>
                {isCardio ? '-5' : '-'}
              </button>
            </div>
          )}

          {!isCardio && (
            <>
              <div style={{ color: 'var(--text-4)', fontSize: 18, fontWeight: 300, flexShrink: 0 }}>×</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.reps === '' ? '' : set.reps}
                  onChange={e => onChange(index, 'reps', e.target.value)}
                  placeholder="0"
                  disabled={isDone}
                  step="1"
                  style={{
                    width: '100%', fontSize: 24, fontWeight: 700, textAlign: 'center',
                    border: 'none', background: 'var(--surface-3)', borderRadius: 10,
                    padding: '10px 6px', color: 'var(--text-1)', outline: 'none',
                    margin: 0, MozAppearance: 'textfield',
                  }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>次</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                <button type="button" onClick={() => onChange(index, 'reps', (parseInt(set.reps) || 0) + 1)}
                  style={{ width: 36, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.25)', cursor: 'pointer', color: 'var(--c-green)', padding: 0 }}>+</button>
                <button type="button" onClick={() => onChange(index, 'reps', Math.max(0, (parseInt(set.reps) || 0) - 1))}
                  style={{ width: 36, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 800, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>-</button>
              </div>
            </>
          )}

          {/* 自重切换 */}
          {!isCardio && (
            <button
              type="button"
              onClick={() => onToggleBodyweight?.(index)}
              title={isBodyweight ? '切换到负重' : '切换到自重'}
              style={{
                width: 32, height: 32, borderRadius: 8, fontSize: 15, flexShrink: 0,
                background: isBodyweight ? 'var(--c-blue-dim)' : 'var(--surface-3)',
                border: `1px solid ${isBodyweight ? 'rgba(0,113,227,0.2)' : 'var(--border)'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{isBodyweight ? '🏋️' : '⚖️'}</button>
          )}
        </div>
      )}

      {/* 已完成时，显示记录摘要 */}
      {isDone && (
        <div style={{ display: 'flex', gap: 12, fontSize: 14, paddingLeft: 38 }}>
          <span style={{ fontWeight: 700 }}>
            {isCardio
              ? `${set.weight} 分钟`
              : isBodyweight
              ? `自重 × ${set.reps} 次`
              : `${set.weight} kg × ${set.reps} 次`}
          </span>
          {set.setDuration > 0 && (
            <span style={{ color: 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {fmtShort(set.setDuration)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── 有氧计时器组件 ────────────────────────────────────────────────────────────
const CardioTimer = ({ onFinish }) => {
  const [time, setTime]       = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running) { ref.current = setInterval(() => setTime(t => t + 1), 1000); }
    else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running]);

  const mins = Math.floor(time / 60);
  const secs = time % 60;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-xl)',
      padding: '20px',
      marginBottom: 16,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        有氧计时
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 800,
        letterSpacing: '0.02em', color: running ? 'var(--c-blue)' : 'var(--text-1)',
        lineHeight: 1, marginBottom: 20,
        fontVariantNumeric: 'tabular-nums',
        transition: 'color 0.3s',
      }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {!running ? (
          <button
            onClick={() => setRunning(true)}
            style={{ background: 'var(--c-blue)', color: '#fff', border: 'none', borderRadius: 99, padding: '11px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            {time === 0 ? '▶ 开始' : '▶ 继续'}
          </button>
        ) : (
          <button
            onClick={() => setRunning(false)}
            style={{ background: 'var(--c-orange)', color: '#fff', border: 'none', borderRadius: 99, padding: '11px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >⏸ 暂停</button>
        )}
        {time > 0 && (
          <button
            onClick={() => { setRunning(false); onFinish(mins); }}
            style={{ background: 'var(--c-green)', color: '#fff', border: 'none', borderRadius: 99, padding: '11px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >✓ 完成 {mins > 0 ? `(${mins}分钟)` : ''}</button>
        )}
      </div>
    </div>
  );
};

// ─── 智能建议卡片 ──────────────────────────────────────────────────────────────
const SuggestionCard = ({ suggestion, lastRecord, onApply, onApplyLastRecord, energyLevel }) => {
  if (!suggestion && !lastRecord) return null;

  const adjustedWeight = suggestion
    ? energyLevel <= 2
      ? Math.round(suggestion.suggestedWeight * 0.85 * 2) / 2
      : energyLevel >= 4
      ? Math.round(suggestion.suggestedWeight * 1.05 * 2) / 2
      : suggestion.suggestedWeight
    : null;

  const best = lastRecord?.sets?.[0];

  return (
    <div
      onClick={() => suggestion ? onApply() : onApplyLastRecord()}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(135deg, rgba(94,92,230,0.07) 0%, rgba(0,113,227,0.05) 100%)',
        border: '1px solid rgba(94,92,230,0.18)',
        borderRadius: 'var(--r-l)', padding: '12px 14px', marginBottom: 14,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 22, flexShrink: 0 }}>📊</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-purple)', marginBottom: 2 }}>
          {suggestion?.isBreakthrough ? '突破机会' : '参考记录'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 3 }}>
          {suggestion?.reason || (best ? `上次: ${best.weight === 0 ? '自重' : `${best.weight}kg`} × ${best.reps}次` : '')}
        </div>
        {suggestion ? (
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
            目标 {adjustedWeight === 0 ? '自重' : `${adjustedWeight}kg`} × {suggestion.suggestedReps}次
          </div>
        ) : best && (
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
            参考 {best.weight === 0 ? '自重' : `${best.weight}kg`} × {best.reps}次
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-purple)', background: 'rgba(94,92,230,0.1)', padding: '5px 10px', borderRadius: 8, flexShrink: 0 }}>
        应用
      </div>
    </div>
  );
};

// ─── 训练完成分享卡片（结算界面） ─────────────────────────────────────────────
const WorkoutSummary = ({ records, duration, calories, onDone }) => {
  const totalVol = records
    .filter(r => r.type !== 'cardio')
    .reduce((a, r) => a + r.sets.reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
  const totalSets  = records.reduce((a, r) => a + r.sets.length, 0);
  const totalCal   = calories?.total || 0;
  const mins       = Math.floor(duration / 60);
  const dateStr    = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr    = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  // 计算圆环进度（相对于目标值）
  const calPct  = Math.min(1, totalCal / 500);
  const timePct = Math.min(1, mins / 60);
  const circumference = 2 * Math.PI * 42;

  const RingCircle = ({ pct, color, val, unit }) => (
    <div style={{ width: 100, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${circumference * pct} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>{val}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{unit}</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 60px', minHeight: '80vh' }}>
      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: 20, animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ width: 64, height: 64, background: 'var(--c-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(52,199,89,0.35)' }}>✓</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>训练完成</div>
      </div>

      {/* 分享卡片 */}
      <div id="share-card" style={{
        background: '#141416',
        width: '100%',
        maxWidth: 390,
        borderRadius: 32,
        padding: '28px 24px 24px',
        color: '#fff',
        boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 装饰背景光 */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 260, height: 260, background: 'radial-gradient(circle, rgba(52,199,89,0.15) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 200, height: 200, background: 'radial-gradient(circle, rgba(0,113,227,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* 日期时间 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            {dateStr} · {timeStr}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            完成训练<span style={{ color: '#32d74b' }}>.</span>
          </div>
        </div>

        {/* 圆环数据 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
          <RingCircle pct={calPct}  color="#ff453a" val={totalCal} unit="千卡" />
          <RingCircle pct={timePct} color="#32d74b" val={mins}     unit="分钟" />
          {totalVol > 0 && (
            <RingCircle pct={Math.min(1, totalVol / 10000)} color="#0a84ff" val={`${(totalVol/1000).toFixed(1)}`} unit="吨" />
          )}
        </div>

        {/* 数据格 */}
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '14px 8px', marginBottom: 20,
        }}>
          {[
            { val: totalSets, label: '组数' },
            { val: records.length, label: '动作' },
            { val: `${mins}m`, label: '时长' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>{val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* 动作列表 */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16 }}>
          {records.slice(0, 5).map((r, i) => {
            const bestSet = r.sets.reduce((best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best), r.sets[0] || {});
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < Math.min(records.length, 5) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{r.exercise}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  {r.type === 'cardio'
                    ? `${r.sets.reduce((a, s) => a + (parseFloat(s.weight) || 0), 0)}分钟`
                    : `${r.sets.length}组 · ${bestSet.weight === 0 ? '自重' : `${bestSet.weight}kg`}`}
                </span>
              </div>
            );
          })}
          {records.length > 5 && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingTop: 10 }}>
              +{records.length - 5} 个动作
            </div>
          )}
        </div>

        {/* 水印 */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>IRON · 健身日记</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)' }}>截图分享</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ width: '100%', maxWidth: 390, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onDone}
          style={{ width: '100%', padding: '15px', fontSize: 16, fontWeight: 700, borderRadius: 'var(--r-xl)', background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '-0.01em' }}
        >
          回到主页
        </button>
        <button
          className="secondary"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'IRON 健身日记', text: `今天完成了训练！${records.length}个动作，${totalSets}组，消耗${totalCal}千卡。` });
            } else {
              alert('截图保存此卡片即可分享');
            }
          }}
          style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 600, borderRadius: 'var(--r-xl)' }}
        >
          分享成就
        </button>
      </div>
    </div>
  );
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────
const AddWorkout = () => {
  const { token } = useContext(AuthContext);
  const navigate  = useNavigate();
  const location  = useLocation();
  const templateData = location.state?.template;

  // 总计时
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const [phase, setPhase]           = useState(templateData ? 'log' : 'select');
  const [date, setDate]             = useState(new Date().toISOString().split('T')[0]);
  const [exercise, setExercise]     = useState(templateData?.exercises?.[0]?.exercise || '');
  const [exerciseType, setExerciseType] = useState(templateData?.exercises?.[0]?.type || 'strength');
  const [sets, setSets]             = useState(
    templateData?.exercises?.[0]?.sets?.length
      ? templateData.exercises[0].sets.map(s => ({ weight: s.weight, reps: s.reps, done: false, setDuration: 0 }))
      : [{ weight: '', reps: '', done: false, setDuration: 0 }]
  );
  const [notes, setNotes]           = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [activeCategory, setActiveCategory] = useState('胸部');
  const [searchText, setSearchText] = useState('');
  const [templateQueue, setTemplateQueue]   = useState(templateData ? templateData.exercises.slice(1) : []);
  const [completedExercises, setCompletedExercises] = useState([]);
  const [lastRecord, setLastRecord] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [calories, setCalories]     = useState(null);
  const [energyLevel, setEnergyLevel] = useState(3);

  // 休息计时器
  const [restTime, setRestTime]     = useState(0);
  const [restActive, setRestActive] = useState(false);
  useEffect(() => {
    let id = null;
    if (restActive && restTime > 0) id = setInterval(() => setRestTime(p => p - 1), 1000);
    else if (restTime <= 0 && restActive) { setRestActive(false); window.navigator?.vibrate?.(500); }
    return () => clearInterval(id);
  }, [restActive, restTime]);

  const isCardio = exerciseType === 'cardio';

  const getRestTime = () => {
    const base = { '胸部': 90, '背部': 120, '腿部': 180, '肩部': 90, '手臂': 60, '核心': 60, '臀部': 120, '有氧': 0 };
    const mult = energyLevel <= 2 ? 1.3 : energyLevel >= 4 ? 0.8 : 1;
    const cat = Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(exercise)) || '胸部';
    return Math.round((base[cat] || 90) * mult);
  };

  const semanticSearchResults = searchText.trim() ? semanticSearch(searchText.trim()) : [];
  const filteredExercises = searchText.trim()
    ? semanticSearchResults.map(r => r.exercise)
    : (EXERCISE_LIBRARY[activeCategory] || []);

  const loadExerciseData = async (ex, cardio) => {
    setIsLoading(true);
    setSuggestion(null); setLastRecord(null);
    if (cardio) {
      const defaults = { '跑步': 30, '快走': 30, '动感单车': 45, '跳绳': 20, '游泳': 30, 'HIIT': 20, '椭圆机': 30, '划船机': 30 };
      setSets([{ weight: defaults[ex] || 30, reps: 0, done: false, setDuration: 0 }]);
      setIsLoading(false);
      return;
    }
    try {
      const [lastRes, sugRes] = await Promise.all([
        fetch(`${API_URL}/api/workouts/last/${encodeURIComponent(ex)}`, { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/suggest/${encodeURIComponent(ex)}`, { headers: { 'x-auth-token': token } }),
      ]);
      if (lastRes.ok) {
        const last = await lastRes.json();
        setLastRecord(last);
        if (last?.sets?.length) setSets(last.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false, setDuration: 0 })));
        else setSets([{ weight: '', reps: '', done: false, setDuration: 0 }]);
      } else setSets([{ weight: '', reps: '', done: false, setDuration: 0 }]);
      if (sugRes.ok) setSuggestion(await sugRes.json());
    } catch {
      setSets([{ weight: '', reps: '', done: false, setDuration: 0 }]);
    }
    setIsLoading(false);
  };

  const handleExerciseSelect = async (ex, cat) => {
    setExercise(ex);
    const resolvedCat = cat || Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(ex)) || activeCategory;
    const cardio = isCardioExercise(ex, resolvedCat);
    setExerciseType(cardio ? 'cardio' : 'strength');
    setNotes(''); setSearchText('');
    await loadExerciseData(ex, cardio);
    setPhase('log');
  };

  const handleSetChange = (i, field, val) => {
    const ns = [...sets]; ns[i] = { ...ns[i], [field]: val }; setSets(ns);
  };

  const handleSetComplete = (i, elapsed) => {
    const ns = [...sets];
    ns[i] = { ...ns[i], done: true, setDuration: elapsed || 0 };
    setSets(ns);
    // 自动启动休息计时
    const rec = getRestTime();
    if (rec > 0) { setRestTime(rec); setRestActive(true); }
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets([...sets, { weight: last?.weight || '', reps: last?.reps || '', done: false, setDuration: 0 }]);
  };

  const removeSet = (i) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, j) => j !== i));
  };

  const handleToggleBodyweight = (i) => {
    const ns = [...sets]; const cur = ns[i];
    ns[i] = { ...cur, weight: (cur.weight === 0 || cur.weight === '0') ? '' : 0 };
    setSets(ns);
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    const w = energyLevel <= 2 ? Math.round(suggestion.suggestedWeight * 0.85 * 2) / 2
            : energyLevel >= 4 ? Math.round(suggestion.suggestedWeight * 1.05 * 2) / 2
            : suggestion.suggestedWeight;
    setSets(sets.map(s => ({ ...s, weight: w, reps: suggestion.suggestedReps })));
  };
  const applyLastRecord = () => {
    if (!lastRecord?.sets?.length) return;
    setSets(lastRecord.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false, setDuration: 0 })));
  };

  const getValidSets = () => sets
    .map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0, setDuration: s.setDuration || 0 }))
    .filter(s => isCardio ? s.weight > 0 : s.reps > 0);

  const handleFinishExercise = async () => {
    const validSets = getValidSets();
    if (!validSets.length) { alert('请至少完成一组有效数据'); return; }
    const record = { date, exercise, type: exerciseType, sets: validSets, notes };
    const newCompleted = [...completedExercises, record];
    setCompletedExercises(newCompleted);

    if (templateQueue.length > 0) {
      const next = templateQueue[0];
      setTemplateQueue(templateQueue.slice(1));
      setExercise(next.exercise);
      setExerciseType(next.type || 'strength');
      setNotes('');
      await loadExerciseData(next.exercise, next.type === 'cardio');
    } else {
      setPhase('between');
    }
  };

  const handleEndWorkout = async (completed = completedExercises) => {
    try {
      await Promise.all(completed.map(r =>
        fetch(`${API_URL}/api/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify(r),
        })
      ));
      setCalories(calcCaloriesLocal(completed));
      setPhase('summary');
    } catch { alert('提交失败，请重试'); }
  };

  const calcCaloriesLocal = (exercises) => {
    const MET = { '跑步': 11, '跳绳': 12, '游泳': 8, '爬楼梯': 9, 'HIIT': 11, '动感单车': 8.5, '划船机': 7, '椭圆机': 5, '快走': 5.5, '深蹲': 5.5, '硬拉': 6, '卧推': 4.5, '划船': 4.5, '推举': 4.5 };
    let total = 0;
    const results = exercises.map(ex => {
      const met = MET[ex.exercise] || 5;
      const duration = ex.type === 'cardio' ? ex.sets.reduce((a, s) => a + (s.weight || 0), 0) : ex.sets.length * 2.5;
      const cal = Math.round(met * 70 * (duration / 60));
      total += cal;
      return { exercise: ex.exercise, type: ex.type, sets: ex.sets.length, calories: cal };
    });
    return { results, total };
  };

  const handleAddMore = () => {
    setPhase('select'); setSets([{ weight: '', reps: '', done: false, setDuration: 0 }]);
    setNotes(''); setExercise(''); setSuggestion(null); setLastRecord(null);
  };

  const handleCopyLastSession = async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/copy-last-session`, { method: 'POST', headers: { 'x-auth-token': token } });
      if (!res.ok) { alert('没有找到上次训练记录'); return; }
      const data = await res.json();
      if (!window.confirm(`复制 ${new Date(data.date).toLocaleDateString('zh-CN')} 的训练？共 ${data.exercises.length} 个动作`)) return;
      const first = data.exercises[0];
      setExercise(first.exercise); setExerciseType(first.type || 'strength');
      setSets(first.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false, setDuration: 0 })));
      setTemplateQueue(data.exercises.slice(1));
      await loadExerciseData(first.exercise, first.type === 'cardio');
      setPhase('log');
    } catch { alert('获取失败，请重试'); }
  };

  const totalExercises = completedExercises.length + 1 + templateQueue.length;
  const currentIdx = completedExercises.length;

  // ══ 结算页 ══
  if (phase === 'summary') {
    return (
      <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto' }}>
        <WorkoutSummary records={completedExercises} duration={elapsed} calories={calories} onDone={() => navigate('/')} />
      </div>
    );
  }

  // ══ 动作间隔页 ══
  if (phase === 'between') {
    const lastEx = completedExercises[completedExercises.length - 1];
    return (
      <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, background: 'var(--c-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(52,199,89,0.3)', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>{lastEx?.exercise}</div>
          <div style={{ fontSize: 14, color: 'var(--text-3)' }}>{lastEx?.sets.length} 组已完成</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          <button onClick={handleAddMore} style={{ fontSize: 16, padding: '15px', borderRadius: 'var(--r-xl)', fontWeight: 700 }}>
            + 继续下一个动作
          </button>
          <button
            className="secondary"
            onClick={() => handleEndWorkout()}
            style={{ fontSize: 16, padding: '15px', borderRadius: 'var(--r-xl)', fontWeight: 700, background: 'var(--c-green-dim)', color: '#1a7a35' }}
          >
            结束本次训练
          </button>
        </div>

        {completedExercises.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: '16px 18px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>已完成</div>
            {completedExercises.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < completedExercises.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>{r.exercise}</span>
                <span style={{ color: 'var(--text-3)' }}>{r.sets.length} 组</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ══ 选择动作 ══
  if (phase === 'select') {
    return (
      <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto', padding: '20px 20px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {completedExercises.length > 0 ? `第 ${completedExercises.length + 1} 个动作` : '选择动作'}
          </span>
          <button className="secondary"
            onClick={() => completedExercises.length > 0 ? handleEndWorkout() : navigate('/')}
            style={{ padding: '8px 16px', fontSize: 13, borderRadius: 99 }}
          >{completedExercises.length > 0 ? '结束训练' : '取消'}</button>
        </div>

        {completedExercises.length === 0 && (
          <div
            onClick={handleCopyLastSession}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(135deg, var(--c-green-dim) 0%, var(--c-blue-dim) 100%)',
              border: '1px solid rgba(52,199,89,0.25)',
              borderRadius: 'var(--r-l)', padding: '14px 18px',
              cursor: 'pointer', marginBottom: 16, fontWeight: 600, fontSize: 15,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 20 }}>⚡</span>
            <span>一键复制上次训练</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-4)' }}>→</span>
          </div>
        )}

        <input
          type="text"
          placeholder="搜索动作..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {!searchText && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12, WebkitOverflowScrolling: 'touch' }}>
            {[...Object.keys(EXERCISE_LIBRARY), 'Custom'].map(cat => (
              <div
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s',
                  background: activeCategory === cat ? 'var(--text-1)' : 'var(--surface)',
                  color: activeCategory === cat ? '#fff' : 'var(--text-2)',
                  border: cat === 'Custom' ? '1.5px dashed var(--c-blue)' : '1px solid var(--border)',
                }}
              >{cat === 'Custom' ? '+ 自定义' : cat}</div>
            ))}
          </div>
        )}

        {activeCategory !== 'Custom' || searchText ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredExercises.length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
                没有找到"{searchText}"，可在"自定义"中添加
              </div>
            )}
            {filteredExercises.map((ex, i) => (
              <div
                key={ex}
                onClick={() => handleExerciseSelect(ex, searchText ? null : activeCategory)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-m)', padding: '14px 16px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'all 0.15s', fontSize: 15, fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 20 }}>{EXERCISE_LIBRARY['有氧']?.includes(ex) ? '🏃' : '🏋️'}</span>
                <div>
                  <div style={{ fontWeight: 600 }}>{ex}</div>
                  {i < 3 && !searchText && <div style={{ fontSize: 11, color: 'var(--c-blue)', fontWeight: 700 }}>常用</div>}
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--text-4)' }}>›</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <label>动作名称</label>
            <input
              type="text" placeholder="例如：保加利亚分腿蹲" value={customExercise}
              onChange={e => setCustomExercise(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && customExercise.trim() && handleExerciseSelect(customExercise.trim(), 'Custom')}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1 }} disabled={!customExercise.trim()}
                onClick={() => handleExerciseSelect(customExercise.trim(), 'Custom')}>力量训练</button>
              <button className="secondary" disabled={!customExercise.trim()} style={{ flex: 1 }}
                onClick={() => { setExerciseType('cardio'); handleExerciseSelect(customExercise.trim(), 'Custom'); }}>有氧训练</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══ 记录组数（Gym Mode） ══
  return (
    <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto', padding: '0 20px 120px' }}>
      {/* 顶部工具栏 */}
      <div className="gym-header">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.02em' }}>
          {fmt(elapsed)}
        </div>

        {/* 模板进度点 */}
        {(completedExercises.length > 0 || templateQueue.length > 0) && (
          <div style={{ display: 'flex', gap: 5, flex: 1, justifyContent: 'center' }}>
            {Array.from({ length: totalExercises }).map((_, i) => (
              <div key={i} style={{
                height: 4, borderRadius: 99, transition: 'all 0.3s',
                width: i === currentIdx ? 20 : 8,
                background: i < currentIdx ? 'var(--c-green)' : i === currentIdx ? 'var(--c-blue)' : 'var(--border)',
              }} />
            ))}
          </div>
        )}

        <button
          className="secondary"
          onClick={() => completedExercises.length > 0 ? setPhase('between') : navigate('/')}
          style={{ padding: '6px 14px', fontSize: 13, borderRadius: 99, flexShrink: 0 }}
        >{completedExercises.length > 0 ? '结束' : '退出'}</button>
      </div>

      {/* 能量状态 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-l)', padding: '11px 16px', marginBottom: 16,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>今天状态</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1,2,3,4,5].map(lv => (
            <button
              key={lv}
              type="button"
              onClick={() => setEnergyLevel(lv)}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
                fontSize: 13, transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: energyLevel >= lv ? 'var(--c-blue)' : 'var(--surface-3)',
                color: energyLevel >= lv ? '#fff' : 'var(--text-4)',
                transform: energyLevel === lv ? 'scale(1.15)' : 'scale(1)',
              }}
            >●</button>
          ))}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-blue)', marginLeft: 'auto' }}>
          {energyLevel <= 2 ? '疲惫' : energyLevel === 3 ? '一般' : '充沛'}
        </span>
      </div>

      {/* 动作标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', flex: 1 }}>{exercise}</h2>
        <span style={{
          fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 99,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: isCardio ? 'var(--c-orange-dim)' : 'var(--c-blue-dim)',
          color: isCardio ? '#b86800' : 'var(--c-blue)',
        }}>{isCardio ? '有氧' : '力量'}</span>
        {isLoading && <span style={{ fontSize: 12, color: 'var(--text-4)' }}>读取中…</span>}
      </div>

      {/* 有氧计时器 */}
      {isCardio && <CardioTimer onFinish={(mins) => { if (mins > 0) setSets([{ weight: mins, reps: 0, done: false, setDuration: 0 }]); }} />}

      {/* 上次记录对比 */}
      {lastRecord && !isCardio && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          background: 'var(--c-blue-dim)', border: '1px solid rgba(0,113,227,0.15)',
          borderRadius: 'var(--r-m)', padding: '10px 14px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>上次</span>
          {lastRecord.sets.map((s, i) => (
            <span key={i} style={{ fontSize: 13, color: 'var(--text-2)', background: 'white', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>
              {s.weight === 0 ? '自重' : `${s.weight}kg`} × {s.reps}
            </span>
          ))}
        </div>
      )}

      {/* 智能建议 */}
      <SuggestionCard
        suggestion={suggestion} lastRecord={lastRecord}
        onApply={applySuggestion} onApplyLastRecord={applyLastRecord}
        energyLevel={energyLevel}
      />

      {/* 日期选择（折叠） */}
      <div style={{ marginBottom: 16 }}>
        <label>日期</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 14, padding: '9px 12px', marginTop: 4, marginBottom: 0 }} />
      </div>

      {/* 组列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {sets.map((set, i) => (
          <SetRow
            key={i}
            set={set}
            index={i}
            isCardio={isCardio}
            isBodyweight={!isCardio && (set.weight === 0 || set.weight === '0')}
            onChange={handleSetChange}
            onRemove={removeSet}
            onComplete={handleSetComplete}
            onToggleBodyweight={handleToggleBodyweight}
            isDone={set.done}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        style={{ width: '100%', background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', borderRadius: 'var(--r-l)', padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}
      >+ 添加一组</button>

      {/* 休息计时快捷按钮（力量） */}
      {!isCardio && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            休息计时 · 推荐 {getRestTime()}s
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button"
              onClick={() => { setRestTime(getRestTime()); setRestActive(true); }}
              style={{ flex: 1.5, background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', borderRadius: 99, padding: '10px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >⚡ 推荐</button>
            {[60, 90, 120, 180].map(s => (
              <button key={s} type="button"
                onClick={() => { setRestTime(s); setRestActive(true); }}
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: '10px 6px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}
              >{Math.floor(s/60)}:{String(s%60).padStart(2,'0')}</button>
            ))}
          </div>
        </div>
      )}

      {/* 备注 */}
      <label>备注（选填）</label>
      <textarea
        placeholder="今天的状态、心得..."
        value={notes} onChange={e => setNotes(e.target.value)}
        rows={2} style={{ marginTop: 4, marginBottom: 16, fontSize: 15 }}
      />

      {/* 完成按钮 */}
      <button
        onClick={handleFinishExercise}
        style={{ width: '100%', fontSize: 17, padding: '15px', borderRadius: 'var(--r-xl)', fontWeight: 700,
          background: templateQueue.length > 0 ? 'var(--c-blue)' : 'var(--c-green)', letterSpacing: '-0.01em' }}
      >
        {templateQueue.length > 0 ? `下一个：${templateQueue[0].exercise} →` : '完成这个动作'}
      </button>

      {/* 浮动休息计时 */}
      {restActive && (
        <div className="rest-timer-bar">
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>休息中</div>
            <div className="timer-clock">{fmt(restTime)}</div>
          </div>
          <div className="timer-controls">
            <button type="button" onClick={() => setRestTime(p => p + 30)}>+30s</button>
            <button type="button" onClick={() => setRestActive(false)}>跳过</button>
          </div>
        </div>
      )}

      {/* 计时闪烁动画 */}
      <style>{`
        @keyframes pulse-text {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  );
};

export default AddWorkout;
