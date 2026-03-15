import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';

// ─── 动作库（按常用度从高到低排序）+ 语义标签 ─────────────────────────────────
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

// ─── 语义搜索标签 ───────────────────────────────────────────────────────────
const EXERCISE_TAGS = {
  '卧推': ['胸部', '推', '胸'],
  '飞鸟': ['胸部', '夹', '飞'],
  '夹胸': ['胸部', '夹'],
  '俯卧撑': ['胸部', '自重', '俯身'],
  '引体': ['背部', '自重', '拉'],
  '下拉': ['背部', '拉', '高位'],
  '划船': ['背部', '拉', '划'],
  '硬拉': ['背部', '腿部', '拉', '臀部'],
  '深蹲': ['腿部', '蹲', '腿'],
  '腿举': ['腿部', '推', '腿'],
  '硬拉': ['腿部', '背部', '拉'],
  '推举': ['肩部', '推'],
  '侧平举': ['肩部', '举', '侧'],
  '前平举': ['肩部', '举', '前'],
  '弯举': ['手臂', '弯', '二头'],
  '臂屈伸': ['手臂', '伸', '三头'],
  '卷腹': ['核心', '腹', '卷'],
  '平板支撑': ['核心', '支撑', '腹'],
  '臀桥': ['臀部', '桥', '臀'],
  '跑步': ['有氧', '跑'],
  '骑行': ['有氧', '骑'],
  '跳绳': ['有氧', '跳', '绳'],
};

// 智能语义搜索
const semanticSearch = (query) => {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const results = [];
  
  // 1. 精确匹配
  Object.entries(EXERCISE_LIBRARY).forEach(([cat, exercises]) => {
    exercises.forEach(ex => {
      if (ex.includes(q)) {
        results.push({ exercise: ex, category: cat, score: 100 });
      }
    });
  });
  
  // 2. 语义标签匹配
  Object.entries(EXERCISE_TAGS).forEach(([tag, keywords]) => {
    if (q.includes(tag) || keywords.some(k => q.includes(k))) {
      const cat = Object.entries(EXERCISE_LIBRARY).find(([_, exs]) => 
        exs.some(ex => keywords.some(k => ex.includes(k)))
      )?.[0];
      
      if (cat) {
        EXERCISE_LIBRARY[cat].forEach(ex => {
          if (keywords.some(k => ex.includes(k)) && !results.find(r => r.exercise === ex)) {
            results.push({ exercise: ex, category: cat, score: 80 });
          }
        });
      }
    }
  });
  
  // 3. 模糊匹配
  Object.entries(EXERCISE_LIBRARY).forEach(([cat, exercises]) => {
    exercises.forEach(ex => {
      let similarity = 0;
      for (let i = 0; i < Math.min(q.length, ex.length); i++) {
        if (q[i] === ex[i]) similarity++;
      }
      const score = (similarity / Math.max(q.length, ex.length)) * 60;
      if (score > 0.5 && !results.find(r => r.exercise === ex)) {
        results.push({ exercise: ex, category: cat, score });
      }
    });
  });
  
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
};

// ─── 高级语音命令解析 ───────────────────────────────────────────────────────────
const parseVoiceCommand = (text) => {
  const t = text.toLowerCase();
  let result = { weight: '', reps: '', exercise: '', action: 'log' };
  
  // 检测意图
  if (t.includes('完成') || t.includes('好了') || t.includes('结束') || t.includes('做完')) {
    result.action = 'complete';
  } else if (t.includes('休息') || t.includes('停') || t.includes('pause')) {
    result.action = 'rest';
  } else if (t.includes('下一组') || t.includes('继续') || t.includes('再来')) {
    result.action = 'next';
  } else if (t.includes('添加') || t.includes('加一组')) {
    result.action = 'add';
  } else if (t.includes('删除') || t.includes('去掉') || t.includes('不要')) {
    result.action = 'remove';
  } else if (t.includes('退出') || t.includes('结束训练')) {
    result.action = 'exit';
  } else if (t.includes('对') || t.includes('是的') || t.includes('没错')) {
    result.action = 'confirm';
  } else if (t.includes('不对') || t.includes('不是') || t.includes('重说')) {
    result.action = 'deny';
  }
  
  // 提取重量
  const weightPatterns = [
    { regex: /(\d+(?:\.\d+)?)\s*kg/i, factor: 1 },
    { regex: /(\d+(?:\.\d+)?)\s*公斤/i, factor: 1 },
    { regex: /(\d+)\s*斤/i, factor: 0.5 },
  ];
  
  for (const p of weightPatterns) {
    const match = t.match(p.regex);
    if (match) {
      result.weight = Math.round(parseFloat(match[1]) * p.factor * 2) / 2;
      break;
    }
  }
  
  // 提取次数
  const repsPatterns = [
    { regex: /(\d+)\s*下/i },
    { regex: /(\d+)\s*次/i },
    { regex: /(\d+)\s*个/i },
  ];
  
  for (const p of repsPatterns) {
    const match = t.match(p.regex);
    if (match) {
      result.reps = parseInt(match[1]);
      break;
    }
  }
  
  // 提取时长（有氧）
  const timeMatch = t.match(/(\d+)\s*(?:分钟|分|min)/i);
  if (timeMatch) {
    result.weight = parseInt(timeMatch[1]);
  }
  
  // 提取动作名称（智能匹配）
  const allExercises = Object.values(EXERCISE_LIBRARY).flat();
  for (const ex of allExercises) {
    if (t.includes(ex.toLowerCase())) {
      result.exercise = ex;
      break;
    }
  }
  
  // 备选：模糊匹配动作
  if (!result.exercise) {
    const simpleExercises = {
      '卧推': '杠铃卧推', '推胸': '杠铃卧推', 'bench': '杠铃卧推',
      '深蹲': '深蹲', 'squat': '深蹲',
      '硬拉': '硬拉', 'deadlift': '硬拉',
      '划船': '杠铃划船', 'row': '杠铃划船',
      '引体': '引体向上', 'pullup': '引体向上', 'chinup': '引体向上',
      '弯举': '杠铃弯举', 'curl': '杠铃弯举',
      '推举': '杠铃推举', 'ohp': '杠铃推举',
      '跑步': '跑步', 'run': '跑步',
      '骑车': '动感单车', '单车': '动感单车',
    };
    for (const [key, value] of Object.entries(simpleExercises)) {
      if (t.includes(key)) {
        result.exercise = value;
        break;
      }
    }
  }
  
  return result;
};

// 语音命令确认消息生成
const generateVoiceConfirmation = (parsed) => {
  if (parsed.action === 'confirm') return '好的，已确认';
  if (parsed.action === 'deny') return '请再说一次';
  if (parsed.action === 'complete') return '完成当前组';
  if (parsed.action === 'rest') return '开始休息';
  if (parsed.action === 'next') return '准备下一组';
  if (parsed.action === 'add') return '添加一组';
  if (parsed.action === 'remove') return '删除这组';
  if (parsed.action === 'exit') return '结束训练';
  
  const parts = [];
  if (parsed.exercise) parts.push(parsed.exercise);
  if (parsed.weight) parts.push(`${parsed.weight}公斤`);
  if (parsed.reps) parts.push(`${parsed.reps}次`);
  
  return parts.length > 0 ? `记录：${parts.join('×')}，确认吗？` : '请再说一遍';
};

const CARDIO_CAT = '有氧';
const isCardioEx = (ex, cat) => {
  if (cat === CARDIO_CAT) return true;
  if (cat === 'Custom') {
    return ['跑','骑','椭圆','划船','跳绳','有氧','游泳','HIIT','爬楼'].some(k => ex.includes(k));
  }
  return false;
};

// ─── 卡路里显示组件（带食物类比）────────────────────────────────────────────────
const CalBadge = ({ cal, foodEquivalent }) => {
  if (!cal) return null;
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color: '#ff9500',
      background: 'rgba(255,149,0,0.1)', padding: '2px 8px',
      borderRadius: 8, marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      🔥 {cal} 千卡
      {foodEquivalent && <span style={{ fontWeight: 500, fontSize: 11 }}>({foodEquivalent})</span>}
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
            <div className="summary-stat-label" style={{ color: '#d87000' }}>
              千卡 {calories?.totalFoodEquivalent ? `(${calories.totalFoodEquivalent})` : ''}
            </div>
            {calories?.bodyWeight && (
              <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                基于体重 {calories.bodyWeight}kg
              </div>
            )}
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
const SuggestionCard = ({ suggestion, onApply, lastRecord, energyLevel }) => {
  if (!suggestion && !lastRecord) return null;
  
  // 根据能量等级调整建议
  const adjustSuggestion = (sugg) => {
    if (!sugg) return null;
    if (energyLevel <= 2) {
      // 疲惫时降低目标
      return {
        ...sugg,
        suggestedWeight: Math.round(sugg.suggestedWeight * 0.85 * 2) / 2,
        reason: '状态不佳，适当降低强度，保持训练节奏',
      };
    } else if (energyLevel >= 4) {
      // 充沛时挑战更高目标
      return {
        ...sugg,
        suggestedWeight: Math.round(sugg.suggestedWeight * 1.05 * 2) / 2,
        reason: '状态不错，试试突破自我！',
      };
    }
    return sugg;
  };
  
  const adjustedSuggestion = adjustSuggestion(suggestion);
  const bestWeight = lastRecord?.sets?.[0]?.weight || 0;
  
  return (
    <div className="suggestion-card" onClick={onApply}>
      <div className="suggestion-icon">🤖</div>
      <div className="suggestion-content">
        <div className="suggestion-title">
          {adjustedSuggestion?.isBreakthrough ? '🎯 突破机会' : 'AI 建议'}
        </div>
        <div className="suggestion-text">
          {adjustedSuggestion?.reason || `上次最佳 ${bestWeight}kg`}
        </div>
        {adjustedSuggestion && (
          <div className="suggestion-target">
            目标：<strong>{adjustedSuggestion.suggestedWeight === 0 ? '自重' : `${adjustedSuggestion.suggestedWeight} kg`}</strong>
            {' '}× <strong>{adjustedSuggestion.suggestedReps} 次</strong>
          </div>
        )}
        {!adjustedSuggestion && lastRecord && (
          <div className="suggestion-target">
            参考：<strong>{bestWeight === 0 ? '自重' : `${bestWeight} kg`}</strong>
            {' '}× <strong>{lastRecord.sets[0]?.reps || 10} 次</strong>
          </div>
        )}
      </div>
      <div className="suggestion-apply" onClick={onApply}>应用</div>
    </div>
  );
};

// ─── 单组输入行（完全可手动输入的版本）────────────────────────────────────────
const SetRow = ({ set, index, isCardio, isBodyweight, onChange, onRemove, onComplete, isDone, onToggleBodyweight }) => {
  return (
    <div className={`gym-set-row ${isDone ? 'done' : ''}`}>
      <div className="gym-set-num">{index + 1}</div>

      <div className="gym-set-inputs">
        {/* 重量 / 时长 */}
        <div className="gym-set-field">
          {isBodyweight ? (
            <div className="gym-input bodyweight-display" onClick={() => onToggleBodyweight?.(index)}>
              自重
            </div>
          ) : isCardio ? (
            <input
              type="number"
              inputMode="decimal"
              className="gym-input"
              value={set.weight === 0 || set.weight === '' ? '' : set.weight}
              onChange={e => onChange(index, 'weight', e.target.value)}
              placeholder="0"
              disabled={isDone}
              step="1"
            />
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

        <span className="gym-set-x">{isCardio ? '×' : '×'}</span>

        {/* 次数 / 千卡（有氧不显示，后端自动计算） */}
        {!isCardio && (
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
          <span className="gym-input-label">次</span>
        </div>
        )}
      </div>

      {/* 自重切换按钮（力量训练） */}
      {!isCardio && !isDone && (
        <button 
          type="button" 
          className="bodyweight-toggle"
          onClick={() => onToggleBodyweight?.(index)}
          title={isBodyweight ? "切换到负重" : "切换到自重"}
        >
          {isBodyweight ? '🏋️' : '⚖️'}
        </button>
      )}

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

      {/* 有氧运动快捷时长按钮 */}
      {isCardio && !isDone && (
        <div className="set-quick-btns cardio-btns">
          <button type="button" className="sqb" onClick={() => onChange(index, 'weight', Math.max(0, (parseFloat(set.weight) || 0) - 5))}>-5m</button>
          <button type="button" className="sqb" onClick={() => onChange(index, 'weight', (parseFloat(set.weight) || 0) + 5)}>+5m</button>
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
  
  // 语音输入状态
  const [isListening, setIsListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);
  const [pendingVoiceCommand, setPendingVoiceCommand] = useState(null);
  const [voiceConfirmationMode, setVoiceConfirmationMode] = useState(false);
  const recognitionRef = useRef(null);
  const [lastRecord, setLastRecord] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calories, setCalories] = useState(null); // 总结页用

  const [timerDuration, setTimerDuration] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(3); // 1-5 能量水平
  
  // 有氧计时器
  const [cardioTimer, setCardioTimer] = useState(0);
  const [cardioTimerRunning, setCardioTimerRunning] = useState(false);
  
  useEffect(() => {
    let id = null;
    if (cardioTimerRunning) {
      id = setInterval(() => setCardioTimer(t => t + 1), 1000);
    }
    return () => clearInterval(id);
  }, [cardioTimerRunning]);
  
  const startCardioTimer = () => {
    setCardioTimerRunning(true);
  };
  
  const pauseCardioTimer = () => {
    setCardioTimerRunning(false);
  };
  
  const finishCardioTimer = () => {
    setCardioTimerRunning(false);
    const mins = Math.floor(cardioTimer / 60);
    if (mins > 0) {
      setSets([{ weight: mins, reps: 0, done: false }]);
    }
    setCardioTimer(0);
  };
  
  useEffect(() => {
    let id = null;
    if (timerActive && timerDuration > 0) id = setInterval(() => setTimerDuration(p => p - 1), 1000);
    else if (timerDuration <= 0 && timerActive) { setTimerActive(false); window.navigator?.vibrate?.(500); }
    return () => clearInterval(id);
  }, [timerActive, timerDuration]);

  // 智能休息时长推荐
  const getRecommendedRestTime = () => {
    const baseTimes = {
      '胸部': 90, '背部': 120, '腿部': 180, '肩部': 90,
      '手臂': 60, '核心': 60, '臀部': 120, '有氧': 0,
    };
    
    // 根据能量水平调整
    const energyMultiplier = energyLevel <= 2 ? 1.3 : energyLevel >= 4 ? 0.8 : 1;
    
    const category = Object.keys(EXERCISE_LIBRARY).find(cat => 
      EXERCISE_LIBRARY[cat].includes(exercise)
    ) || '胸部';
    
    return Math.round((baseTimes[category] || 90) * energyMultiplier);
  };

  const formatTime = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // 语义搜索
  const semanticSearchResults = searchText.trim() ? semanticSearch(searchText.trim()) : [];
  const filteredExercises = searchText.trim()
    ? semanticSearchResults.map(r => r.exercise)
    : (EXERCISE_LIBRARY[activeCategory] || []);

  // 语音识别
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别，请使用 Chrome 浏览器');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceResult(null);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      setVoiceResult(transcript);
      
      // 解析语音命令
      const parsed = parseVoiceCommand(transcript);
      
      // 确认模式：等待用户确认
      if (voiceConfirmationMode) {
        if (parsed.action === 'confirm' || parsed.action === 'deny') {
          if (parsed.action === 'confirm' && pendingVoiceCommand) {
            // 执行待确认的命令
            executeVoiceCommand(pendingVoiceCommand);
            setVoiceResult('已确认');
          } else {
            setVoiceResult('已取消，请重说');
          }
          setVoiceConfirmationMode(false);
          setPendingVoiceCommand(null);
          return;
        }
      }
      
      // 检查是否需要确认
      if (parsed.action === 'log' && (parsed.weight || parsed.reps)) {
        setPendingVoiceCommand(parsed);
        setVoiceConfirmationMode(true);
        setVoiceResult(generateVoiceConfirmation(parsed));
        return;
      }
      
      // 直接执行其他命令
      if (parsed.action !== 'log') {
        executeVoiceCommand(parsed);
        setVoiceResult(generateVoiceConfirmation(parsed));
      }
    };

    recognition.onerror = (event) => {
      console.error('语音识别错误:', event.error);
      setIsListening(false);
      setVoiceConfirmationMode(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };
  
  // 执行语音命令
  const executeVoiceCommand = (parsed) => {
    if (parsed.action === 'complete') {
      const undoneIndex = sets.findIndex(s => !s.done);
      if (undoneIndex !== -1) {
        handleSetComplete(undoneIndex);
      }
    } else if (parsed.action === 'rest') {
      setTimerDuration(getRecommendedRestTime());
      setTimerActive(true);
    } else if (parsed.action === 'add') {
      addSet();
    } else if (parsed.action === 'remove') {
      removeSet(sets.length - 1);
    } else if (parsed.action === 'next') {
      const undoneIndex = sets.findIndex(s => !s.done);
      if (undoneIndex !== -1) {
        handleSetComplete(undoneIndex);
      }
    } else if (parsed.action === 'exit') {
      handleFinishExercise();
    } else if (parsed.action === 'log') {
      // 更新数据
      const ns = [...sets];
      if (ns.length > 0) {
        if (parsed.weight !== '') ns[0].weight = parsed.weight;
        if (parsed.reps !== '') ns[0].reps = parsed.reps;
        setSets(ns);
      }
    }
  };

  // 加载历史 + 智能建议
  const loadExerciseData = async (ex, cardio) => {
    setIsLoading(true);
    setSuggestion(null);
    setLastRecord(null);

    if (cardio) {
      // 有氧运动根据类型设置典型时长
      const cardioDefaults = {
        '跑步': 30, '快走': 30, '骑行': 45, '跳绳': 20,
        '游泳': 30, 'HIIT': 20, '爬楼梯': 20, '椭圆机': 30,
        '划船机': 30, '登山机': 20, '散步': 30,
      };
      const defaultMins = cardioDefaults[ex] || 30;
      setSets([{ weight: defaultMins, reps: 0, done: false }]);
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
    // 重置有氧计时器
    if (cardio) {
      setCardioTimer(0);
      setCardioTimerRunning(false);
    }
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

  // 切换自重/负重
  const handleToggleBodyweight = (i) => {
    const ns = [...sets];
    const current = ns[i];
    if (current.weight === 0 || current.weight === '0') {
      ns[i] = { ...current, weight: '' };
    } else {
      ns[i] = { ...current, weight: 0 };
    }
    setSets(ns);
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
        
        {/* 语音输入按钮 */}
        <button 
          className={`voice-btn ${isListening ? 'listening' : ''}`}
          onClick={startVoiceInput}
          disabled={isListening}
          title="语音输入：说 '卧推80公斤10下'"
        >
          {isListening ? '🎤' : '🎤'}
        </button>
        
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
      
      {/* 语音识别结果显示 + TTS 反馈 */}
      {voiceResult && (
        <div className={`voice-result-toast ${voiceConfirmationMode ? 'confirming' : ''}`}>
          <div className="voice-icon">{voiceConfirmationMode ? '🤔' : '✅'}</div>
          <div className="voice-text">
            {voiceConfirmationMode ? (
              <span>「{voiceResult}」请说"对"或"不对"</span>
            ) : (
              <span>{voiceResult}</span>
            )}
          </div>
        </div>
      )}

      {/* 能量状态选择 */}
      <div className="energy-selector">
        <span className="energy-label">今天状态</span>
        <div className="energy-dots">
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              className={`energy-dot ${energyLevel === level ? 'active' : ''} ${energyLevel >= level ? 'filled' : ''}`}
              onClick={() => setEnergyLevel(level)}
            >
              {energyLevel >= level ? '●' : '○'}
            </button>
          ))}
        </div>
        <span className="energy-text">
          {energyLevel <= 2 ? '疲惫' : energyLevel === 3 ? '一般' : '充沛'}
        </span>
      </div>

      {/* 动作标题 */}
      <div className="gym-exercise-title">
        <h2>{exercise}</h2>
        <span className={`type-tag ${isCardio ? 'cardio' : 'strength'}`}>{isCardio ? '有氧' : '力量'}</span>
        {isLoading && <span style={{ fontSize: 12, color: 'var(--apple-text-secondary)', marginLeft: 8 }}>读取中...</span>}
      </div>

      {/* 有氧计时器 */}
      {isCardio && (
        <div style={{ marginBottom: 16, padding: 16, background: 'rgba(0,113,227,0.08)', borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--apple-blue)', marginBottom: 12 }}>
            {Math.floor(cardioTimer / 60)}:{String(cardioTimer % 60).padStart(2, '0')}
          </div>
          {!cardioTimerRunning ? (
            <button onClick={startCardioTimer} style={{ background: 'var(--apple-blue)', color: 'white', padding: '10px 32px', fontSize: 16, borderRadius: 20, border: 'none', marginRight: 8 }}>
              ▶️ 开始计时
            </button>
          ) : (
            <button onClick={pauseCardioTimer} style={{ background: '#ff9500', color: 'white', padding: '10px 24px', fontSize: 16, borderRadius: 20, border: 'none', marginRight: 8 }}>
              ⏸️ 暂停
            </button>
          )}
          {cardioTimer > 0 && (
            <button onClick={finishCardioTimer} style={{ background: '#34c759', color: 'white', padding: '10px 24px', fontSize: 16, borderRadius: 20, border: 'none' }}>
              ✓ 完成 ({Math.floor(cardioTimer / 60)}分钟)
            </button>
          )}
        </div>
      )}

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
      <SuggestionCard 
        suggestion={suggestion} 
        onApply={applySuggestion}
        lastRecord={lastRecord}
        energyLevel={energyLevel}
      />

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
            onToggleBodyweight={handleToggleBodyweight}
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
            休息计时 · <span style={{ color: 'var(--apple-blue)', fontWeight: 600 }}>智能推荐 {getRecommendedRestTime()}s</span>
          </div>
          <div className="quick-timer-btns">
            {/* 智能推荐 */}
            <button 
              type="button" 
              onClick={() => { setTimerDuration(getRecommendedRestTime()); setTimerActive(true); }}
              style={{ background: 'rgba(0,113,227,0.1)', borderColor: 'var(--apple-blue)', color: 'var(--apple-blue)' }}
            >
              ⚡ 推荐
            </button>
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
