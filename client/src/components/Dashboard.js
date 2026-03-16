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

// ─── 日期工具：将任意日期转为 YYYY-MM-DD（本地时区）────────────────────────────
const toLocalDateStr = (dateInput) => {
  const d = new Date(dateInput);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── 月历组件（完全独立，支持多月导航）──────────────────────────────────────────
const MonthCalendar = ({ activeDates }) => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  const activeDateSet = new Set(activeDates || []);

  // 当月信息
  const daysInMonth   = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday  = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sunday
  const todayStr      = toLocalDateStr(today);

  // 本月打卡天数
  const thisMonthCount = [...activeDateSet].filter(d => {
    const [y, m] = d.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth;
  }).length;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    // 不允许超过今天所在月
    const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  // 生成日历格子
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      dateStr,
      isToday:  dateStr === todayStr,
      isActive: activeDateSet.has(dateStr),
      isFuture: dateStr > todayStr,
    });
  }

  // 状态文字
  const getInsight = () => {
    if (!isCurrentMonth) return null;
    const dow = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dow);
    const weekStartStr = toLocalDateStr(weekStart);
    const weekCount = [...activeDateSet].filter(d => d >= weekStartStr && d <= todayStr).length;
    if (weekCount >= 4) return { type: 'fire', text: '本周状态极佳' };
    if (weekCount >= 2) return { type: 'info', text: '保持节奏' };
    if (weekCount === 1) return { type: 'info', text: '继续加油' };
    return { type: 'warning', text: '今天开始打卡' };
  };
  const insight = getInsight();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0 }}>{monthName}</h3>
          {thisMonthCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: 'var(--c-blue-dim)', color: 'var(--c-blue)',
              padding: '3px 8px', borderRadius: 99,
              letterSpacing: '0.04em',
            }}>
              {thisMonthCount}次
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {insight && (
            <span className={`status-pill ${insight.type}`} style={{ marginRight: 8 }}>
              {insight.text}
            </span>
          )}
          <button className="calendar-nav-btn" onClick={prevMonth} title="上个月">‹</button>
          <button
            className="calendar-nav-btn"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
            title="下个月"
          >›</button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="calendar-weekdays">
        {['日','一','二','三','四','五','六'].map(d => <div key={d}>{d}</div>)}
      </div>

      {/* Day Grid */}
      <div className="calendar-grid">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="calendar-cell empty" />;
          return (
            <div
              key={cell.dateStr}
              className={[
                'calendar-cell',
                cell.isActive  ? 'active'  : '',
                cell.isToday   ? 'today'   : '',
                cell.isFuture  ? 'future'  : '',
              ].join(' ').trim()}
              title={cell.isActive ? `${cell.dateStr} 已打卡` : cell.dateStr}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Streak Widget ────────────────────────────────────────────────────────────
const StreakWidget = ({ streak, longestStreak, shield, onUseShield }) => {
  const isStrong = streak >= 7;
  const pct = longestStreak > 0 ? Math.min(100, (streak / longestStreak) * 100) : 0;

  return (
    <div style={{
      background: 'var(--text-1)',
      borderRadius: 'var(--r-xl)',
      padding: '20px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>{streak}</div>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginTop: 2 }}>天连续打卡</div>
        </div>
        <div style={{ fontSize: 32 }}>{streak === 0 ? '💤' : isStrong ? '🔥' : '✨'}</div>
      </div>

      {longestStreak > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'white', borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, fontWeight: 600 }}>
            <span>当前 {streak}</span>
            <span>最长 {longestStreak}</span>
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px', lineHeight: 1.4, opacity: 0.9 }}>
        {streak === 0 ? '今天训练，开启连续打卡' :
         streak < 3  ? `再 ${3 - streak} 天解锁「三连打卡」` :
         streak < 7  ? `再 ${7 - streak} 天解锁「一周不间断」` :
         streak < 30 ? `再 ${30 - streak} 天解锁「钢铁意志」` :
         '连续打卡30天，你是真正的自律者 💎'}
      </div>

      {shield > 0 && streak === 0 && (
        <button
          onClick={onUseShield}
          style={{ width: '100%', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 13, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', marginTop: 10, cursor: 'pointer' }}
        >
          🛡️ 使用免死金牌（剩余 {shield} 次）
        </button>
      )}
    </div>
  );
};

// ─── Template Manager ─────────────────────────────────────────────────────────
const TemplateManager = ({ templates, onStartTemplate, onDelete, onCreateNew }) => {
  if (templates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>暂无训练模板</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24 }}>创建固定计划，每次训练更高效</div>
        <Link to="/add"><button style={{ padding: '12px 28px' }}>开始第一次训练</button></Link>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {templates.map(t => (
        <div key={t._id} style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-l)',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transition: 'box-shadow 0.2s',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t.exercises.map(e => e.exercise).join(' · ')}
            </div>
            {t.lastUsed && (
              <div style={{ fontSize: 11, color: 'var(--c-blue)', marginTop: 3, fontWeight: 500 }}>
                上次使用 {new Date(t.lastUsed).toLocaleDateString('zh-CN')}
                {t.useCount > 1 && ` · 共 ${t.useCount} 次`}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => onStartTemplate(t)} style={{ padding: '9px 18px', fontSize: 14 }}>开始</button>
            <button
              className="secondary"
              onClick={() => onDelete(t._id)}
              style={{ padding: '9px 14px', fontSize: 14, color: 'var(--c-red)' }}
            >删</button>
          </div>
        </div>
      ))}
      <button
        className="secondary"
        onClick={onCreateNew}
        style={{ border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-3)', padding: 16, fontSize: 14, fontWeight: 600, borderRadius: 'var(--r-l)', marginTop: 4 }}
      >
        + 新建模板
      </button>
    </div>
  );
};

// ─── Body Weight Modal ────────────────────────────────────────────────────────
const BodyWeightModal = ({ onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3>记录体重</h3>
        <label>日期</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <label>体重 (kg)</label>
        <input
          type="number" step="0.1" min="20" max="300"
          placeholder="例如 72.5" value={weight}
          onChange={e => setWeight(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="secondary" onClick={onClose} style={{ flex: 1 }}>取消</button>
          <button onClick={() => weight && onSave(date, parseFloat(weight))} style={{ flex: 2 }} disabled={!weight}>
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Progress Modal ───────────────────────────────────────────────────────────
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
          <h3 style={{ margin: 0 }}>{exercise}</h3>
          <button className="secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: 13 }}>关闭</button>
        </div>
        {chartData.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
            至少需要2次训练记录才能显示进步曲线
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--c-blue)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--c-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 12 }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-l)', fontSize: 13 }}
                  formatter={v => [`${v} kg`, '最高重量']}
                />
                <Area type="monotone" dataKey="weight" stroke="var(--c-blue)" strokeWidth={2.5} fill="url(#wg)" dot={{ r: 4, fill: 'var(--c-blue)' }} />
              </AreaChart>
            </ResponsiveContainer>
            {data.length >= 2 && (() => {
              const first = data[0].bestWeight;
              const last  = data[data.length - 1].bestWeight;
              const diff  = +(last - first).toFixed(1);
              return (
                <div style={{ marginTop: 14, textAlign: 'center', fontSize: 14, fontWeight: 600,
                  color: diff > 0 ? 'var(--c-green)' : 'var(--text-3)',
                  background: diff > 0 ? 'var(--c-green-dim)' : 'var(--surface-3)',
                  borderRadius: 10, padding: '8px 16px', display: 'inline-block', marginLeft: '50%', transform: 'translateX(-50%)',
                }}>
                  {diff > 0 ? `从 ${first}kg 进步到 ${last}kg，提升了 ${diff}kg` : `保持在 ${last}kg，继续加油`}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Profile Modal ────────────────────────────────────────────────────────────
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
        <h3>个人资料</h3>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: -14, marginBottom: 20 }}>
          用于计算卡路里消耗和个性化训练建议
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>身高 (cm)</label>
            <input type="number" placeholder="175" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} min="100" max="250" />
          </div>
          <div>
            <label>年龄</label>
            <input type="number" placeholder="25" value={form.age} onChange={e => set('age', e.target.value)} min="10" max="100" />
          </div>
          <div>
            <label>性别</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">不填</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label>每周训练天数</label>
            <input type="number" value={form.weeklyFrequency} onChange={e => set('weeklyFrequency', parseInt(e.target.value))} min="1" max="7" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>训练目标</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {[['muscle','增肌'],['fat_loss','减脂'],['strength','增力'],['general','综合']].map(([v,l]) => (
                <div key={v}
                  onClick={() => set('goal', v)}
                  style={{
                    padding: '8px 16px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: form.goal === v ? 'var(--c-blue)' : 'var(--surface-3)',
                    color: form.goal === v ? '#fff' : 'var(--text-2)',
                  }}
                >{l}</div>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>训练水平</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {[['beginner','新手'],['intermediate','有基础'],['advanced','进阶']].map(([v,l]) => (
                <div key={v}
                  onClick={() => set('level', v)}
                  style={{
                    padding: '8px 16px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                    background: form.level === v ? 'var(--text-1)' : 'var(--surface-3)',
                    color: form.level === v ? '#fff' : 'var(--text-2)',
                  }}
                >{l}</div>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => onSave(form)} style={{ width: '100%', marginTop: 20 }}>保存</button>
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
  const [loading, setLoading]             = useState(true);

  const [period, setPeriod]               = useState('all');
  const [activeTab, setActiveTab]         = useState('overview');
  const [progressExercise, setProgressExercise] = useState(null);
  const [showBWModal, setShowBWModal]     = useState(false);
  const [showProfile, setShowProfile]     = useState(false);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wRes, sRes, prRes, insRes, bwRes, profRes] = await Promise.all([
        fetch(`${API_URL}/api/workouts?period=${period}`,  { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/stats`,             { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/pr`,                { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/insights`,          { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/body-weight`,       { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/profile`,           { headers: { 'x-auth-token': token } }),
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
    finally { setLoading(false); }
  }, [token, period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

  const handleUseShield = async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/streak-shield`, {
        method: 'POST', headers: { 'x-auth-token': token },
      });
      if (res.ok) fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('确认删除这个模板？')) return;
    try {
      const res = await fetch(`${API_URL}/api/workouts/templates/${id}`, {
        method: 'DELETE', headers: { 'x-auth-token': token },
      });
      if (res.ok) fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleStartTemplate = async (template) => {
    try {
      await fetch(`${API_URL}/api/workouts/templates/${template._id}/use`, {
        method: 'POST', headers: { 'x-auth-token': token },
      });
    } catch (e) { console.error(e); }
    navigate('/add', { state: { template } });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确认删除这条训练记录？')) return;
    try {
      await fetch(`${API_URL}/api/workouts/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      setWorkouts(w => w.filter(x => x._id !== id));
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleDeleteSet = async (workoutId, setIndex) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/${workoutId}/set/${setIndex}`, {
        method: 'DELETE', headers: { 'x-auth-token': token },
      });
      if (res.ok) fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleSaveBW = async (date, weight) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/body-weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ date, weight }),
      });
      if (res.ok) { fetchAll(); setShowBWModal(false); }
    } catch (e) { console.error(e); }
  };

  // ── 数据处理 ──
  // 从所有workouts中提取打卡日期集合（全量，不受period过滤影响时用stats）
  const allActiveDates = workouts.map(w => toLocalDateStr(w.date));

  const groupedWorkouts = workouts.reduce((acc, w) => {
    const rawDate = new Date(w.date);
    const key = rawDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
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

  const h = new Date().getHours();
  const greeting = h < 6 ? '夜深了' : h < 11 ? '早上好' : h < 13 ? '中午好' : h < 18 ? '下午好' : '晚上好';

  return (
    <div>
      {/* ── Nav ── */}
      <nav className="nav">
        <span className="nav-brand">IRON</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/add">
            <button className="nav-btn-primary">+ 训练</button>
          </Link>
          <button className="nav-btn-icon" onClick={() => setShowProfile(true)} title="个人资料" style={{ fontSize: 17 }}>⚙</button>
          <button className="nav-btn-icon" onClick={logout} title="退出" style={{ fontSize: 16 }}>↗</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="hero-section">
        <p className="hero-date">
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
        <h1 className="hero-greeting">
          {greeting}，{user?.username || '朋友'}
        </h1>
      </div>

      {/* ── Tabs ── */}
      <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 20px' }}>
        <div className="content-tabs">
          {TABS.map(t => (
            <div
              key={t.key}
              className={`content-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >{t.label}</div>
          ))}
        </div>
      </div>

      {/* ══════════ 总览 Tab ══════════ */}
      {activeTab === 'overview' && (
        <div className="overview-grid">
          <div className="bento-grid">
            {/* 左：日历（重写，支持多月导航，bug全修） */}
            <div className="bento-item calendar-card">
              <MonthCalendar activeDates={allActiveDates} />
            </div>

            {/* 右列 */}
            <div className="bento-col">
              {/* 今日计划 */}
              <div className="bento-item today-card-new">
                <div className="card-header">
                  <h3>今日计划</h3>
                  <span className="today-badge">TODAY</span>
                </div>
                {(() => {
                  const todayDow = new Date().getDay();
                  const plan = todayPlan?.find(p => p.dayOfWeek === todayDow);
                  const template = plan?.templateId ? templates.find(t => t._id === plan.templateId) : null;

                  if (!plan) return (
                    <div className="today-content-row">
                      <div className="today-icon">📅</div>
                      <div>
                        <div className="today-main-text">自由安排</div>
                        <div className="today-sub-text">去做点什么？</div>
                      </div>
                      <Link to="/add"><button className="small-action-btn">记录</button></Link>
                    </div>
                  );
                  if (plan.isRestDay) return (
                    <div className="today-content-row">
                      <div className="today-icon">💤</div>
                      <div>
                        <div className="today-main-text">休息日</div>
                        <div className="today-sub-text">肌肉在休息中生长</div>
                      </div>
                    </div>
                  );
                  if (template) return (
                    <div className="today-content-row">
                      <div className="today-icon">🏋️</div>
                      <div style={{ flex: 1 }}>
                        <div className="today-main-text">{template.name}</div>
                        <div className="today-sub-text">{template.exercises.length} 个动作</div>
                      </div>
                      <button className="small-action-btn" onClick={() => handleStartTemplate(template)}>开始</button>
                    </div>
                  );
                  return (
                    <div className="today-content-row">
                      <div className="today-icon">📝</div>
                      <div>
                        <div className="today-main-text">{plan.label || '训练日'}</div>
                        <div className="today-sub-text">准备好了吗？</div>
                      </div>
                      <Link to="/add"><button className="small-action-btn">记录</button></Link>
                    </div>
                  );
                })()}
              </div>

              {/* 数据小卡片 */}
              <div className="bento-row">
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">连续打卡</div>
                  <div className="stat-value" style={{ color: stats?.streak > 0 ? 'var(--c-orange)' : 'var(--text-1)' }}>
                    {loading ? '…' : (stats?.streak ?? 0)}
                  </div>
                  <div className="stat-unit">天</div>
                </div>
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">总训练量</div>
                  <div className="stat-value">{loading ? '…' : stats ? (stats.totalVolume / 1000).toFixed(1) : '0'}</div>
                  <div className="stat-unit">吨</div>
                </div>
              </div>

              {/* 体重/图表 */}
              {latestBW ? (
                <div className="bento-item chart-mini-card" onClick={() => setActiveTab('body')} style={{ cursor: 'pointer' }}>
                  <div className="card-header-mini">
                    <span>体重</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{latestBW} kg</span>
                  </div>
                  <div style={{ height: 56, marginTop: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={bwChartData}>
                        <defs>
                          <linearGradient id="bwMini" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--c-green)" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="var(--c-green)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="weight" stroke="var(--c-green)" strokeWidth={2} fill="url(#bwMini)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bento-item" style={{ cursor: 'pointer' }} onClick={() => setShowBWModal(true)}>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>⚖️</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)' }}>记录体重</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streak Widget */}
          {stats && (
            <div style={{ marginBottom: 16 }}>
              <StreakWidget
                streak={stats.streak}
                longestStreak={stats.longestStreak}
                shield={stats.streakShield}
                onUseShield={handleUseShield}
              />
            </div>
          )}

          {/* 成就 */}
          {stats && stats.achievements.length > 0 && (
            <div style={{
              background: 'var(--surface)',
              borderRadius: 'var(--r-xl)',
              padding: '20px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-s)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>成就</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--surface-3)', color: 'var(--text-3)', padding: '2px 8px', borderRadius: 99 }}>
                  {stats.achievements.length} / {Object.keys(ACHIEVEMENTS).length}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.keys(ACHIEVEMENTS).map(id => {
                  const unlocked = stats.achievements.includes(id);
                  const def = ACHIEVEMENTS[id];
                  return (
                    <div key={id} title={def.desc} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '10px 12px', borderRadius: 'var(--r-m)', minWidth: 64,
                      background: unlocked ? 'var(--c-blue-dim)' : 'var(--surface-3)',
                      border: `1px solid ${unlocked ? 'rgba(0,113,227,0.2)' : 'transparent'}`,
                      opacity: unlocked ? 1 : 0.35,
                      filter: unlocked ? 'none' : 'grayscale(1)',
                      transition: 'all 0.2s',
                    }}>
                      <span style={{ fontSize: 22 }}>{def.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: unlocked ? 'var(--c-blue)' : 'var(--text-3)', textAlign: 'center', lineHeight: 1.3 }}>{def.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 训练洞察 */}
          {insights && insights.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, var(--c-blue) 0%, var(--c-indigo) 100%)',
              borderRadius: 'var(--r-xl)', padding: '20px', color: 'white',
              boxShadow: '0 8px 32px rgba(0,113,227,0.25)', marginTop: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>训练洞察</span>
                <span style={{ fontSize: 9, fontWeight: 800, background: 'rgba(255,255,255,0.2)', padding: '2px 7px', borderRadius: 99, letterSpacing: '0.05em' }}>NEW</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.slice(0, 3).map((ins, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px' }}>
                    <span style={{ fontSize: 16 }}>{ins.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ 历史 Tab ══════════ */}
      {activeTab === 'history' && (
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 20px 80px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ k: 'week', l: '最近7天' }, { k: 'month', l: '最近30天' }, { k: 'all', l: '全部' }].map(p => (
              <button
                key={p.k}
                onClick={() => setPeriod(p.k)}
                style={{
                  padding: '8px 18px', fontSize: 13, fontWeight: 600, borderRadius: 99,
                  background: period === p.k ? 'var(--text-1)' : 'var(--surface-3)',
                  color: period === p.k ? '#fff' : 'var(--text-2)',
                }}
              >{p.l}</button>
            ))}
          </div>

          {chartData.length >= 2 && (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '20px', marginBottom: 20, border: '1px solid var(--border)', boxShadow: 'var(--shadow-s)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>训练量趋势</div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="volG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--c-blue)" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="var(--c-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-l)', fontSize: 13 }}
                    formatter={v => [`${v.toLocaleString()} kg`, '训练量']} />
                  <Area type="monotone" dataKey="vol" stroke="var(--c-blue)" strokeWidth={2} fill="url(#volG)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {workouts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>暂无记录</div>
              <div style={{ fontSize: 14, marginBottom: 24 }}>从今天开始，记录你的第一次训练</div>
              <Link to="/add"><button style={{ padding: '12px 28px' }}>开始记录</button></Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {sortedDates.map(dateKey => {
                const day = groupedWorkouts[dateKey];
                return (
                  <div key={dateKey}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{dateKey}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {day.totalVol > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-blue)' }}>{day.totalVol.toLocaleString()} kg</span>}
                        {day.totalCals > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-orange)' }}>{day.totalCals} kcal</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {day.items.map(w => (
                        <div key={w._id} style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--r-l)',
                          padding: '14px 16px',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: 'var(--shadow-s)',
                        }}>
                          {/* Accent bar */}
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: w.type === 'cardio' ? 'var(--c-orange)' : 'var(--c-blue)', borderRadius: '3px 0 0 3px' }} />
                          <div style={{ paddingLeft: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 700 }}>{w.exercise}</span>
                                {w.type === 'cardio' && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-orange)', background: 'var(--c-orange-dim)', padding: '2px 7px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.04em' }}>有氧</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDelete(w._id)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 16, padding: '2px 6px', cursor: 'pointer', borderRadius: 6, lineHeight: 1 }}
                              >×</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {w.sets.map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0', borderBottom: i < w.sets.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                                  <span style={{ color: 'var(--text-4)', fontWeight: 700, fontFamily: 'var(--font-mono)', width: 28, flexShrink: 0 }}>
                                    {w.type === 'strength' ? `S${String(i + 1).padStart(2, '0')}` : ''}
                                  </span>
                                  {w.type === 'cardio' ? (
                                    <>
                                      <span style={{ fontWeight: 600 }}>{s.weight} min</span>
                                      {s.reps > 0 && <span style={{ color: 'var(--c-orange)', fontWeight: 600 }}>{s.reps} kcal</span>}
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontWeight: 600 }}>{s.weight === 0 ? '自重' : `${s.weight} kg`}</span>
                                      <span style={{ color: 'var(--text-3)' }}>×</span>
                                      <span style={{ fontWeight: 600 }}>{s.reps} 次</span>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSet(w._id, i)}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 14, padding: '2px 4px', cursor: 'pointer' }}
                                  >×</button>
                                </div>
                              ))}
                            </div>
                            {w.notes && (
                              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>{w.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ 个人记录 Tab ══════════ */}
      {activeTab === 'pr' && (
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 20px 80px' }}>
          {prs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>还没有个人记录</div>
              <div style={{ fontSize: 14 }}>完成力量训练后，最佳成绩会自动统计在这里</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {prs.map((pr, idx) => (
                <div key={pr.exercise} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-l)',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  boxShadow: 'var(--shadow-s)',
                }}>
                  <span style={{ fontSize: 22, width: 36, textAlign: 'center', flexShrink: 0 }}>
                    {['🥇','🥈','🥉'][idx] || `#${idx + 1}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{pr.exercise}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                      {new Date(pr.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-blue)', letterSpacing: '-0.02em' }}>
                      {pr.weight === 0 ? '自重' : `${pr.weight} kg`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>× {pr.reps} 次</div>
                  </div>
                  <button
                    className="secondary"
                    style={{ fontSize: 12, padding: '7px 12px', borderRadius: 99, flexShrink: 0 }}
                    onClick={() => setProgressExercise(pr.exercise)}
                  >趋势</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════ 模板 Tab ══════════ */}
      {activeTab === 'templates' && (
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 20px 80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>我的训练模板</span>
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
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 20px 80px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>体重趋势</span>
            <button onClick={() => setShowBWModal(true)} style={{ padding: '8px 18px', fontSize: 14 }}>+ 记录</button>
          </div>

          {bwChartData.length < 2 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>开始追踪体重</div>
              <div style={{ fontSize: 14, marginBottom: 24 }}>每天记录，30天后看到清晰的变化趋势</div>
              <button onClick={() => setShowBWModal(true)} style={{ padding: '12px 28px' }}>记录今日体重</button>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-s)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>近30天</span>
                {latestBW && <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-green)', letterSpacing: '-0.02em' }}>{latestBW} kg</span>}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={bwChartData}>
                  <defs>
                    <linearGradient id="bwG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--c-green)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--c-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-3)', fontSize: 11 }} unit="kg" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-l)', fontSize: 13 }}
                    formatter={v => [`${v} kg`, '体重']} />
                  <Area type="monotone" dataKey="weight" stroke="var(--c-green)" strokeWidth={2.5} fill="url(#bwG)" dot={{ r: 3, fill: 'var(--c-green)' }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                {[...bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8).map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 7 ? '1px solid var(--border)' : 'none', fontSize: 14 }}>
                    <span style={{ color: 'var(--text-2)' }}>{new Date(e.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
                    <span style={{ fontWeight: 700, color: 'var(--c-green)' }}>{e.weight} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {progressExercise && (
        <ProgressModal exercise={progressExercise} onClose={() => setProgressExercise(null)} token={token} />
      )}
      {showBWModal && (
        <BodyWeightModal onClose={() => setShowBWModal(false)} onSave={handleSaveBW} />
      )}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} onSave={handleSaveProfile} currentProfile={userProfile} />
      )}
    </div>
  );
};

export default Dashboard;
