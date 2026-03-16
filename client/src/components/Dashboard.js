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
        <div className="empty-state">
          <h3 style={{ }}>暂无训练模板</h3>
          <p style={{ color: 'var(--apple-text-secondary)', fontSize: 13 }}>创建一个固定的训练计划，提升效率。</p>
          <Link to="/add">
            <button style={{ marginTop: 16 }}>开始第一次训练</button>
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
              <div className="template-exercises" style={{ fontSize: 11 }}>
              {t.exercises.map(e => e.exercise).join(' · ')}
            </div>
            {t.lastUsed && (
                <div className="template-meta" style={{ fontSize: 10, color: 'var(--apple-text-secondary)' }}>
                  上次使用: {new Date(t.lastUsed).toLocaleDateString('zh-CN')}
                  {t.useCount > 1 && ` // 共 ${t.useCount} 次`}
                </div>
            )}
          </div>
          <div className="template-actions">
            <button onClick={() => onStartTemplate(t)}>开始</button>
            <button className="secondary" style={{ padding: '14px 16px' }}
              onClick={() => onDelete(t._id)}>删</button>
          </div>
        </div>
      ))}
      <button className="secondary template-new-btn" onClick={onCreateNew} style={{ fontWeight: 600 }}>
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
          身体数据用于计算卡路里消耗和训练记录
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

  // V6.0 Calendar logic - 标准月历视图
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  
  // 获取当月有多少天
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  // 获取当月第一天是周几 (0-6)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const activeDaysSet = new Set(workouts.map(w => new Date(w.date).toLocaleDateString('zh-CN')));
  
  const generateCalendar = () => {
    const days = [];
    // 补齐月初空白
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const isToday = i === today.getDate();
      days.push({
        date: d,
        dayNum: i,
        active: activeDaysSet.has(d.toLocaleDateString('zh-CN')),
        isToday
      });
    }
    return days;
  };
  const calendarDays = generateCalendar();
  
  const getInsightMessage = () => {
    // 计算本周打卡次数
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 周日
    const thisWeekWorkouts = workouts.filter(w => new Date(w.date) >= startOfWeek);
    const count = new Set(thisWeekWorkouts.map(w => new Date(w.date).toLocaleDateString())).size;

    if (workouts.length === 0) return { type: 'info', text: '开启第一次训练' };
    if (count >= 4) return { type: 'fire', text: '本周状态极佳' };
    if (count >= 2) return { type: 'info', text: '保持节奏' };
    return { type: 'warning', text: '该运动了' };
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
    { key: 'history',   label: '历史' },
    { key: 'templates', label: '模板' },
    { key: 'pr',        label: '纪录' },
    { key: 'body',      label: '体重' },
  ];

  return (
    <div>
      {/* ── Nav ── */}
      <nav className="nav">
        <span className="nav-brand">💪 健身日记</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/add"><button className="nav-btn-primary">+ 记录</button></Link>
          <button className="nav-btn-icon" onClick={() => setShowProfile(true)} title="设置">⚙️</button>
          <button className="nav-btn-icon" onClick={logout} title="退出">🚪</button>
        </div>
      </nav>
      
      {/* ── Hero ── */}
      <div className="hero-section">
        <div className="hero-header">
          <h1 className="hero-greeting">
            {(() => {
              const h = new Date().getHours();
              if (h < 11) return '早上好';
              if (h < 13) return '中午好';
              if (h < 18) return '下午好';
              return '晚上好';
            })()}，{user?.username || '朋友'}
          </h1>
          <p className="hero-date">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

      {/* ── Tabs ── */}
      <div className="content-tabs" style={{ marginTop: 32 }}>
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
          {/* ── Bento Grid 核心布局 (仅在总览显示) ── */}
          <div className="bento-grid">
            
            {/* 左侧：日历大卡片 */}
            <div className="bento-item calendar-card">
              <div className="card-header">
                <h3>{new Date().getMonth() + 1}月打卡</h3>
                <div className={`status-pill ${insight.type}`}>{insight.text}</div>
              </div>
              <div className="calendar-weekdays">
                {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="calendar-grid">
                {calendarDays.map((day, i) => (
                  <div key={i} className={`calendar-cell ${day ? '' : 'empty'} ${day?.active ? 'active' : ''} ${day?.isToday ? 'today' : ''}`}>
                    {day && day.dayNum}
                  </div>
                ))}
              </div>
            </div>

            {/* 右侧：今日计划 & 数据 */}
            <div className="bento-col">
              
              {/* 1. 今日训练卡片 */}
              <div className="bento-item today-card-new">
                <div className="card-header">
                  <h3>今日计划</h3>
                  <span className="today-badge">Today</span>
                </div>
                {(() => {
                  const todayDow = new Date().getDay();
                  const plan = todayPlan?.find(p => p.dayOfWeek === todayDow);
                  const template = plan?.templateId ? templates.find(t => t._id === plan.templateId) : null;

                  if (!plan) return <div className="today-placeholder">今天没有安排计划</div>;
                  if (plan.isRestDay) return (
                    <div className="today-content-row">
                      <div className="today-icon rest">💤</div>
                      <div>
                        <div className="today-main-text">休息日</div>
                        <div className="today-sub-text">肌肉在休息中生长</div>
                      </div>
                    </div>
                  );
                  if (template) return (
                    <div className="today-content-row">
                      <div className="today-icon train">🏋️</div>
                      <div style={{ flex: 1 }}>
                        <div className="today-main-text">{template.name}</div>
                        <div className="today-sub-text">{template.exercises.length} 个动作</div>
                      </div>
                      <button className="small-action-btn" onClick={() => handleStartTemplate(template)}>开始</button>
                    </div>
                  );
                  return (
                    <div className="today-content-row">
                      <div className="today-icon plan">📝</div>
                      <div>
                        <div className="today-main-text">{plan.label || '自由训练'}</div>
                        <div className="today-sub-text">去健身房练点什么？</div>
                      </div>
                      <Link to="/add"><button className="small-action-btn">记录</button></Link>
                    </div>
                  );
                })()}
              </div>

              {/* 2. 数据概览小卡片组 */}
              <div className="bento-row">
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">总容量</div>
                  <div className="stat-value">{stats ? (stats.totalVolume / 1000).toFixed(1) : '-'}</div>
                  <div className="stat-unit">吨</div>
                </div>
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">总消耗</div>
                  <div className="stat-value">{stats?.totalCardioCalories || '-'}</div>
                  <div className="stat-unit">千卡</div>
                </div>
              </div>

              {/* 3. 体重趋势预览 */}
              <div className="bento-item chart-mini-card" onClick={() => setActiveTab('body')}>
                <div className="card-header-mini">
                  <span>体重趋势</span>
                  <span className="trend-arrow">↗</span>
                </div>
                <div style={{ height: 60, marginTop: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bwChartData}>
                       <defs>
                        <linearGradient id="bwMini" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34c759" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#34c759" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="weight" stroke="#34c759" strokeWidth={2} fill="url(#bwMini)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>

          {/* 成就 (保留在 Bento Grid 下方) */}
          {stats && stats.achievements.length > 0 && (
            <div className="achievements-section" style={{ marginTop: 0 }}>
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
          <div className="period-filter" style={{ gap: '12px' }}>
            {[{ k: 'week', l: '最近7天' }, { k: 'month', l: '最近30天' }, { k: 'all', l: '全部' }].map(p => (
              <button key={p.k}
                className={period === p.k ? '' : 'secondary'}
                style={{ padding: '8px 20px', borderRadius: '4px' }}
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
        <div className="empty-state" style={{ border: '1px dashed var(--apple-border)', background: 'transparent', boxShadow: 'none' }}>
          <div className="empty-icon">📝</div>
          <h3>暂无记录</h3>
          <p>从今天开始，记录你的第一次训练。</p>
          <Link to="/add"><button style={{marginTop: '20px', borderRadius: '4px'}}>开始记录</button></Link>
        </div>
      ) : (
        <div className="daily-groupings">
          {sortedDates.map(dateKey => {
            const day = groupedWorkouts[dateKey];
            return (
              <div key={dateKey} className="daily-group" style={{ borderLeft: '4px solid var(--apple-blue)', paddingLeft: '20px', marginLeft: '10px' }}>
                <div className="daily-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <h3 style={{ fontSize: '20px' }}>{dateKey}</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {day.totalVol > 0 && <span className="daily-meta" style={{ fontFamily: 'var(--apple-font)', color: 'var(--apple-text)' }}>容量: {day.totalVol.toLocaleString()} KG</span>}
                    {day.totalCals > 0 && <span className="daily-meta" style={{ fontFamily: 'var(--apple-font)', color: '#ff9500' }}>消耗: {day.totalCals} KCAL</span>}
                  </div>
                </div>
                {day.items.map(w => (
                  <div key={w._id} className={`exercise-card ${w.type === 'cardio' ? 'cardio-card' : ''}`} style={{ borderRadius: '8px', border: '1px solid var(--apple-border)', boxShadow: 'none', marginBottom: '16px' }}>
                    <div className="exercise-header" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h4 style={{ fontSize: '16px', letterSpacing: '0.02em', margin: 0 }}>{w.exercise}</h4>
                      </div>
                      <button className="delete-btn" style={{ background: 'transparent', color: 'var(--apple-text-secondary)', padding: '4px 8px' }} onClick={() => handleDelete(w._id)}>X</button>
                    </div>
                    <div className="set-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {w.sets.map((s, i) => (
                        <div key={i} className="set-item" style={{ display: 'flex', justifyContent: 'space-between', background: 'transparent', borderBottom: '1px dotted rgba(0,0,0,0.1)', borderRadius: 0, padding: '4px 0', fontSize: '14px', fontFamily: 'monospace' }}>
                          {w.type === 'strength' && <span className="set-item-index" style={{ width: '30px', color: 'var(--apple-text-secondary)' }}>S{String(i + 1).padStart(2, '0')}</span>}
                          {w.type === 'cardio' ? (
                            <>
                              <span>{s.weight} MIN</span>
                              <span style={{ color: '#ff9500' }}>{s.reps} KCAL</span>
                            </>
                          ) : (
                            <>
                              <span>{s.weight === 0 ? 'BW' : `${s.weight} KG`}</span>
                              <span>x {String(s.reps).padStart(2, '0')}</span>
                            </>
                          )}
                          <button className="set-delete-btn" style={{ background: 'transparent', color: 'var(--apple-text-secondary)', padding: '0 8px', border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteSet(w._id, i)}>×</button>
                        </div>
                      ))}
                    </div>
                    {w.notes && <div className="exercise-notes" style={{marginTop: '12px', fontSize: '13px', color: 'var(--apple-text-secondary)', borderLeft: '2px solid var(--apple-border)', paddingLeft: '8px', background: 'transparent'}}>{w.notes}</div>}
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
            <h2 style={{ margin: 0, fontSize: '18px' }}>我的训练计划</h2>
          </div>
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
