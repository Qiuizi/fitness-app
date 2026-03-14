import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';

// ─── 动作库（按常用度从高到低排序）────────────────────────────────────────────
const EXERCISE_LIBRARY = {
  '胸部': [
    '杠铃卧推', '哑铃卧推', '上斜杠铃卧推', '上斜哑铃推举', '下斜杠铃卧推',
    '哑铃飞鸟', '上斜哑铃飞鸟', '绳索夹胸', '绳索飞鸟', '俯卧撑',
    '宽距俯卧撑', '钻石俯卧撑', '双杠臂屈伸（胸）', '史密斯卧推',
  ],
  '背部': [
    '引体向上', '高位下拉', '杠铃划船', '坐姿划船', 'T型划船',
    '单臂哑铃划船', '硬拉', '直腿硬拉', '绳索直臂下压', '俯身飞鸟',
    '反握引体向上', '宽握引体向上', '绳索划船', '杠铃耸肩',
  ],
  '腿部': [
    '深蹲', '前蹲', '腿举', '哈克深蹲', '罗马尼亚硬拉',
    '腿屈伸', '腿弯举', '提踵（坐姿）', '提踵（立姿）', '保加利亚分腿蹲',
    '弓步蹲', '相扑深蹲', '壶铃深蹲', '史密斯深蹲', '臀桥',
  ],
  '肩部': [
    '杠铃推举', '哑铃肩推', '阿诺德推举', '哑铃侧平举', '哑铃前平举',
    '绳索面拉', '杠铃直立划船', '绳索侧平举', '俯身哑铃飞鸟', '单臂绳索侧平举',
  ],
  '手臂': [
    '杠铃弯举', '哑铃弯举', '锤式弯举', '绳索弯举', '上斜哑铃弯举',
    '三头绳索下压', '仰卧臂屈伸', '窄距卧推', '双杠臂屈伸（三头）', '哑铃过头臂屈伸',
    '绳索过头伸展', '反握弯举',
  ],
  '核心': [
    '卷腹', '仰卧起坐', '平板支撑', '侧平板', '悬垂举腿',
    '俄罗斯挺身', '山地爬行', '自行车卷腹', '反向卷腹', '直腿上举',
    '绳索卷腹', '木桩式转体', 'V字起坐',
  ],
  '臀部': [
    '臀桥', '负重臀桥', '深蹲（臀向后）', '罗马尼亚硬拉', '保加利亚分腿蹲',
    '蚌式训练', '侧卧蚌式', '绳索臀部后踢', '站姿臀部外展',
  ],
  '有氧': [
    '跑步', '快走', '椭圆机', '动感单车', '划船机',
    '跳绳', '游泳', '爬楼梯', 'HIIT', '跳箱',
    '战绳', '开合跳', '波比跳',
  ],
};

const CARDIO_CAT = '有氧';
const isCardioEx = (ex, cat) => {
  if (cat === CARDIO_CAT) return true;
  if (cat === 'Custom') {
    return ['跑','骑','椭圆','划船','跳绳','有氧','游泳','HIIT','爬楼'].some(k => ex.includes(k));
  }
  return false;
};

// ─── 卡路里颜色辅助 ───────────────────────────────────────────────────────────
const CalBadge = ({ cal }) => {
  if (!cal) return null;
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color: '#ff9500',
      background: 'rgba(255,149,0,0.1)', padding: '2px 8px',
      borderRadius: 8, marginLeft: 8,
    }}>
      约 {cal} 千卡
    </span>
  );
};

// ─── 训练总结页 ───────────────────────────────────────────────────────────────
const WorkoutSummary = ({ records, duration, calories, onDone }) => {
  const totalVol = records
    .filter(r => r.type !== 'cardio')
    .reduce((a, r) => a + r.sets.reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
  const totalSets = records.reduce((a, r) => a + r.sets.length, 0);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const totalCal = calories?.total || 0;

  return (
    <div className="summary-page">
      <div className="summary-header">
        <div className="summary-check">✓</div>
        <h2>训练完成</h2>
        <p>你今天又进步了一点</p>
      </div>

      <div className="summary-stats">
        <div className="summary-stat">
          <div className="summary-stat-val">{mins}:{String(secs).padStart(2, '0')}</div>
          <div className="summary-stat-label">训练时长</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-val">{records.length}</div>
          <div className="summary-stat-label">动作数</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-val">{totalSets}</div>
          <div className="summary-stat-label">总组数</div>
        </div>
        {totalVol > 0 && (
          <div className="summary-stat">
            <div className="summary-stat-val">{(totalVol / 1000).toFixed(1)}</div>
            <div className="summary-stat-label">吨训练量</div>
          </div>
        )}
        {totalCal > 0 && (
          <div className="summary-stat" style={{ gridColumn: 'span 2', background: 'rgba(255,149,0,0.07)', border: '1px solid rgba(255,149,0,0.2)' }}>
            <div className="summary-stat-val" style={{ color: '#ff9500' }}>{totalCal}</div>
            <div className="summary-stat-label" style={{ color: '#d87000' }}>消耗千卡</div>
          </div>
        )}
      </div>

      <div className="summary-exercises">
        {records.map((r, i) => (
          <div key={i} className="summary-exercise-row">
            <div>
              <span className="summary-ex-name">{r.exercise}</span>
              {calories?.results?.[i] && <CalBadge cal={calories.results[i].calories} />}
            </div>
            <span className="summary-ex-detail">
              {r.type === 'cardio'
                ? `${r.sets[0]?.weight || 0} 分钟`
                : `${r.sets.length} 组 · 最高 ${Math.max(...r.sets.map(s => parseFloat(s.weight) || 0))} kg`
              }
            </span>
          </div>
        ))}
      </div>

      <button onClick={onDone} style={{ width: '100%', fontSize: 17, padding: 16, background: '#34c759' }}>
        完成，回到主页
      </button>
    </div>
  );
};

// ─── 智能建议卡片 ──────────────────────────────────────────────────────────────
const SuggestionCard = ({ suggestion, onApply }) => {
  if (!suggestion) return null;
  return (
    <div className="suggestion-card" onClick={onApply}>
      <div className="suggestion-icon">🤖</div>
      <div className="suggestion-content">
        <div className="suggestion-title">AI 建议</div>
        <div className="suggestion-text">{suggestion.reason}</div>
        <div className="suggestion-target">
          目标：<strong>{suggestion.suggestedWeight === 0 ? '自重' : `${suggestion.suggestedWeight} kg`}</strong>
          {' '}× <strong>{suggestion.suggestedReps} 次</strong>
        </div>
      </div>
      <div className="suggestion-apply">应用</div>
    </div>
  );
};

// ─── 单组输入行（完全可手动输入的版本）────────────────────────────────────────
const SetRow = ({ set, index, isCardio, isBodyweight, onChange, onRemove, onComplete, isDone }) => {
  return (
    <div className={`gym-set-row ${isDone ? 'done' : ''}`}>
      <div className="gym-set-num">{index + 1}</div>

      <div className="gym-set-inputs">
        {/* 重量 / 时长 */}
        <div className="gym-set-field">
          {isBodyweight ? (
            <div className="gym-input bodyweight-display" onClick={() => onChange(index, 'weight', 2.5)}>
              自重
            </div>
          ) : (
            <input
              type="number"
              inputMode="decimal"
              className="gym-input"
              value={set.weight === 0 || set.weight === '' ? '' : set.weight}
              onChange={e => onChange(index, 'weight', e.target.value)}
              placeholder="0"
              disabled={isDone}
              step="0.5"
            />
          )}
          <span className="gym-input-label">{isCardio ? '分钟' : (isBodyweight ? '自重' : 'kg')}</span>
        </div>

        <span className="gym-set-x">×</span>

        {/* 次数 / 千卡 */}
        <div className="gym-set-field">
          <input
            type="number"
            inputMode="numeric"
            className="gym-input"
            value={set.reps === '' ? '' : set.reps}
            onChange={e => onChange(index, 'reps', e.target.value)}
            placeholder="0"
            disabled={isDone}
            step="1"
          />
          <span className="gym-input-label">{isCardio ? '千卡' : '次'}</span>
        </div>
      </div>

      {/* 快捷增减（非自重力量） */}
      {!isCardio && !isBodyweight && !isDone && (
        <div className="set-quick-btns">
          <button type="button" className="sqb" onClick={() => onChange(index, 'weight', Math.max(0, (parseFloat(set.weight) || 0) - 2.5))}>-w</button>
          <button type="button" className="sqb" onClick={() => onChange(index, 'weight', (parseFloat(set.weight) || 0) + 2.5)}>+w</button>
        </div>
      )}

      {/* 次数快捷增减（所有力量训练） */}
      {!isCardio && !isDone && (
        <div className="set-quick-btns rep-btns">
          <button type="button" className="sqb" onClick={() => onChange(index, 'reps', Math.max(0, (parseInt(set.reps) || 0) - 1))}>-1</button>
          <button type="button" className="sqb" onClick={() => onChange(index, 'reps', (parseInt(set.reps) || 0) + 1)}>+1</button>
        </div>
      )}

      {!isDone && (
        <button className="gym-done-btn" onClick={() => onComplete(index)}>完成</button>
      )}
      {isDone && (
        <div className="gym-done-btn completed">✓</div>
      )}

      {!isDone && (
        <button type="button" className="set-remove-btn" onClick={() => onRemove(index)} title="删除这组">×</button>
      )}
    </div>
  );
};

// ─── 主组件 ───────────────────────────────────────────────────────────────────
const AddWorkout = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const templateData = location.state?.template;

  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // 阶段：'select' | 'log' | 'summary'
  const [phase, setPhase] = useState(templateData ? 'log' : 'select');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [exercise, setExercise] = useState(templateData?.exercises?.[0]?.exercise || '');
  const [exerciseType, setExerciseType] = useState(templateData?.exercises?.[0]?.type || 'strength');
  const [sets, setSets] = useState(
    templateData?.exercises?.[0]?.sets?.length
      ? templateData.exercises[0].sets.map(s => ({ weight: s.weight, reps: s.reps, done: false }))
      : [{ weight: '', reps: '', done: false }]
  );
  const [notes, setNotes] = useState('');
  const [customExercise, setCustomExercise] = useState('');
  const [activeCategory, setActiveCategory] = useState('胸部');
  const [searchText, setSearchText] = useState('');

  const [templateQueue, setTemplateQueue] = useState(templateData ? templateData.exercises.slice(1) : []);
  const [completedExercises, setCompletedExercises] = useState([]);
  const [lastRecord, setLastRecord] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calories, setCalories] = useState(null); // 总结页用

  const [timerDuration, setTimerDuration] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  useEffect(() => {
    let id = null;
    if (timerActive && timerDuration > 0) id = setInterval(() => setTimerDuration(p => p - 1), 1000);
    else if (timerDuration <= 0 && timerActive) { setTimerActive(false); window.navigator?.vibrate?.(500); }
    return () => clearInterval(id);
  }, [timerActive, timerDuration]);

  const formatTime = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // 搜索过滤
  const filteredExercises = searchText.trim()
    ? Object.values(EXERCISE_LIBRARY).flat().filter(ex => ex.includes(searchText.trim()))
    : (EXERCISE_LIBRARY[activeCategory] || []);

  // 加载历史 + 智能建议
  const loadExerciseData = async (ex, cardio) => {
    setIsLoading(true);
    setSuggestion(null);
    setLastRecord(null);

    if (cardio) {
      setSets([{ weight: 30, reps: 300, done: false }]);
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
        if (last?.sets?.length) setSets(last.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false })));
        else setSets([{ weight: '', reps: '', done: false }]);
      } else setSets([{ weight: '', reps: '', done: false }]);
      if (sugRes.ok) setSuggestion(await sugRes.json());
    } catch {
      setSets([{ weight: '', reps: '', done: false }]);
    }
    setIsLoading(false);
  };

  const handleExerciseSelect = async (ex, cat) => {
    setExercise(ex);
    // cat 为 null 时（搜索模式），通过动作库判断
    const resolvedCat = cat || Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(ex)) || activeCategory;
    const cardio = isCardioEx(ex, resolvedCat);
    setExerciseType(cardio ? 'cardio' : 'strength');
    setNotes('');
    setSearchText('');
    await loadExerciseData(ex, cardio);
    setPhase('log');
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    setSets(sets.map(s => ({ ...s, weight: suggestion.suggestedWeight, reps: suggestion.suggestedReps })));
  };

  const handleSetChange = (i, field, val) => {
    const ns = [...sets];
    ns[i] = { ...ns[i], [field]: val };
    setSets(ns);
  };

  const handleSetComplete = (i) => {
    const ns = [...sets];
    ns[i] = { ...ns[i], done: true };
    setSets(ns);
    // 自动开始90秒休息
    setTimerDuration(90);
    setTimerActive(true);
  };

  const addSet = () => {
    const last = sets[sets.length - 1];
    setSets([...sets, { weight: last.weight, reps: '', done: false }]);
  };

  const removeSet = (i) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, j) => j !== i));
  };

  // 获取有效组数
  const getValidSets = () => sets.map(s => ({
    weight: parseFloat(s.weight) || 0,
    reps: parseInt(s.reps) || 0,
  })).filter(s => exerciseType === 'cardio' ? s.weight > 0 : s.reps > 0);

  // 完成当前动作 → 询问"继续添加"还是"结束训练"
  const handleFinishExercise = async () => {
    const validSets = getValidSets();
    if (!validSets.length) { alert('请至少完成一组有效数据'); return; }

    const record = { date, exercise, type: exerciseType, sets: validSets, notes };
    const newCompleted = [...completedExercises, record];
    setCompletedExercises(newCompleted);

    if (templateQueue.length > 0) {
      // 模板模式：切换到下一个
      const next = templateQueue[0];
      setTemplateQueue(templateQueue.slice(1));
      setExercise(next.exercise);
      setExerciseType(next.type || 'strength');
      setNotes('');
      await loadExerciseData(next.exercise, next.type === 'cardio');
    } else {
      // 非模板模式 or 模板最后一个：让用户选择
      setPhase('between'); // 新增的"中间页"
    }
  };

  // 结束全部训练
  const handleEndWorkout = async (newCompleted = completedExercises) => {
    try {
      await Promise.all(newCompleted.map(r =>
        fetch(`${API_URL}/api/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify(r),
        })
      ));
      // 计算卡路里
      try {
        const calRes = await fetch(`${API_URL}/api/ai/calories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ exercises: newCompleted }),
        });
        if (calRes.ok) setCalories(await calRes.json());
      } catch { /* 卡路里计算失败不阻塞 */ }
      setPhase('summary');
    } catch { alert('提交失败，请重试'); }
  };

  // 继续添加动作
  const handleAddMore = () => {
    setPhase('select');
    setSets([{ weight: '', reps: '', done: false }]);
    setNotes('');
    setExercise('');
    setSuggestion(null);
    setLastRecord(null);
  };

  // 一键复制上次训练
  const handleCopyLastSession = async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/copy-last-session`, {
        method: 'POST', headers: { 'x-auth-token': token },
      });
      if (!res.ok) { alert('没有找到上次训练记录'); return; }
      const data = await res.json();
      if (!window.confirm(`复制 ${data.date} 的训练？共 ${data.exercises.length} 个动作`)) return;
      const first = data.exercises[0];
      setExercise(first.exercise);
      setExerciseType(first.type || 'strength');
      setSets(first.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false })));
      setTemplateQueue(data.exercises.slice(1));
      await loadExerciseData(first.exercise, first.type === 'cardio');
      setPhase('log');
    } catch { alert('获取失败，请重试'); }
  };

  const isCardio = exerciseType === 'cardio';
  const totalExercises = completedExercises.length + 1 + templateQueue.length;
  const currentIdx = completedExercises.length;

  // ══ 训练总结 ══
  if (phase === 'summary') {
    return (
      <div className="add-workout-page">
        <WorkoutSummary
          records={completedExercises}
          duration={elapsed}
          calories={calories}
          onDone={() => navigate('/')}
        />
      </div>
    );
  }

  // ══ 动作间隔页（完成一个动作后的选择） ══
  if (phase === 'between') {
    const lastEx = completedExercises[completedExercises.length - 1];
    return (
      <div className="add-workout-page">
        <div className="between-page">
          <div className="between-check">✓</div>
          <h2>{lastEx?.exercise}</h2>
          <p style={{ color: 'var(--apple-text-secondary)', marginBottom: 32 }}>
            {lastEx?.sets.length} 组已完成
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={handleAddMore} style={{ fontSize: 16, padding: 16 }}>
              + 继续添加下一个动作
            </button>
            <button
              className="secondary"
              style={{ fontSize: 16, padding: 16, background: 'rgba(52,199,89,0.1)', color: '#1d8a3a', border: '1px solid rgba(52,199,89,0.3)' }}
              onClick={() => handleEndWorkout()}
            >
              结束本次训练
            </button>
          </div>

          <div className="between-summary">
            <div className="between-summary-label">已完成</div>
            {completedExercises.map((r, i) => (
              <div key={i} className="between-ex-row">
                <span>{r.exercise}</span>
                <span>{r.sets.length} 组</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ══ 选择动作 ══
  if (phase === 'select') {
    return (
      <div className="add-workout-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>
            {completedExercises.length > 0 ? `添加第 ${completedExercises.length + 1} 个动作` : '选择动作'}
          </h2>
          <button className="secondary" onClick={() => completedExercises.length > 0 ? handleEndWorkout() : navigate('/')}
            style={{ padding: '8px 14px', fontSize: 14 }}>
            {completedExercises.length > 0 ? '结束训练' : '取消'}
          </button>
        </div>

        {completedExercises.length === 0 && (
          <div className="copy-last-btn" onClick={handleCopyLastSession}>
            <span>⚡</span>
            <span>一键复制上次训练</span>
            <span className="copy-last-arrow">→</span>
          </div>
        )}

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索动作..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ marginTop: 12, marginBottom: 8 }}
        />

        {/* 分类 pills（搜索时隐藏） */}
        {!searchText && (
          <div className="category-pills">
            {Object.keys(EXERCISE_LIBRARY).map(cat => (
              <div key={cat} className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}>{cat}</div>
            ))}
            <div className={`category-pill ${activeCategory === 'Custom' ? 'active' : ''}`}
              style={{ border: '1px dashed var(--apple-blue)', color: activeCategory === 'Custom' ? 'white' : 'var(--apple-blue)' }}
              onClick={() => setActiveCategory('Custom')}>
              + 自定义
            </div>
          </div>
        )}

        {/* 动作列表 */}
        {activeCategory !== 'Custom' || searchText ? (
          <div className="exercise-list">
            {filteredExercises.length === 0 && (
              <div style={{ padding: 20, color: 'var(--apple-text-secondary)', textAlign: 'center' }}>
                没有找到"{searchText}"，可以在"自定义"中添加
              </div>
            )}
            {filteredExercises.map((ex, i) => (
              <div key={ex} className="exercise-option" onClick={() => handleExerciseSelect(ex, searchText ? null : activeCategory)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{EXERCISE_LIBRARY['有氧']?.includes(ex) ? '🏃' : '🏋️'}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{ex}</div>
                    {i < 3 && !searchText && (
                      <div style={{ fontSize: 11, color: 'var(--apple-blue)', fontWeight: 600 }}>最常用</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'left', marginTop: 12 }}>
            <label>动作名称</label>
            <input type="text" placeholder="例如：保加利亚分腿蹲" value={customExercise}
              onChange={e => setCustomExercise(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && customExercise.trim() && handleExerciseSelect(customExercise.trim(), 'Custom')}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1 }} disabled={!customExercise.trim()}
                onClick={() => handleExerciseSelect(customExercise.trim(), 'Custom')}>力量训练</button>
              <button className="secondary" disabled={!customExercise.trim()}
                style={{ flex: 1, background: 'rgba(255,149,0,0.1)', color: '#d87000', border: '1px solid rgba(255,149,0,0.3)' }}
                onClick={() => { setExerciseType('cardio'); handleExerciseSelect(customExercise.trim(), 'Custom'); }}>有氧训练</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══ 记录组数（Gym Mode） ══
  return (
    <div className="add-workout-page gym-mode">
      {/* 顶部信息栏 */}
      <div className="gym-header">
        <div className="gym-timer">{formatTime(elapsed)}</div>
        {(completedExercises.length > 0 || templateQueue.length > 0) && (
          <div className="gym-progress-dots">
            {Array.from({ length: totalExercises }).map((_, i) => (
              <div key={i} className={`gp-dot ${i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming'}`} />
            ))}
          </div>
        )}
        <button className="secondary" onClick={() => completedExercises.length > 0 ? setPhase('between') : navigate('/')}
          style={{ padding: '6px 12px', fontSize: 13 }}>
          {completedExercises.length > 0 ? '结束' : '退出'}
        </button>
      </div>

      {/* 动作标题 */}
      <div className="gym-exercise-title">
        <h2>{exercise}</h2>
        <span className={`type-tag ${isCardio ? 'cardio' : 'strength'}`}>{isCardio ? '有氧' : '力量'}</span>
        {isLoading && <span style={{ fontSize: 12, color: 'var(--apple-text-secondary)', marginLeft: 8 }}>读取中...</span>}
      </div>

      {/* 上次记录 */}
      {lastRecord && !isCardio && (
        <div className="gym-last-record">
          <span className="glr-label">上次</span>
          {lastRecord.sets.map((s, i) => (
            <span key={i} className="glr-set">
              {s.weight === 0 ? '自重' : `${s.weight}kg`} × {s.reps}
            </span>
          ))}
        </div>
      )}

      {/* AI 建议 */}
      <SuggestionCard suggestion={suggestion} onApply={applySuggestion} />

      {/* 日期 */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>日期</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ fontSize: 15, padding: '8px 12px', marginTop: 4, marginBottom: 0 }} />
      </div>

      {/* 组列表 */}
      <div className="gym-sets-container">
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
            isDone={set.done}
          />
        ))}
      </div>

      <button type="button" className="secondary add-set-btn" onClick={addSet}>
        + 添加一组
      </button>

      {/* 快速休息计时 */}
      {!isCardio && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            休息计时
          </div>
          <div className="quick-timer-btns">
            {[60, 90, 120, 180].map(s => (
              <button key={s} type="button" onClick={() => { setTimerDuration(s); setTimerActive(true); }}>
                {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 备注 */}
      <label style={{ fontSize: 12, color: 'var(--apple-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        备注（选填）
      </label>
      <textarea placeholder="今天的状态、心得..." value={notes}
        onChange={e => setNotes(e.target.value)} rows={2}
        style={{ marginTop: 4, marginBottom: 12, fontSize: 15 }} />

      {/* 完成当前动作 */}
      <button onClick={handleFinishExercise} style={{
        width: '100%', fontSize: 17, padding: 16,
        background: templateQueue.length > 0 ? 'var(--apple-blue)' : '#34c759',
      }}>
        {templateQueue.length > 0 ? `下一个：${templateQueue[0].exercise} →` : '完成这个动作'}
      </button>

      {/* 浮动休息计时条 */}
      {timerActive && (
        <div className="rest-timer-bar">
          <div className="timer-clock">⏱ {formatTime(timerDuration)}</div>
          <div className="timer-controls">
            <button type="button" onClick={() => setTimerDuration(p => p + 30)}>+30s</button>
            <button type="button" onClick={() => setTimerActive(false)}>结束</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddWorkout;
