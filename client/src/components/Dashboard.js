import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── 成就定义 ─────────────────────────────────────────────────────────────────
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

// ─── 日期工具 ─────────────────────────────────────────────────────────────────
const toLocalDateStr = (dateInput) => {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ─── 删除确认 Sheet ───────────────────────────────────────────────────────────
const DeleteConfirmSheet = ({ title, desc, onConfirm, onCancel }) => (
  <div className="delete-confirm-overlay" onClick={onCancel}>
    <div className="delete-confirm-sheet" onClick={e => e.stopPropagation()}>
      <div className="delete-confirm-title">{title}</div>
      <div className="delete-confirm-desc">{desc}</div>
      <div className="delete-confirm-actions">
        <button className="delete-confirm-btn-danger" onClick={onConfirm}>删除</button>
        <button className="delete-confirm-btn-cancel" onClick={onCancel}>取消</button>
      </div>
    </div>
  </div>
);

// ─── 左滑删除行容器 ───────────────────────────────────────────────────────────
const SwipeToDeleteRow = ({ onDelete, deleteLabel = '删除', children }) => {
  const [swiped, setSwiped]   = useState(false);
  const [startX, setStartX]   = useState(null);
  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const contentRef = useRef(null);
  const THRESHOLD = 60; // px needed to trigger reveal

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    if (startX === null) return;
    const dx = startX - e.touches[0].clientX;
    if (dx > 0) {
      setOffsetX(Math.min(dx, 84));
    } else if (swiped) {
      setOffsetX(Math.max(84 - (-dx), 0));
    }
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (offsetX > THRESHOLD) {
      setSwiped(true);
      setOffsetX(76);
    } else {
      setSwiped(false);
      setOffsetX(0);
    }
    setStartX(null);
  };

  const close = () => { setSwiped(false); setOffsetX(0); };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-l)', marginBottom: 10 }}>
      {/* 背景删除按钮 */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        display: 'flex', alignItems: 'stretch',
        opacity: offsetX > 10 ? 1 : 0,
        transition: dragging ? 'none' : 'opacity 0.15s',
      }}>
        <button
          className="swipe-delete-btn"
          onClick={() => { close(); onDelete(); }}
          style={{ borderRadius: '0 var(--r-l) var(--r-l) 0' }}
        >
          <span style={{ fontSize: 18 }}>🗑</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>{deleteLabel}</span>
        </button>
      </div>

      {/* 内容 */}
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => swiped && close()}
        style={{
          transform: `translateX(-${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.25,1,0.5,1)',
          position: 'relative', zIndex: 1,
          background: 'var(--surface)',
          borderRadius: 'var(--r-l)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ─── 月历组件 ────────────────────────────────────────────────────────────────
const MonthCalendar = ({ activeDates }) => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const activeDateSet = new Set(activeDates || []);
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr     = toLocalDateStr(today);

  const thisMonthCount = [...activeDateSet].filter(d => {
    const [y, m] = d.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth;
  }).length;

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cells.push({ day: d, dateStr, isToday: dateStr === todayStr, isActive: activeDateSet.has(dateStr), isFuture: dateStr > todayStr });
  }

  const getInsight = () => {
    if (!isCurrentMonth) return null;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const wStr = toLocalDateStr(weekStart);
    const cnt = [...activeDateSet].filter(d => d >= wStr && d <= todayStr).length;
    if (cnt >= 4) return { type: 'fire', text: '本周极佳' };
    if (cnt >= 2) return { type: 'info', text: '保持节奏' };
    if (cnt === 1) return { type: 'info', text: '继续加油' };
    return { type: 'warning', text: '快去打卡' };
  };
  const insight = getInsight();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="card-header" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{monthLabel}</h3>
          {thisMonthCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--c-blue-dim)', color: 'var(--c-blue)', padding: '2px 8px', borderRadius: 99 }}>
              {thisMonthCount}次
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {insight && <span className={`status-pill ${insight.type}`}>{insight.text}</span>}
          <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
          <button className="calendar-nav-btn" onClick={nextMonth} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>›</button>
        </div>
      </div>
      <div className="calendar-weekdays">
        {['日','一','二','三','四','五','六'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} className="calendar-cell empty" />;
          return (
            <div key={cell.dateStr}
              className={['calendar-cell', cell.isActive?'active':'', cell.isToday?'today':''].filter(Boolean).join(' ')}
              title={cell.isActive ? `${cell.dateStr} 已打卡` : ''}
            >{cell.day}</div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Streak Widget ────────────────────────────────────────────────────────────
const StreakWidget = ({ streak, longestStreak, shield, onUseShield }) => {
  const pct = longestStreak > 0 ? Math.min(100, (streak / longestStreak) * 100) : 0;
  return (
    <div style={{ background: 'var(--text-1)', borderRadius: 'var(--r-xl)', padding: '18px 20px', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>{streak}</div>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginTop: 2 }}>天连续打卡</div>
        </div>
        <div style={{ fontSize: 30 }}>{streak === 0 ? '💤' : streak >= 7 ? '🔥' : '✨'}</div>
      </div>
      {longestStreak > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'white', borderRadius: 99, transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.55, fontWeight: 600 }}>
            <span>当前 {streak}</span><span>最长 {longestStreak}</span>
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '7px 10px', opacity: 0.9 }}>
        {streak === 0 ? '今天训练，开启连续打卡' :
         streak < 3  ? `再 ${3-streak} 天解锁「三连打卡」` :
         streak < 7  ? `再 ${7-streak} 天解锁「一周不间断」` :
         streak < 30 ? `再 ${30-streak} 天解锁「钢铁意志」` : '连续打卡30天，真正的自律者 💎'}
      </div>
      {shield > 0 && streak === 0 && (
        <button onClick={onUseShield} style={{ width: '100%', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 13, padding: '9px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', marginTop: 10 }}>
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
        <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>暂无训练模板</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24 }}>创建固定计划，每次训练更高效</div>
        <Link to="/add"><button style={{ padding: '12px 28px' }}>开始第一次训练</button></Link>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {templates.map(t => (
        <SwipeToDeleteRow key={t._id} onDelete={() => onDelete(t._id)} deleteLabel="删除">
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.exercises.map(e => e.exercise).join(' · ')}
              </div>
              {t.lastUsed && (
                <div style={{ fontSize: 11, color: 'var(--c-blue)', marginTop: 2, fontWeight: 500 }}>
                  上次 {new Date(t.lastUsed).toLocaleDateString('zh-CN')}{t.useCount > 1 && ` · ${t.useCount}次`}
                </div>
              )}
            </div>
            <button onClick={() => onStartTemplate(t)} style={{ padding: '9px 18px', fontSize: 14, flexShrink: 0 }}>开始</button>
          </div>
        </SwipeToDeleteRow>
      ))}
      <button onClick={onCreateNew}
        style={{ border: '1.5px dashed var(--border)', background: 'transparent', color: 'var(--text-3)', padding: '14px', fontSize: 14, fontWeight: 600, borderRadius: 'var(--r-l)', marginTop: 4 }}>
        + 新建模板
      </button>
    </div>
  );
};

// ─── Body Weight Modal ────────────────────────────────────────────────────────
const BodyWeightModal = ({ onClose, onSave }) => {
  const [weight, setWeight] = useState('');
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3>记录体重</h3>
        <label>日期</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <label>体重 (kg)</label>
        <input type="number" step="0.1" min="20" max="300" placeholder="例如 72.5"
          value={weight} onChange={e => setWeight(e.target.value)} autoFocus
          style={{ marginBottom: 20 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary" onClick={onClose} style={{ flex: 1 }}>取消</button>
          <button onClick={() => weight && onSave(date, parseFloat(weight))} style={{ flex: 2 }} disabled={!weight}>确认</button>
        </div>
      </div>
    </div>
  );
};

// ─── Progress Modal ───────────────────────────────────────────────────────────
const ProgressModal = ({ exercise, onClose, token }) => {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/api/workouts/progress/${encodeURIComponent(exercise)}`, { headers: { 'x-auth-token': token } })
      .then(r => r.json()).then(setData).catch(() => {});
  }, [exercise, token]);
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    weight: d.bestWeight,
  }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{exercise}</h3>
          <button className="secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: 13 }}>关闭</button>
        </div>
        {chartData.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 14 }}>至少需要2次记录才能显示趋势</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--c-blue)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--c-blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-l)', fontSize: 13 }} formatter={v => [`${v} kg`, '最高重量']} />
                <Area type="monotone" dataKey="weight" stroke="var(--c-blue)" strokeWidth={2.5} fill="url(#wg)" dot={{ r: 3, fill: 'var(--c-blue)' }} />
              </AreaChart>
            </ResponsiveContainer>
            {data.length >= 2 && (() => {
              const diff = +(data[data.length-1].bestWeight - data[0].bestWeight).toFixed(1);
              return (
                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 14, fontWeight: 600,
                  color: diff > 0 ? 'var(--c-green)' : 'var(--text-3)',
                  background: diff > 0 ? 'var(--c-green-dim)' : 'var(--surface-3)',
                  borderRadius: 10, padding: '8px 16px', display: 'inline-block',
                  marginLeft: '50%', transform: 'translateX(-50%)',
                }}>
                  {diff > 0 ? `提升了 +${diff}kg` : `保持在 ${data[data.length-1].bestWeight}kg`}
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
const ProfileModal = ({ onClose, onSave, onLogout, currentProfile }) => {
  const [form, setForm] = useState({
    heightCm: currentProfile?.heightCm || '',
    age: currentProfile?.age || '',
    gender: currentProfile?.gender || '',
    goal: currentProfile?.goal || 'general',
    level: currentProfile?.level || 'beginner',
    weeklyFrequency: currentProfile?.weeklyFrequency || 3,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>个人资料</h3>
          <button className="secondary" onClick={onClose} style={{ padding: '6px 14px', fontSize: 13 }}>关闭</button>
        </div>
        <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 20 }}>用于计算卡路里及个性化建议</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label>身高 (cm)</label><input type="number" placeholder="175" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} /></div>
          <div><label>年龄</label><input type="number" placeholder="25" value={form.age} onChange={e => set('age', e.target.value)} /></div>
          <div><label>性别</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">不填</option><option value="male">男</option><option value="female">女</option>
            </select>
          </div>
          <div><label>每周天数</label><input type="number" value={form.weeklyFrequency} onChange={e => set('weeklyFrequency', parseInt(e.target.value))} min="1" max="7" /></div>
          <div style={{ gridColumn: '1/-1' }}>
            <label>目标</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {[['muscle','增肌'],['fat_loss','减脂'],['strength','增力'],['general','综合']].map(([v,l]) => (
                <div key={v} onClick={() => set('goal',v)} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: form.goal===v?'var(--c-blue)':'var(--surface-3)', color: form.goal===v?'#fff':'var(--text-2)', transition: 'all 0.15s' }}>{l}</div>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label>水平</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {[['beginner','新手'],['intermediate','有基础'],['advanced','进阶']].map(([v,l]) => (
                <div key={v} onClick={() => set('level',v)} style={{ padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: form.level===v?'var(--text-1)':'var(--surface-3)', color: form.level===v?'#fff':'var(--text-2)', transition: 'all 0.15s' }}>{l}</div>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => onSave(form)} style={{ width: '100%', marginTop: 16 }}>保存</button>
        <button onClick={onLogout} style={{ width: '100%', marginTop: 10, background: 'var(--c-red-dim)', color: 'var(--c-red)', fontSize: 14 }}>退出登录</button>
      </div>
    </div>
  );
};

// ─── 主 Dashboard ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [workouts, setWorkouts]         = useState([]);
  const [stats, setStats]               = useState(null);
  const [prs, setPrs]                   = useState([]);
  const [insights, setInsights]         = useState([]);
  const [bodyWeightLog, setBWLog]       = useState([]);
  const [templates, setTemplates]       = useState([]);
  const [todayPlan, setTodayPlan]       = useState([]);
  const [userProfile, setUserProfile]   = useState(null);
  const [loading, setLoading]           = useState(true);

  const [period, setPeriod]             = useState('all');
  const [activeTab, setActiveTab]       = useState('overview');
  const [progressExercise, setProgressExercise] = useState(null);
  const [showBWModal, setShowBWModal]   = useState(false);
  const [showProfile, setShowProfile]   = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState(null);
  // { type: 'workout'|'set'|'bwEntry', id, setIndex?, label, desc }

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
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
      if (bwRes.ok)   setBWLog(await bwRes.json());
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

  // ── 删除执行 ──
  const execDelete = async () => {
    if (!deleteTarget) return;
    const { type, id, setIndex } = deleteTarget;
    try {
      if (type === 'workout') {
        await fetch(`${API_URL}/api/workouts/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
        setWorkouts(w => w.filter(x => x._id !== id));
        fetchAll();
      } else if (type === 'set') {
        const res = await fetch(`${API_URL}/api/workouts/${id}/set/${setIndex}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
        if (res.ok) fetchAll();
      } else if (type === 'bwEntry') {
        // 目前后端暂无单条体重删除，可扩展；这里先做前端移除
        setBWLog(log => log.filter((_, i) => i !== id));
      }
    } catch (e) { console.error(e); }
    setDeleteTarget(null);
  };

  const handleSaveProfile = async (form) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ profile: { heightCm: parseInt(form.heightCm)||undefined, age: parseInt(form.age)||undefined, gender: form.gender||undefined, goal: form.goal, level: form.level, weeklyFrequency: parseInt(form.weeklyFrequency)||3 } }),
      });
      if (res.ok) { setShowProfile(false); fetchAll(); }
    } catch (e) { console.error(e); }
  };

  const handleUseShield = async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/streak-shield`, { method: 'POST', headers: { 'x-auth-token': token } });
      if (res.ok) fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/templates/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      if (res.ok) fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleStartTemplate = async (template) => {
    try { await fetch(`${API_URL}/api/workouts/templates/${template._id}/use`, { method: 'POST', headers: { 'x-auth-token': token } }); } catch {}
    navigate('/add', { state: { template } });
  };

  const handleSaveBW = async (date, weight) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/body-weight`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ date, weight }),
      });
      if (res.ok) { fetchAll(); setShowBWModal(false); }
    } catch (e) { console.error(e); }
  };

  // ── 数据处理 ──
  const allActiveDates = workouts.map(w => toLocalDateStr(w.date));

  const groupedWorkouts = workouts.reduce((acc, w) => {
    const raw = new Date(w.date);
    const key = raw.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    if (!acc[key]) acc[key] = { rawDate: raw, items: [], totalVol: 0, totalCals: 0 };
    acc[key].items.push(w);
    if (w.type === 'strength') acc[key].totalVol += w.sets.reduce((a, s) => a + s.weight * s.reps, 0);
    else acc[key].totalCals += w.sets.reduce((a, s) => a + (s.reps || 0), 0);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedWorkouts).sort((a, b) => groupedWorkouts[b].rawDate - groupedWorkouts[a].rawDate);

  const chartData = [...sortedDates].reverse().map(k => ({
    date: groupedWorkouts[k].rawDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    vol: groupedWorkouts[k].totalVol,
  })).filter(d => d.vol > 0);

  const bwChartData = [...bodyWeightLog]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30)
    .map(e => ({ date: new Date(e.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }), weight: e.weight }));

  const latestBW = bodyWeightLog.length > 0
    ? [...bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight : null;

  const h = new Date().getHours();
  const greeting = h < 6 ? '夜深了' : h < 11 ? '早上好' : h < 13 ? '中午好' : h < 18 ? '下午好' : '晚上好';

  const TABS = [
    { key: 'overview',  label: '总览',  icon: '◻' },
    { key: 'history',   label: '历史',  icon: '📋' },
    { key: 'templates', label: '模板',  icon: '⚡' },
    { key: 'pr',        label: '纪录',  icon: '🏆' },
    { key: 'body',      label: '体重',  icon: '⚖️' },
  ];

  // 渲染各 Tab 内容
  const renderTabContent = () => {
    switch (activeTab) {

      // ═══ 总览 ═══
      case 'overview': return (
        <div className="overview-grid">
          <div className="bento-grid">
            {/* 日历 */}
            <div className="bento-item calendar-card">
              <MonthCalendar activeDates={allActiveDates} />
            </div>
            {/* 右列 */}
            <div className="bento-col">
              {/* 今日计划 */}
              <div className="bento-item today-card-new">
                <div className="card-header"><h3>今日</h3><span className="today-badge">TODAY</span></div>
                {(() => {
                  const plan = todayPlan?.find(p => p.dayOfWeek === new Date().getDay());
                  const tmpl = plan?.templateId ? templates.find(t => t._id === plan.templateId) : null;
                  if (!plan) return (
                    <div className="today-content-row">
                      <div className="today-icon">📅</div>
                      <div><div className="today-main-text">自由安排</div><div className="today-sub-text">去做点什么？</div></div>
                      <Link to="/add"><button className="small-action-btn">记录</button></Link>
                    </div>
                  );
                  if (plan.isRestDay) return (
                    <div className="today-content-row">
                      <div className="today-icon">💤</div>
                      <div><div className="today-main-text">休息日</div><div className="today-sub-text">肌肉在休息中生长</div></div>
                    </div>
                  );
                  if (tmpl) return (
                    <div className="today-content-row">
                      <div className="today-icon">🏋️</div>
                      <div style={{ flex: 1 }}><div className="today-main-text">{tmpl.name}</div><div className="today-sub-text">{tmpl.exercises.length} 个动作</div></div>
                      <button className="small-action-btn" onClick={() => handleStartTemplate(tmpl)}>开始</button>
                    </div>
                  );
                  return (
                    <div className="today-content-row">
                      <div className="today-icon">📝</div>
                      <div><div className="today-main-text">{plan.label||'训练日'}</div></div>
                      <Link to="/add"><button className="small-action-btn">记录</button></Link>
                    </div>
                  );
                })()}
              </div>

              {/* 统计小卡 */}
              <div className="bento-row">
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">连续</div>
                  <div className="stat-value" style={{ color: stats?.streak > 0 ? 'var(--c-orange)' : undefined }}>{loading ? '…' : stats?.streak ?? 0}</div>
                  <div className="stat-unit">天</div>
                </div>
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">总量</div>
                  <div className="stat-value">{loading ? '…' : stats ? (stats.totalVolume/1000).toFixed(1) : '0'}</div>
                  <div className="stat-unit">吨</div>
                </div>
              </div>

              {/* 体重/图表 */}
              {latestBW ? (
                <div className="bento-item chart-mini-card" onClick={() => setActiveTab('body')}>
                  <div className="card-header-mini"><span>体重</span><span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{latestBW} kg</span></div>
                  <div style={{ height: 50, marginTop: 8 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={bwChartData}>
                        <defs><linearGradient id="bwMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--c-green)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--c-green)" stopOpacity={0} /></linearGradient></defs>
                        <Area type="monotone" dataKey="weight" stroke="var(--c-green)" strokeWidth={2} fill="url(#bwMini)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="bento-item" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => setShowBWModal(true)}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>⚖️</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)' }}>记录体重</div>
                </div>
              )}
            </div>
          </div>

          {/* Streak */}
          {stats && (
            <div style={{ marginBottom: 14 }}>
              <StreakWidget streak={stats.streak} longestStreak={stats.longestStreak} shield={stats.streakShield} onUseShield={handleUseShield} />
            </div>
          )}

          {/* 成就 */}
          {stats?.achievements?.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '16px', border: '1px solid var(--border)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>成就</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--surface-3)', color: 'var(--text-3)', padding: '2px 8px', borderRadius: 99 }}>
                  {stats.achievements.length}/{Object.keys(ACHIEVEMENTS).length}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.keys(ACHIEVEMENTS).map(id => {
                  const unlocked = stats.achievements.includes(id);
                  const def = ACHIEVEMENTS[id];
                  return (
                    <div key={id} title={def.desc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 10px', borderRadius: 'var(--r-m)', minWidth: 58, background: unlocked ? 'var(--c-blue-dim)' : 'var(--surface-3)', border: `1px solid ${unlocked ? 'rgba(0,113,227,0.2)' : 'transparent'}`, opacity: unlocked ? 1 : 0.3, filter: unlocked ? 'none' : 'grayscale(1)' }}>
                      <span style={{ fontSize: 20 }}>{def.icon}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: unlocked ? 'var(--c-blue)' : 'var(--text-3)', textAlign: 'center' }}>{def.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 洞察 */}
          {insights?.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,var(--c-blue) 0%,var(--c-indigo) 100%)', borderRadius: 'var(--r-xl)', padding: '16px 18px', color: 'white', boxShadow: '0 8px 28px rgba(0,113,227,0.22)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8, marginBottom: 12 }}>训练洞察</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {insights.slice(0,3).map((ins, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px' }}>
                    <span style={{ fontSize: 15 }}>{ins.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );

      // ═══ 历史 ═══
      case 'history': return (
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 12px 20px' }}>
          {/* 筛选 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{k:'week',l:'7天'},{k:'month',l:'30天'},{k:'all',l:'全部'}].map(p => (
              <button key={p.k} onClick={() => setPeriod(p.k)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 99, background: period===p.k?'var(--text-1)':'var(--surface-3)', color: period===p.k?'#fff':'var(--text-2)', border: 'none' }}>{p.l}</button>
            ))}
          </div>

          {/* 趋势图 */}
          {chartData.length >= 2 && (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '16px', marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>训练量趋势</div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="volG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--c-blue)" stopOpacity={0.12}/><stop offset="95%" stopColor="var(--c-blue)" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill:'var(--text-3)', fontSize:10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--text-3)', fontSize:10 }} width={36} />
                  <Tooltip contentStyle={{ borderRadius:12, border:'none', boxShadow:'var(--shadow-l)', fontSize:12 }} formatter={v=>[`${v.toLocaleString()} kg`,'训练量']} />
                  <Area type="monotone" dataKey="vol" stroke="var(--c-blue)" strokeWidth={2} fill="url(#volG)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 列表 */}
          {workouts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-3)' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>📝</div>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--text-1)', marginBottom:6 }}>暂无记录</div>
              <div style={{ fontSize:13, marginBottom:20 }}>从今天开始记录你的训练</div>
              <Link to="/add"><button style={{ padding:'11px 24px' }}>开始训练</button></Link>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {sortedDates.map(dateKey => {
                const day = groupedWorkouts[dateKey];
                return (
                  <div key={dateKey}>
                    {/* 日期头 */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{dateKey}</span>
                      <div style={{ display:'flex', gap:10 }}>
                        {day.totalVol > 0 && <span style={{ fontSize:11, fontWeight:800, color:'var(--c-blue)' }}>{day.totalVol.toLocaleString()} kg</span>}
                        {day.totalCals > 0 && <span style={{ fontSize:11, fontWeight:800, color:'var(--c-orange)' }}>{day.totalCals} kcal</span>}
                      </div>
                    </div>

                    {/* 每条训练（可左滑删除） */}
                    {day.items.map(w => (
                      <SwipeToDeleteRow
                        key={w._id}
                        deleteLabel="删除"
                        onDelete={() => setDeleteTarget({ type:'workout', id:w._id, label:`删除「${w.exercise}」`, desc:'此操作将删除该动作的全部组数记录，无法撤销。' })}
                      >
                        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-l)', padding:'12px 14px', position:'relative', overflow:'hidden' }}>
                          {/* 左侧彩条 */}
                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:w.type==='cardio'?'var(--c-orange)':'var(--c-blue)', borderRadius:'3px 0 0 3px' }} />
                          <div style={{ paddingLeft:10 }}>
                            {/* 头部 */}
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ fontSize:14, fontWeight:700 }}>{w.exercise}</span>
                                {w.type==='cardio' && <span style={{ fontSize:9, fontWeight:800, color:'var(--c-orange)', background:'var(--c-orange-dim)', padding:'2px 7px', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.04em' }}>有氧</span>}
                              </div>
                              {/* 桌面端删除按钮（移动端用左滑） */}
                              <button
                                onClick={() => setDeleteTarget({ type:'workout', id:w._id, label:`删除「${w.exercise}」`, desc:'将删除该动作的全部组数，无法撤销。' })}
                                style={{ background:'none', border:'none', color:'var(--text-4)', fontSize:18, padding:'2px 4px', cursor:'pointer', lineHeight:1, borderRadius:6 }}
                              >×</button>
                            </div>

                            {/* 组数列表 */}
                            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                              {w.sets.map((s, i) => (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0', borderBottom:i<w.sets.length-1?'1px solid var(--border)':'none', fontSize:13 }}>
                                  {w.type==='strength' && <span style={{ color:'var(--text-4)', fontFamily:'var(--font-mono)', fontSize:11, width:26, flexShrink:0 }}>S{String(i+1).padStart(2,'0')}</span>}
                                  {w.type==='cardio' ? (
                                    <><span style={{ fontWeight:600 }}>{s.weight} min</span>{s.reps>0 && <span style={{ color:'var(--c-orange)', fontWeight:600 }}>{s.reps} kcal</span>}</>
                                  ) : (
                                    <><span style={{ fontWeight:600 }}>{s.weight===0?'自重':`${s.weight} kg`}</span><span style={{ color:'var(--text-4)' }}>×</span><span style={{ fontWeight:600 }}>{s.reps} 次</span></>
                                  )}
                                  {/* 单组删除 */}
                                  <button
                                    onClick={() => setDeleteTarget({ type:'set', id:w._id, setIndex:i, label:`删除第 ${i+1} 组`, desc:`${w.exercise} · ${w.type==='cardio'?`${s.weight}min`:`${s.weight===0?'自重':`${s.weight}kg`} × ${s.reps}次`}` })}
                                    style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text-4)', fontSize:16, padding:'2px 4px', cursor:'pointer', borderRadius:4, flexShrink:0 }}
                                  >−</button>
                                </div>
                              ))}
                            </div>

                            {w.notes && <div style={{ marginTop:8, fontSize:12, color:'var(--text-3)', fontStyle:'italic' }}>{w.notes}</div>}
                          </div>
                        </div>
                      </SwipeToDeleteRow>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );

      // ═══ 个人记录 ═══
      case 'pr': return (
        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 12px 20px' }}>
          {prs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-3)' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🏆</div>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--text-1)', marginBottom:6 }}>还没有个人记录</div>
              <div style={{ fontSize:13 }}>完成力量训练后，最佳成绩会自动统计</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {prs.map((pr, idx) => (
                <div key={pr.exercise} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-l)', padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20, width:30, textAlign:'center', flexShrink:0 }}>{['🥇','🥈','🥉'][idx]||`#${idx+1}`}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:1 }}>{pr.exercise}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{new Date(pr.date).toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' })}</div>
                  </div>
                  <div style={{ textAlign:'right', marginRight:8 }}>
                    <div style={{ fontSize:17, fontWeight:800, color:'var(--c-blue)', letterSpacing:'-0.02em' }}>{pr.weight===0?'自重':`${pr.weight} kg`}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>× {pr.reps} 次</div>
                  </div>
                  <button className="secondary" style={{ fontSize:12, padding:'7px 12px', borderRadius:99, flexShrink:0 }} onClick={() => setProgressExercise(pr.exercise)}>趋势</button>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      // ═══ 模板 ═══
      case 'templates': return (
        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 12px 20px' }}>
          <TemplateManager templates={templates} onStartTemplate={handleStartTemplate} onDelete={handleDeleteTemplate} onCreateNew={() => navigate('/add')} />
        </div>
      );

      // ═══ 体重 ═══
      case 'body': return (
        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 12px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontSize:15, fontWeight:700 }}>体重趋势</span>
            <button onClick={() => setShowBWModal(true)} style={{ padding:'8px 18px', fontSize:14 }}>+ 记录</button>
          </div>
          {bwChartData.length < 2 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-3)' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>⚖️</div>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--text-1)', marginBottom:6 }}>开始追踪体重</div>
              <div style={{ fontSize:13, marginBottom:20 }}>每天记录，30天后看清变化趋势</div>
              <button onClick={() => setShowBWModal(true)} style={{ padding:'11px 24px' }}>记录今日体重</button>
            </div>
          ) : (
            <div style={{ background:'var(--surface)', borderRadius:'var(--r-xl)', padding:'16px', border:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>近30天</span>
                {latestBW && <span style={{ fontSize:20, fontWeight:800, color:'var(--c-green)', letterSpacing:'-0.02em' }}>{latestBW} kg</span>}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={bwChartData}>
                  <defs><linearGradient id="bwG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--c-green)" stopOpacity={0.15}/><stop offset="95%" stopColor="var(--c-green)" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill:'var(--text-3)', fontSize:10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill:'var(--text-3)', fontSize:10 }} unit="kg" domain={['auto','auto']} width={40} />
                  <Tooltip contentStyle={{ borderRadius:12, border:'none', boxShadow:'var(--shadow-l)', fontSize:12 }} formatter={v=>[`${v} kg`,'体重']} />
                  <Area type="monotone" dataKey="weight" stroke="var(--c-green)" strokeWidth={2.5} fill="url(#bwG)" dot={{ r:3, fill:'var(--c-green)' }} activeDot={{ r:5 }} />
                </AreaChart>
              </ResponsiveContainer>

              {/* 记录列表，可删除 */}
              <div style={{ marginTop:14, borderTop:'1px solid var(--border)', paddingTop:12 }}>
                {[...bodyWeightLog].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,10).map((e, i) => (
                  <SwipeToDeleteRow
                    key={i}
                    deleteLabel="删除"
                    onDelete={() => setDeleteTarget({ type:'bwEntry', id:i, label:`删除 ${new Date(e.date).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})} 的记录`, desc:`${e.weight} kg` })}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 4px', borderBottom:i<9?'1px solid var(--border)':'none', fontSize:14, background:'var(--surface)' }}>
                      <span style={{ color:'var(--text-2)' }}>{new Date(e.date).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})}</span>
                      <span style={{ fontWeight:700, color:'var(--c-green)' }}>{e.weight} kg</span>
                    </div>
                  </SwipeToDeleteRow>
                ))}
              </div>
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  return (
    <div>
      {/* ── 顶部 Nav ── */}
      <nav className="nav">
        <span className="nav-brand">IRON</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* 移动端 nav 只保留品牌+记录按钮 */}
          <Link to="/add"><button className="nav-btn-primary">+ 训练</button></Link>
          {/* 桌面端额外按钮 */}
          <button className="nav-btn-icon" onClick={() => setShowProfile(true)} style={{ fontSize:17 }}>⚙</button>
          <button className="nav-btn-icon" onClick={logout} style={{ fontSize:16 }}>↗</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="hero-section">
        <p className="hero-date">{new Date().toLocaleDateString('zh-CN',{ month:'long', day:'numeric', weekday:'long' })}</p>
        <h1 className="hero-greeting">{greeting}，{user?.username||'朋友'}</h1>
      </div>

      {/* ── 分段控件（桌面/平板） ── */}
      <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 20px' }}>
        <div className="content-tabs">
          {TABS.map(t => (
            <div key={t.key} className={`content-tab ${activeTab===t.key?'active':''}`} onClick={() => setActiveTab(t.key)}>{t.label}</div>
          ))}
        </div>
      </div>

      {/* ── Tab 内容 ── */}
      {renderTabContent()}

      {/* ── 底部 Tab Bar（移动端） ── */}
      <div className="bottom-tab-bar">
        {/* 总览 */}
        <div className={`tab-item ${activeTab==='overview'?'active':''}`} onClick={() => setActiveTab('overview')}>
          <span className="tab-icon">⊞</span>
          <span className="tab-label">总览</span>
        </div>
        {/* 历史 */}
        <div className={`tab-item ${activeTab==='history'?'active':''}`} onClick={() => setActiveTab('history')}>
          <span className="tab-icon">📋</span>
          <span className="tab-label">历史</span>
        </div>
        {/* 中间大按钮（记录） */}
        <div className="tab-item tab-cta">
          <Link to="/add" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, textDecoration:'none' }}>
            <div className="tab-cta-btn">＋</div>
            <span className="tab-label" style={{ color:'var(--c-blue)' }}>记录</span>
          </Link>
        </div>
        {/* 纪录 */}
        <div className={`tab-item ${activeTab==='pr'?'active':''}`} onClick={() => setActiveTab('pr')}>
          <span className="tab-icon">🏆</span>
          <span className="tab-label">纪录</span>
        </div>
        {/* 我的（设置入口） */}
        <div className="tab-item" onClick={() => setShowProfile(true)}>
          <span className="tab-icon">👤</span>
          <span className="tab-label">我的</span>
        </div>
      </div>

      {/* ── Modals ── */}
      {progressExercise && <ProgressModal exercise={progressExercise} onClose={() => setProgressExercise(null)} token={token} />}
      {showBWModal && <BodyWeightModal onClose={() => setShowBWModal(false)} onSave={handleSaveBW} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onSave={handleSaveProfile} onLogout={logout} currentProfile={userProfile} />}

      {/* ── 删除确认 Sheet ── */}
      {deleteTarget && (
        <DeleteConfirmSheet
          title={deleteTarget.label}
          desc={deleteTarget.desc}
          onConfirm={execDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
