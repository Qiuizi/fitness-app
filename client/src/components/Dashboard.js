import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── 成就定义 ──────────────────────────────────────────────────────────────────
const ACHIEVEMENTS = {
  first_workout: { icon: '🏋️', name: '初次出征',   desc: '完成第一次训练' },
  workout_10:    { icon: '🔟',  name: '十次里程碑', desc: '累计完成10次训练' },
  workout_50:    { icon: '💪',  name: '进阶达人',   desc: '累计完成50次训练' },
  workout_100:   { icon: '🏆',  name: '百次传奇',   desc: '累计完成100次训练' },
  week_warrior:  { icon: '⚔️',  name: '周间战士',   desc: '累计训练7天' },
  month_master:  { icon: '👑',  name: '月度主宰',   desc: '累计训练30天' },
  streak_3:      { icon: '🔥',  name: '三连打卡',   desc: '连续打卡3天' },
  streak_7:      { icon: '🌟',  name: '一周不间断', desc: '连续打卡7天' },
  streak_30:     { icon: '💎',  name: '钢铁意志',   desc: '连续打卡30天' },
  volume_10k:    { icon: '🏗️',  name: '万斤举铁',   desc: '力量总量超10,000kg' },
  volume_100k:   { icon: '🚀',  name: '十万勇士',   desc: '力量总量超100,000kg' },
};

// ─── 个人动态里程碑组件 ────────────────────────────────────────────────────────
const PersonalMilestones = ({ prs, stats }) => {
  if (!prs || prs.length === 0 || !stats) return null;

  // 根据用户数据生成个人里程碑
  const generateMilestones = () => {
    const milestones = [];
    
    // 检查是否有停滞的动作（超过8周没有进步）
    prs.forEach(pr => {
      const lastDate = new Date(pr.date);
      const weeksStagnant = Math.floor((Date.now() - lastDate) / (7 * 24 * 60 * 60 * 1000));
      
      if (weeksStagnant >= 6) {
        const targetWeight = pr.weight + 2.5;
        milestones.push({
          id: `breakthrough_${pr.exercise}`,
          icon: '🎯',
          title: '突破机会',
          desc: `${pr.exercise} 停滞${weeksStagnant}周`,
          target: `${targetWeight}kg`,
          action: '挑战',
          color: '#5856d6',
        });
      }
    });
    
    // 连续训练天数里程碑
    if (stats.streak > 0) {
      const nextStreak = [3, 7, 14, 30, 50, 100].find(s => s > stats.streak);
      if (nextStreak) {
        milestones.push({
          id: `streak_${nextStreak}`,
          icon: '🔥',
          title: '连续打卡',
          desc: `再训练 ${nextStreak - stats.streak} 天`,
          target: `${nextStreak} 天`,
          action: '加油',
          color: '#ff9500',
        });
      }
    }
    
    // 训练量里程碑
    if (stats.totalVolume > 0) {
      const nextVolume = [1000, 5000, 10000, 50000, 100000].find(v => v > stats.totalVolume);
      if (nextVolume) {
        milestones.push({
          id: `volume_${nextVolume}`,
          icon: '🏗️',
          title: '力量积累',
          desc: '累计训练量',
          target: `${(nextVolume / 1000).toFixed(0)}吨`,
          action: '加油',
          color: '#0071e3',
        });
      }
    }
    
    return milestones.slice(0, 3); // 最多显示3个
  };

  const milestones = generateMilestones();
  if (milestones.length === 0) return null;

  return (
    <div className="personal-milestones">
      <div className="pm-header">
        <span className="pm-title">个人里程碑</span>
        <span className="pm-badge">个性化</span>
      </div>
      <div className="pm-list">
        {milestones.map(m => (
          <div key={m.id} className="pm-item" style={{ borderLeftColor: m.color }}>
            <span className="pm-icon">{m.icon}</span>
            <div className="pm-content">
              <div className="pm-target">{m.target}</div>
              <div className="pm-desc">{m.desc}</div>
            </div>
            <button className="pm-action" style={{ background: m.color }}>{m.action}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// ─── 小工具组件 ────────────────────────────────────────────────────────────────

const InsightCard = ({ insights }) => {
  if (!insights || insights.length === 0) return null;
  return (
    <div className="insight-panel">
      <div className="insight-header">
        <span className="insight-label">训练洞察</span>
        <span className="insight-badge">NEW</span>
      </div>
      <div className="insight-list">
        {insights.map((ins, i) => (
          <div key={i} className="insight-row">
            <span className="insight-icon">{ins.icon}</span>
            <span className="insight-text">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── AI 智能洞察面板 ───────────────────────────────────────────────────────────
const AIInsightsPanel = ({ token }) => {
  const [insights, setInsights] = useState([]);
  const [plateaus, setPlateaus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    
    // 获取综合洞察
    fetch(`${API_URL}/api/ai/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
    })
      .then(r => r.json())
      .then(d => setInsights(d.insights || []))
      .catch(() => {});

    // 获取平台期检测
    fetch(`${API_URL}/api/ai/plateaus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
    })
      .then(r => r.json())
      .then(d => setPlateaus(d.plateaus || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || (insights.length === 0 && plateaus.length === 0)) return null;

  return (
    <div className="ai-insights-panel">
      {plateaus.length > 0 && (
        <div className="plateau-section">
          <div className="plateau-header">
            <span className="plateau-icon">🎯</span>
            <span className="plateau-title">平台期预警</span>
          </div>
          {plateaus.map((p, i) => (
            <div key={i} className="plateau-item">
              <div className="plateau-exercise">{p.exercise}</div>
              <div className="plateau-suggestion">{p.suggestion}</div>
              <div className="plateau-action">
                <span className="plateau-target">目标: {p.targetWeight}kg</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="insights-section">
        {insights.filter(i => i.type !== 'motivation').slice(0, 3).map((ins, i) => (
          <div key={i} className={`insight-item ${ins.type}`}>
            <span className="insight-emoji">{ins.icon}</span>
            <span className="insight-content">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TodayCard = ({ todayPlan, templates, onStartTemplate }) => {
  const todayDow = new Date().getDay();
  const plan = todayPlan?.find(p => p.dayOfWeek === todayDow);
  const template = plan && !plan.isRestDay
    ? templates.find(t => t._id === plan.templateId)
    : null;

  if (!plan) return null;

  return (
    <div className={`today-card ${plan.isRestDay ? 'rest-day' : ''}`}>
      <div className="today-label">今天 · {WEEKDAYS[todayDow]}</div>
      {plan.isRestDay ? (
        <div className="today-content">
          <span className="today-rest-icon">😴</span>
          <div>
            <div className="today-title">休息日</div>
            <div className="today-sub">适当休息，肌肉在恢复中生长</div>
          </div>
        </div>
      ) : template ? (
        <div className="today-content">
          <span className="today-rest-icon">🎯</span>
          <div style={{ flex: 1 }}>
            <div className="today-title">{template.name}</div>
            <div className="today-sub">{template.exercises.map(e => e.exercise).join(' · ')}</div>
          </div>
          <button className="today-start-btn" onClick={() => onStartTemplate(template)}>
            开始训练
          </button>
        </div>
      ) : (
        <div className="today-content">
          <span className="today-rest-icon">📋</span>
          <div>
            <div className="today-title">{plan.label || '训练日'}</div>
            <div className="today-sub">点击记录今天的训练</div>
          </div>
          <Link to="/add">
            <button className="today-start-btn">记录训练</button>
          </Link>
        </div>
      )}
    </div>
  );
};

const StreakWidget = ({ streak, longestStreak, shield, onUseShield }) => {
  const isStrong = streak >= 7;
  const pct = Math.min(100, (streak / Math.max(longestStreak, 7)) * 100);

  return (
    <div className="streak-widget">
      <div className="streak-top">
        <div>
          <div className="streak-main-num">{streak}</div>
          <div className="streak-main-label">天连续打卡</div>
        </div>
        <div className="streak-fire">{streak === 0 ? '💤' : isStrong ? '🔥' : '✨'}</div>
      </div>

      {/* 进度条：当前vs历史最长 */}
      <div className="streak-bar-wrap">
        <div className="streak-bar-track">
          <div className="streak-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="streak-bar-labels">
          <span>当前 {streak}</span>
          <span>最长 {longestStreak}</span>
        </div>
      </div>

      {/* 下一个里程碑 */}
      <div className="streak-milestone">
        {streak === 0
          ? '今天训练，开启连续打卡'
          : streak < 3
          ? `再 ${3 - streak} 天解锁「三连打卡」`
          : streak < 7
          ? `再 ${7 - streak} 天解锁「一周不间断」`
          : streak < 30
          ? `再 ${30 - streak} 天解锁「钢铁意志」`
          : '连续打卡30天，你是真正的自律者'}
      </div>

      {/* 免死金牌 */}
      {shield > 0 && streak === 0 && (
        <button className="shield-btn" onClick={onUseShield}>
          🛡️ 使用免死金牌（本月剩余 {shield} 次）
        </button>
      )}
    </div>
  );
};

const TemplateManager = ({ templates, onStartTemplate, onDelete, onCreateNew }) => {
  if (templates.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '40px 20px' }}>
        <div className="empty-icon">📋</div>
        <h3>还没有训练模板</h3>
        <p>保存一套常用训练动作，下次一键加载，省去选动作的时间</p>
        <Link to="/add">
          <button style={{ marginTop: 16 }}>去记录第一次训练</button>
        </Link>
      </div>
    );
  }
  return (
    <div className="template-list">
      {templates.map(t => (
        <div key={t._id} className="template-card">
          <div className="template-info">
            <div className="template-name">{t.name}</div>
            <div className="template-exercises">
              {t.exercises.map(e => e.exercise).join(' · ')}
            </div>
            {t.lastUsed && (
              <div className="template-meta">
                上次使用 {new Date(t.lastUsed).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                {t.useCount > 1 && ` · 已用 ${t.useCount} 次`}
              </div>
            )}
          </div>
          <div className="template-actions">
            <button onClick={() => onStartTemplate(t)}>使用模板</button>
            <button className="secondary" style={{ fontSize: 13, padding: '6px 12px' }}
              onClick={() => onDelete(t._id)}>删除</button>
          </div>
        </div>
      ))}
      <button className="secondary template-new-btn" onClick={onCreateNew}>
        + 新建模板
      </button>
    </div>
  );
};

const BodyWeightModal = ({ onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3>记录体重</h3>
        <label>日期</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <label>体重 (kg)</label>
        <input type="number" step="0.1" min="20" max="300"
          placeholder="例如 72.5" value={weight}
          onChange={e => setWeight(e.target.value)} autoFocus />
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button onClick={() => weight && onSave(date, parseFloat(weight))} style={{ flex: 1 }}>确认</button>
          <button className="secondary" onClick={onClose} style={{ flex: 1 }}>取消</button>
        </div>
      </div>
    </div>
  );
};

const ProgressModal = ({ exercise, onClose, token }) => {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/api/workouts/progress/${encodeURIComponent(exercise)}`, {
      headers: { 'x-auth-token': token },
    }).then(r => r.json()).then(setData).catch(() => {});
  }, [exercise, token]);

  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    weight: d.bestWeight,
    volume: d.totalVolume,
  }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{exercise} — 进步曲线</h3>
          <button className="secondary" onClick={onClose} style={{ padding: '6px 14px' }}>关闭</button>
        </div>
        {chartData.length < 2 ? (
          <p style={{ color: 'var(--apple-text-secondary)', textAlign: 'center', padding: 40 }}>
            至少需要2次训练记录才能显示进步曲线
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0071e3" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                  formatter={v => [`${v} kg`, '最高重量']} />
                <Area type="monotone" dataKey="weight" stroke="#0071e3" strokeWidth={2.5}
                  fill="url(#wg)" dot={{ r: 4, fill: '#0071e3' }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="progress-summary">
              {data.length >= 2 && (() => {
                const first = data[0].bestWeight;
                const last = data[data.length - 1].bestWeight;
                const diff = last - first;
                return diff > 0
                  ? <span className="progress-up">从 {first}kg 进步到 {last}kg，提升了 {diff}kg</span>
                  : <span style={{ color: 'var(--apple-text-secondary)' }}>保持在 {last}kg，继续加油</span>;
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── AI 教练 Modal ────────────────────────────────────────────────────────────
const AICoachModal = ({ onClose, token, embedded }) => {
  const [question, setQuestion] = useState('');
  const [reply, setReply]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [aiEnabled, setAiEnabled] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/ai/status`, { headers: { 'x-auth-token': token } })
      .then(r => r.json()).then(d => setAiEnabled(d.aiEnabled)).catch(() => setAiEnabled(false));
  }, [token]);

  const QUICK_QUESTIONS = [
    '根据我的数据，给我最重要的一条建议',
    '我应该怎么突破深蹲的瓶颈期？',
    '今天训练完感觉很疲惫，明天还要练吗？',
    '我怎么在增肌同时减少体脂？',
  ];

  const ask = async (q) => {
    setLoading(true);
    setReply('');
    try {
      const res = await fetch(`${API_URL}/api/ai/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ question: q }),
      });
      if (res.ok) {
        const d = await res.json();
        setReply(d.reply);
      }
    } catch { setReply('网络错误，请稍后再试。'); }
    setLoading(false);
  };

  const Inner = (
    <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            {!embedded && <h3 style={{ margin: 0 }}>🤖 AI 私人教练</h3>}
            {aiEnabled === false && (
              <div style={{ fontSize: 12, color: '#ff9500', marginTop: embedded ? 0 : 4 }}>
                未配置 AI Key，当前使用内置规则建议 —{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: '#ff9500' }}>
                  免费申请 Key
                </a>
              </div>
            )}
          </div>
          {!embedded && <button className="secondary" onClick={onClose} style={{ padding: '6px 14px' }}>关闭</button>}
        </div>

        {/* 快捷问题 */}
        <div className="ai-quick-questions">
          {QUICK_QUESTIONS.map((q, i) => (
            <div key={i} className="ai-quick-q" onClick={() => { setQuestion(q); ask(q); }}>
              {q}
            </div>
          ))}
        </div>

        {/* 自定义输入 */}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <input
            type="text"
            placeholder="或者直接问我任何健身问题..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && question.trim() && ask(question.trim())}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <button onClick={() => question.trim() && ask(question.trim())}
            style={{ padding: '0 18px', whiteSpace: 'nowrap' }} disabled={loading}>
            发送
          </button>
        </div>

        {/* 回复区 */}
        {loading && (
          <div className="ai-loading">
            <div className="ai-dots"><span /><span /><span /></div>
            <span>思考中...</span>
          </div>
        )}
        {reply && !loading && (
          <div className="ai-reply">
            <div className="ai-reply-label">教练建议</div>
            <div className="ai-reply-text">{reply}</div>
          </div>
        )}
    </>
  );

  if (embedded) return <div className="ai-embedded">{Inner}</div>;

  return (
    <div>
      {Inner}
    </div>
  );
};

// ─── 用户资料完善 Modal ───────────────────────────────────────────────────────
const ProfileModal = ({ onClose, onSave, currentProfile }) => {
  const [form, setForm] = useState({
    heightCm:        currentProfile?.heightCm || '',
    age:             currentProfile?.age || '',
    gender:          currentProfile?.gender || '',
    goal:            currentProfile?.goal || 'general',
    level:           currentProfile?.level || 'beginner',
    weeklyFrequency: currentProfile?.weeklyFrequency || 3,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>完善个人资料</h3>
          <button className="secondary" onClick={onClose} style={{ padding: '6px 14px' }}>取消</button>
        </div>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: 14, marginTop: -8, marginBottom: 16 }}>
          身体数据用于计算卡路里消耗和 AI 个性化建议
        </p>

        <div className="profile-form-grid">
          <div>
            <label>身高 (cm)</label>
            <input type="number" placeholder="如 175" value={form.heightCm}
              onChange={e => set('heightCm', e.target.value)} min="100" max="250" />
          </div>
          <div>
            <label>年龄</label>
            <input type="number" placeholder="如 25" value={form.age}
              onChange={e => set('age', e.target.value)} min="10" max="100" />
          </div>
          <div>
            <label>性别</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--apple-border)', fontSize: 15, fontFamily: 'inherit', background: 'white', marginTop: 8 }}>
              <option value="">不填</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label>每周训练天数</label>
            <input type="number" value={form.weeklyFrequency}
              onChange={e => set('weeklyFrequency', parseInt(e.target.value))} min="1" max="7" />
          </div>
          <div className="profile-full-row">
            <label>训练目标</label>
            <div className="profile-options">
              {[['muscle','增肌💪'],['fat_loss','减脂🔥'],['strength','增力🏋️'],['general','综合健身⚡']].map(([v,l]) => (
                <div key={v} className={`profile-option ${form.goal === v ? 'active' : ''}`}
                  onClick={() => set('goal', v)}>{l}</div>
              ))}
            </div>
          </div>
          <div className="profile-full-row">
            <label>训练水平</label>
            <div className="profile-options">
              {[['beginner','新手（< 6个月）'],['intermediate','有基础（6月 - 2年）'],['advanced','进阶（> 2年）']].map(([v,l]) => (
                <div key={v} className={`profile-option ${form.level === v ? 'active' : ''}`}
                  onClick={() => set('level', v)}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={() => onSave(form)} style={{ width: '100%', marginTop: 16 }}>保存</button>
      </div>
    </div>
  );
};

// ─── 主 Dashboard ──────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [workouts, setWorkouts]           = useState([]);
  const [stats, setStats]                 = useState(null);
  const [prs, setPrs]                     = useState([]);
  const [insights, setInsights]           = useState([]);
  const [bodyWeightLog, setBodyWeightLog] = useState([]);
  const [templates, setTemplates]         = useState([]);
  const [todayPlan, setTodayPlan]         = useState([]);
  const [userProfile, setUserProfile]     = useState(null);

  const [period, setPeriod]               = useState('all');
  const [activeTab, setActiveTab]         = useState('overview');
  const [progressExercise, setProgressExercise] = useState(null);
  const [showBWModal, setShowBWModal]     = useState(false);
  const [showAICoach, setShowAICoach]     = useState(false);
  const [showProfile, setShowProfile]     = useState(false);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      const [wRes, sRes, prRes, insRes, bwRes, profRes] = await Promise.all([
        fetch(`${API_URL}/api/workouts?period=${period}`, { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/stats`,            { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/pr`,               { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/insights`,         { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/body-weight`,      { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/profile`,          { headers: { 'x-auth-token': token } }),
      ]);
      if (wRes.ok)    setWorkouts(await wRes.json());
      if (sRes.ok)    setStats(await sRes.json());
      if (prRes.ok)   setPrs(await prRes.json());
      if (insRes.ok)  setInsights(await insRes.json());
      if (bwRes.ok)   setBodyWeightLog(await bwRes.json());
      if (profRes.ok) {
        const p = await profRes.json();
        setTemplates(p.templates || []);
        setTodayPlan(p.weeklyPlan || []);
        setUserProfile(p.profile || null);
      }
    } catch (e) { console.error(e); }
  }, [token, period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // 保存用户资料
  const handleSaveProfile = async (form) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ profile: {
          heightCm:        parseInt(form.heightCm) || undefined,
          age:             parseInt(form.age) || undefined,
          gender:          form.gender || undefined,
          goal:            form.goal,
          level:           form.level,
          weeklyFrequency: parseInt(form.weeklyFrequency) || 3,
        }}),
      });
      if (res.ok) { setShowProfile(false); fetchAll(); }
    } catch (e) { console.error(e); }
  };

  // 使用免死金牌
  const handleUseShield = async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/streak-shield`, {
        method: 'POST', headers: { 'x-auth-token': token },
      });
      if (res.ok) fetchAll();
    } catch (e) { console.error(e); }
  };

  // 删除模板
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('确认删除这个模板？')) return;
    try {
      const res = await fetch(`${API_URL}/api/workouts/templates/${id}`, {
        method: 'DELETE', headers: { 'x-auth-token': token },
      });
      if (res.ok) setTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

  // 使用模板开始训练 → 跳转到 AddWorkout 并携带模板数据
  const handleStartTemplate = async (template) => {
    try {
      await fetch(`${API_URL}/api/workouts/templates/${template._id}/use`, {
        method: 'POST', headers: { 'x-auth-token': token },
      });
    } catch (e) { console.error(e); }
    navigate('/add', { state: { template } });
  };

  // 删除整条训练
  const handleDelete = async (id) => {
    if (!window.confirm('确认删除这条训练记录？')) return;
    try {
      await fetch(`${API_URL}/api/workouts/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      setWorkouts(w => w.filter(x => x._id !== id));
      fetchAll();
    } catch (e) { console.error(e); }
  };

  // 删除单组
  const handleDeleteSet = async (workoutId, setIndex) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/${workoutId}/set/${setIndex}`, {
        method: 'DELETE', headers: { 'x-auth-token': token },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.deleted) setWorkouts(w => w.filter(x => x._id !== workoutId));
        else setWorkouts(w => w.map(x => x._id === workoutId ? result : x));
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveBW = async (date, weight) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/body-weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ date, weight }),
      });
      if (res.ok) { setBodyWeightLog(await res.json()); setShowBWModal(false); }
    } catch (e) { console.error(e); }
  };

  // ── 数据处理 ──
  const groupedWorkouts = workouts.reduce((acc, w) => {
    const rawDate = new Date(w.date);
    const key = rawDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    if (!acc[key]) acc[key] = { rawDate, items: [], totalVol: 0, totalCals: 0 };
    acc[key].items.push(w);
    if (w.type === 'strength') acc[key].totalVol += w.sets.reduce((a, s) => a + s.weight * s.reps, 0);
    else acc[key].totalCals += w.sets.reduce((a, s) => a + (s.reps || 0), 0);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedWorkouts).sort(
    (a, b) => groupedWorkouts[b].rawDate - groupedWorkouts[a].rawDate
  );

  const chartData = [...sortedDates].reverse().map(k => ({
    date: groupedWorkouts[k].rawDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    vol: groupedWorkouts[k].totalVol,
  })).filter(d => d.vol > 0);

  // V6.0 Calendar logic
  const activeDaysSet = new Set(workouts.map(w => new Date(w.date).toLocaleDateString('zh-CN')));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const generateCalendar = () => {
    const days = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({
        date: d,
        active: activeDaysSet.has(d.toLocaleDateString('zh-CN')),
        isToday: i === 0
      });
    }
    return days;
  };
  const calendarDays = generateCalendar();
  
  const getInsightMessage = () => {
    const activeDaysThisWeek = calendarDays.slice(-7).filter(d => d.active).length;
    if (workouts.length === 0) return { type: 'info', emoji: '💡', text: '开启你的第一次训练吧！' };
    if (activeDaysThisWeek >= 4) return { type: 'fire', emoji: '🔥', text: '状态火热！你这周的训练超越了 90% 的用户。' };
    if (activeDaysThisWeek >= 2) return { type: 'info', emoji: '💪', text: '保持着不错的节奏，汗水不会骗人。' };
    if (activeDaysThisWeek === 1) return { type: 'info', emoji: '👍', text: '好的开始是成功的一半，明天继续吗？' };
    return { type: 'warning', emoji: '🔋', text: '休息得不错！是时候重新找回训练节奏了。' };
  };
  const insight = getInsightMessage();

  const bwChartData = [...bodyWeightLog]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30)
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      weight: e.weight,
    }));

  const latestBW = bodyWeightLog.length > 0
    ? [...bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight
    : null;

  const TABS = [
    { key: 'overview',  label: '总览' },
    { key: 'history',   label: '训练历史' },
    { key: 'pr',        label: '个人记录' },
    { key: 'templates', label: '训练模板' },
    { key: 'body',      label: '体重' },
  ];

  return (
    <div>
      {/* ── Nav ── */}
      <nav className="nav">
        <span className="nav-brand">💪 FitTrack</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && <span className="nav-greeting">{user.username}</span>}
          <Link to="/add"><button style={{ padding: '7px 16px', fontSize: 14 }}>+ 记录训练</button></Link>
          <button className="secondary" onClick={() => setShowProfile(true)} style={{ padding: '7px 14px', fontSize: 14 }}>资料</button>
          <button className="secondary" onClick={logout} style={{ padding: '7px 14px', fontSize: 14 }}>退出</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="hero-section">
        <h1 style={{ marginTop: 36, marginBottom: 6 }}>
          {user ? `${user.username}，` : ''}{stats?.streak > 0 ? `第 ${stats.streak} 天` : '今天'}
        </h1>
        <p style={{ color: 'var(--apple-text-secondary)', fontSize: 17, marginBottom: 28 }}>
          {stats?.streak > 2
            ? `连续打卡 ${stats.streak} 天，保持下去`
            : '记录每一次训练，见证自己的成长'}
        </p>

      {/* ── 规则智能洞察 & 打卡日历 ── */}
      <div className="calendar-container">
        <div className="calendar-header">
          <h3>最近 28 天打卡</h3>
          <div className={`insight-badge ${insight.type}`}>
            {insight.emoji} {insight.text}
          </div>
        </div>
        <div className="calendar-grid">
          {calendarDays.map((day, i) => (
            <div 
              key={i} 
              className={`calendar-square ${day.active ? 'active' : ''} ${day.isToday ? 'today' : ''}`} 
              title={day.date.toLocaleDateString('zh-CN')} 
            />
          ))}
        </div>
      </div>

        {/* 今天练什么 */}
        <TodayCard todayPlan={todayPlan} templates={templates} onStartTemplate={handleStartTemplate} />

        {/* 个人里程碑 */}
        <PersonalMilestones prs={prs} stats={stats} />
      </div>

      {/* ── Tabs ── */}
      <div className="content-tabs">
        {TABS.map(t => (
          <div key={t.key}
            className={`content-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ══════════ 总览 Tab ══════════ */}
      {activeTab === 'overview' && (
        <div className="overview-grid">
          {/* streak */}
          {stats && (
            <StreakWidget
              streak={stats.streak}
              longestStreak={stats.longestStreak}
              shield={stats.streakShield}
              onUseShield={handleUseShield}
            />
          )}

          {/* 核心数据卡 */}
          <div className="stats-grid-2">
            {[
              { label: '训练次数',  val: stats?.totalWorkouts ?? '—',  unit: '次',  color: null },
              { label: '活跃天数',  val: stats?.activeDays ?? '—',     unit: '天',  color: null },
              { label: '力量总量',  val: stats ? (stats.totalVolume / 1000).toFixed(1) : '—', unit: '吨', color: '0,113,227' },
              { label: '有氧消耗',  val: stats?.totalCardioCalories ?? '—', unit: '千卡', color: '255,149,0' },
              ...(latestBW ? [{ label: '当前体重', val: latestBW, unit: 'kg', color: '52,199,89' }] : []),
            ].map((c, i) => (
              <div key={i} className="stat-card-2" style={c.color ? {
                background: `rgba(${c.color},0.05)`,
                border: `1px solid rgba(${c.color},0.18)`,
              } : {}}>
                <div className="stat-card-2-label" style={c.color ? { color: `rgb(${c.color})` } : {}}>{c.label}</div>
                <div className="stat-card-2-value" style={c.color ? { color: `rgb(${c.color})` } : {}}>{c.val}</div>
                <div className="stat-card-2-unit">{c.unit}</div>
              </div>
            ))}
          </div>

          {/* 力量趋势迷你图 */}
          {chartData.length >= 2 && (
            <div className="mini-chart-card">
              <div className="mini-chart-title">力量训练量趋势</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="volG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0071e3" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--apple-text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                    formatter={v => [`${v.toLocaleString()} kg`, '训练量']} />
                  <Area type="monotone" dataKey="vol" stroke="#0071e3" strokeWidth={2}
                    fill="url(#volG)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 成就 */}
          {stats && stats.achievements.length > 0 && (
            <div className="achievements-section">
              <div className="achievements-title">
                已解锁成就
                <span className="achievements-count">{stats.achievements.length} / {Object.keys(ACHIEVEMENTS).length}</span>
              </div>
              <div className="achievements-row">
                {Object.keys(ACHIEVEMENTS).map(id => {
                  const unlocked = stats.achievements.includes(id);
                  const def = ACHIEVEMENTS[id];
                  return (
                    <div key={id} className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`} title={def.desc}>
                      <span className="badge-icon">{def.icon}</span>
                      <span className="badge-name">{def.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ 训练历史 Tab ══════════ */}
      {activeTab === 'history' && (
        <>
          <div className="period-filter">
            {[{ k: 'week', l: '近7天' }, { k: 'month', l: '近30天' }, { k: 'all', l: '全部' }].map(p => (
              <button key={p.k}
                className={period === p.k ? '' : 'secondary'}
                style={{ padding: '6px 16px', fontSize: 14 }}
                onClick={() => setPeriod(p.k)}>
                {p.l}
              </button>
            ))}
          </div>

          {chartData.length >= 2 && (
            <div className="chart-container" style={{ marginBottom: 28 }}>
              <h3>训练量趋势</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="volG2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0071e3" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#0071e3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                    formatter={v => [`${v.toLocaleString()} kg`, '训练量']} />
                  <Area type="monotone" dataKey="vol" stroke="#0071e3" strokeWidth={2.5}
                    fill="url(#volG2)" dot={{ r: 3, fill: '#0071e3' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {workouts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏋️</div>
              <h3>从第一次训练开始</h3>
              <p>记录你的训练，几周后就能看到清晰的进步曲线</p>
              <Link to="/add"><button style={{ marginTop: 20 }}>记录第一次训练</button></Link>
            </div>
          ) : (
            <div className="daily-groupings">
              {sortedDates.map(dateKey => {
                const day = groupedWorkouts[dateKey];
                return (
                  <div key={dateKey} className="daily-group">
                    <div className="daily-header">
                      <h3>{dateKey}</h3>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {day.totalVol > 0 && <span className="daily-meta">{day.totalVol.toLocaleString()} kg</span>}
                        {day.totalCals > 0 && <span className="daily-meta" style={{ color: '#ff9500' }}>🔥 {day.totalCals} 千卡</span>}
                      </div>
                    </div>
                    {day.items.map(w => (
                      <div key={w._id} className={`exercise-card ${w.type === 'cardio' ? 'cardio-card' : ''}`}>
                        <div className="exercise-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{w.type === 'cardio' ? '🏃' : '🏋️'}</span>
                            <div>
                              <h4 style={{ margin: 0 }}>{w.exercise}</h4>
                              {w.type === 'strength' && (
                                <span className="progress-link" onClick={() => setProgressExercise(w.exercise)}>
                                  查看进步曲线 →
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="delete-btn" onClick={() => handleDelete(w._id)}>删除</button>
                        </div>
                        <div className="set-list">
                          {w.sets.map((s, i) => (
                            <div key={i} className="set-item">
                              {w.type === 'strength' && <span className="set-item-index">#{i + 1}</span>}
                              {w.type === 'cardio' ? (
                                <><span>{s.weight} 分钟</span><span style={{ color: '#ff9500' }}>{s.reps} 千卡</span></>
                              ) : (
                                <><span>{s.weight === 0 ? '自重' : `${s.weight} kg`}</span><span>{s.reps} 次</span></>
                              )}
                              <button className="set-delete-btn" onClick={() => handleDeleteSet(w._id, i)}>×</button>
                            </div>
                          ))}
                        </div>
                        {w.notes && <div className="exercise-notes">{w.notes}</div>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════ 个人记录 Tab ══════════ */}
      {activeTab === 'pr' && (
        <div>
          <h2 style={{ marginBottom: 20 }}>个人最佳记录</h2>
          {prs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <h3>还没有个人记录</h3>
              <p>完成力量训练后，每个动作的最佳成绩会自动统计在这里</p>
            </div>
          ) : (
            <div className="pr-list">
              {prs.map((pr, idx) => (
                <div key={pr.exercise} className="pr-card">
                  <div className="pr-rank">{['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`}</div>
                  <div className="pr-info">
                    <div className="pr-exercise">{pr.exercise}</div>
                    <div className="pr-date">
                      {new Date(pr.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="pr-stats">
                    <div className="pr-weight">{pr.weight === 0 ? '自重' : `${pr.weight} kg`}</div>
                    <div className="pr-reps">× {pr.reps} 次</div>
                  </div>
                  <button className="secondary" style={{ fontSize: 13, padding: '6px 12px' }}
                    onClick={() => setProgressExercise(pr.exercise)}>
                    进步曲线
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ 训练模板 Tab ══════════ */}
      {activeTab === 'templates' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>训练模板</h2>
          </div>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: 15, marginBottom: 24, marginTop: -8 }}>
            保存常用训练组合，下次一键加载，减少选动作的时间
          </p>
          <TemplateManager
            templates={templates}
            onStartTemplate={handleStartTemplate}
            onDelete={handleDeleteTemplate}
            onCreateNew={() => navigate('/add')}
          />
        </div>
      )}

      {/* ══════════ 体重 Tab ══════════ */}
      {activeTab === 'body' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0 }}>体重趋势</h2>
            <button onClick={() => setShowBWModal(true)} style={{ padding: '8px 18px', fontSize: 14 }}>记录体重</button>
          </div>
          {bwChartData.length < 2 ? (
            <div className="empty-state">
              <div className="empty-icon">⚖️</div>
              <h3>开始追踪体重变化</h3>
              <p>每天记录一次，30天后你将看到清晰的身体变化趋势</p>
              <button style={{ marginTop: 20 }} onClick={() => setShowBWModal(true)}>记录今日体重</button>
            </div>
          ) : (
            <div className="chart-container">
              <h3>近30天体重</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={bwChartData}>
                  <defs>
                    <linearGradient id="bwG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34c759" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#34c759" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--apple-text-secondary)', fontSize: 12 }}
                    unit="kg" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                    formatter={v => [`${v} kg`, '体重']} />
                  <Area type="monotone" dataKey="weight" stroke="#34c759" strokeWidth={2.5}
                    fill="url(#bwG)" dot={{ r: 4, fill: '#34c759' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="bw-log">
                {[...bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map((e, i) => (
                  <div key={i} className="bw-item">
                    <span>{new Date(e.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
                    <span className="bw-value">{e.weight} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 模态框 ── */}
      {progressExercise && (
        <ProgressModal exercise={progressExercise} onClose={() => setProgressExercise(null)} token={token} />
      )}
      {showBWModal && (
        <BodyWeightModal onClose={() => setShowBWModal(false)} onSave={handleSaveBW} />
      )}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          onSave={handleSaveProfile}
          currentProfile={userProfile}
        />
      )}
    </div>
  );
};

export default Dashboard;
