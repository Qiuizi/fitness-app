import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';
import { useToast } from './Toast';
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
  volume_10k:    { icon: '🏗️',  name: '十吨俱乐部', desc: '力量总量超10,000kg' },
  volume_100k:   { icon: '🚀',  name: '百吨勇士',   desc: '力量总量超100,000kg' },
};

// ─── 日期工具 ─────────────────────────────────────────────────────────────────
const toLocalDateStr = (dateInput) => {
  const d = new Date(dateInput);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ─── 空状态 SVG 与组件 ────────────────────────────────────────────────────────
const EmptyArt = ({ kind, size = 64 }) => {
  const stroke = 'var(--text-4)';
  const accent = 'var(--c-blue)';
  const common = { width: size, height: size, viewBox: '0 0 64 64', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'template') return (
    <svg {...common}>
      <rect x="14" y="10" width="36" height="44" rx="6" stroke={stroke} strokeWidth="2" />
      <line x1="22" y1="22" x2="42" y2="22" stroke={stroke} strokeWidth="2" />
      <line x1="22" y1="30" x2="38" y2="30" stroke={stroke} strokeWidth="2" />
      <line x1="22" y1="38" x2="34" y2="38" stroke={stroke} strokeWidth="2" />
      <circle cx="48" cy="48" r="9" fill="var(--surface)" stroke={accent} strokeWidth="2" />
      <line x1="48" y1="44" x2="48" y2="52" stroke={accent} strokeWidth="2" />
      <line x1="44" y1="48" x2="52" y2="48" stroke={accent} strokeWidth="2" />
    </svg>
  );
  if (kind === 'history') return (
    <svg {...common}>
      <path d="M12 18 L26 18 L30 24 L52 24 L52 50 L12 50 Z" stroke={stroke} strokeWidth="2" />
      <line x1="20" y1="34" x2="44" y2="34" stroke={stroke} strokeWidth="2" />
      <line x1="20" y1="42" x2="36" y2="42" stroke={stroke} strokeWidth="2" />
    </svg>
  );
  if (kind === 'pr') return (
    <svg {...common}>
      <path d="M22 14 H42 V22 C42 30 38 36 32 36 C26 36 22 30 22 22 Z" stroke={stroke} strokeWidth="2" />
      <path d="M22 18 H14 C14 24 18 28 22 28" stroke={stroke} strokeWidth="2" />
      <path d="M42 18 H50 C50 24 46 28 42 28" stroke={stroke} strokeWidth="2" />
      <line x1="32" y1="36" x2="32" y2="44" stroke={stroke} strokeWidth="2" />
      <rect x="22" y="44" width="20" height="6" rx="1" stroke={accent} strokeWidth="2" />
    </svg>
  );
  if (kind === 'plan') return (
    <svg {...common}>
      <rect x="10" y="14" width="44" height="40" rx="4" stroke={stroke} strokeWidth="2" />
      <line x1="10" y1="24" x2="54" y2="24" stroke={stroke} strokeWidth="2" />
      <line x1="20" y1="10" x2="20" y2="18" stroke={stroke} strokeWidth="2" />
      <line x1="44" y1="10" x2="44" y2="18" stroke={stroke} strokeWidth="2" />
      <circle cx="20" cy="34" r="2" fill={accent} />
      <circle cx="32" cy="34" r="2" fill={stroke} opacity="0.5" />
      <circle cx="44" cy="34" r="2" fill={stroke} opacity="0.5" />
      <circle cx="20" cy="44" r="2" fill={stroke} opacity="0.5" />
      <circle cx="32" cy="44" r="2" fill={accent} />
      <circle cx="44" cy="44" r="2" fill={stroke} opacity="0.5" />
    </svg>
  );
  return null;
};

const EmptyState = ({ kind, title, desc, action, compact = false }) => (
  <div style={{
    textAlign: 'center',
    padding: compact ? '28px 20px' : '48px 24px',
    background: compact ? 'var(--surface)' : 'transparent',
    borderRadius: compact ? 'var(--r-xl)' : 0,
    border: compact ? '1px solid var(--border)' : 'none',
  }}>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: compact ? 10 : 14 }}>
      <EmptyArt kind={kind} size={compact ? 52 : 64} />
    </div>
    <div style={{ fontSize: compact ? 14 : 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, letterSpacing: '-0.01em' }}>{title}</div>
    {desc && <div style={{ fontSize: compact ? 12 : 13, color: 'var(--text-3)', marginBottom: action ? 20 : 0, lineHeight: 1.5 }}>{desc}</div>}
    {action}
  </div>
);

// ─── 加载骨架屏 ────────────────────────────────────────────────────────────────
const SkelLine = ({ w = '100%', h = 12, style }) => (
  <span className="skeleton block" style={{ width: w, height: h, ...style }} />
);
const OverviewSkeleton = () => (
  <div className="overview-grid">
    <div className="bento-grid">
      <div className="bento-item calendar-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <SkelLine w={80} h={16} />
          <SkelLine w={100} h={28} style={{ borderRadius: 999 }} />
        </div>
        <div className="calendar-grid" style={{ gap: 6 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <span key={i} className="skeleton circle" style={{ aspectRatio: '1', width: '100%' }} />
          ))}
        </div>
      </div>
      <div className="bento-col">
        <div className="bento-item today-card-new">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SkelLine w={56} h={16} />
            <SkelLine w={48} h={16} style={{ borderRadius: 6 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="skeleton circle" style={{ width: 48, height: 48 }} />
            <div style={{ flex: 1 }}>
              <SkelLine w="60%" h={14} />
              <SkelLine w="40%" h={11} style={{ marginTop: 6 }} />
            </div>
          </div>
        </div>
        <div className="bento-row">
          {[0, 1].map(i => (
            <div key={i} className="bento-item stat-mini-card">
              <SkelLine w={42} h={10} />
              <SkelLine w={56} h={26} style={{ marginTop: 8 }} />
              <SkelLine w={28} h={9} style={{ marginTop: 6 }} />
            </div>
          ))}
        </div>
        <div className="bento-row">
          {[0, 1].map(i => (
            <div key={i} className="bento-item stat-mini-card">
              <SkelLine w={42} h={10} />
              <SkelLine w={56} h={26} style={{ marginTop: 8 }} />
              <SkelLine w={28} h={9} style={{ marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="bento-item" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <SkelLine w={88} h={14} />
          <SkelLine w={140} h={28} style={{ marginTop: 8 }} />
        </div>
        <SkelLine w={64} h={64} style={{ borderRadius: '50%' }} />
      </div>
    </div>
  </div>
);

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
const MonthCalendar = ({ activeDates, onDayClick }) => {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // activeDates 可能重复（同一天多动作），计数 → 热力强度
  const dateCountMap = (activeDates || []).reduce((m, d) => { m[d] = (m[d]||0)+1; return m; }, {});
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr     = toLocalDateStr(today);

  const thisMonthDays = Object.keys(dateCountMap).filter(d => {
    const [y, m] = d.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth;
  });
  const thisMonthCount = thisMonthDays.length;

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
    const count = dateCountMap[dateStr] || 0;
    cells.push({ day: d, dateStr, isToday: dateStr === todayStr, isActive: count > 0, count, isFuture: dateStr > todayStr });
  }

  // 热力强度：按当月内相对密度分级 (0=无 / 1=轻 / 2=中 / 3=强)
  const maxCount = Math.max(1, ...thisMonthDays.map(d => dateCountMap[d] || 0));
  const intensityOf = (count) => {
    if (count <= 0) return 0;
    const ratio = count / maxCount;
    if (ratio > 0.66) return 3;
    if (ratio > 0.33) return 2;
    return 1;
  };

  const getInsight = () => {
    if (!isCurrentMonth) return null;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const wStr = toLocalDateStr(weekStart);
    const cnt = Object.keys(dateCountMap).filter(d => d >= wStr && d <= todayStr).length;
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
          const clickable = !cell.isFuture && onDayClick;
          const intensity = intensityOf(cell.count);
          const cls = [
            'calendar-cell',
            intensity > 0 ? `heat-${intensity}` : '',
            cell.isToday ? 'today' : '',
            cell.isFuture ? 'future' : '',
          ].filter(Boolean).join(' ');
          return (
            <div key={cell.dateStr}
              className={cls}
              onClick={clickable ? () => onDayClick(cell.dateStr) : undefined}
              title={cell.isFuture ? '' : `${cell.dateStr}${cell.count>0?` · ${cell.count} 动作`:''}`}
            >{cell.day}</div>
          );
        })}
      </div>
      {/* 图例 */}
      <div className="calendar-legend">
        <span>少</span>
        <span className="lg-chip heat-1" />
        <span className="lg-chip heat-2" />
        <span className="lg-chip heat-3" />
        <span>多</span>
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
      <EmptyState
        kind="template"
        title="暂无训练模板"
        desc="创建固定计划，每次训练更高效"
        action={<Link to="/add"><button style={{ padding: '12px 28px' }}>开始第一次训练</button></Link>}
      />
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
    '1RM': d.best1RM || 0,
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
                  <linearGradient id="rm1g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--c-purple)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="var(--c-purple)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} unit="kg" />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: 'var(--shadow-l)', fontSize: 13 }} formatter={(v, name) => [`${v} kg`, name === '1RM' ? '估算1RM' : '最高重量']} />
                <Area type="monotone" dataKey="weight" stroke="var(--c-blue)" strokeWidth={2.5} fill="url(#wg)" dot={{ r: 3, fill: 'var(--c-blue)' }} />
                {chartData.some(d => d['1RM'] > 0) && <Area type="monotone" dataKey="1RM" stroke="var(--c-purple)" strokeWidth={1.5} fill="url(#rm1g)" dot={false} strokeDasharray="4 3" />}
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
const ProfileModal = ({ onClose, onSave, onLogout, currentProfile, reminderSettings, onSaveReminder }) => {
  const [form, setForm] = useState({
    heightCm: currentProfile?.heightCm || '',
    age: currentProfile?.age || '',
    gender: currentProfile?.gender || '',
    goal: currentProfile?.goal || 'general',
    level: currentProfile?.level || 'beginner',
    weeklyFrequency: currentProfile?.weeklyFrequency || 3,
  });
  const [reminder, setReminder] = useState({
    enabled: reminderSettings?.enabled || false,
    time: reminderSettings?.time || '18:00',
    days: reminderSettings?.days || [],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setR = (k, v) => setReminder(r => ({ ...r, [k]: v }));
  const dayLabels = ['日','一','二','三','四','五','六'];
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

        {/* 训练提醒 */}
        <div style={{ borderTop:'1px solid var(--border)', marginTop:16, paddingTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <label style={{ margin:0 }}>训练提醒</label>
            <button onClick={() => setR('enabled', !reminder.enabled)} style={{ background: reminder.enabled ? 'var(--c-green)' : 'var(--surface-3)', color: reminder.enabled ? '#fff' : 'var(--text-3)', border:'none', borderRadius:99, padding:'5px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}>{reminder.enabled ? '已开启' : '已关闭'}</button>
          </div>
          {reminder.enabled && (
            <>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:12 }}>提醒时间</label>
                <input type="time" value={reminder.time} onChange={e => setR('time', e.target.value)} style={{ fontSize:14 }} />
              </div>
              <div>
                <label style={{ fontSize:12 }}>提醒日期</label>
                <div style={{ display:'flex', gap:4, marginTop:6 }}>
                  {dayLabels.map((d, i) => (
                    <button key={i} onClick={() => {
                      setR('days', reminder.days.includes(i) ? reminder.days.filter(x => x !== i) : [...reminder.days, i]);
                    }} style={{ flex:1, padding:'8px 0', borderRadius:8, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
                      background: reminder.days.includes(i) ? 'var(--c-blue)' : 'var(--surface-3)',
                      color: reminder.days.includes(i) ? '#fff' : 'var(--text-4)',
                    }}>{d}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => onSaveReminder(reminder)} style={{ width:'100%', marginTop:10, fontSize:13, padding:10 }}>保存提醒设置</button>
            </>
          )}
        </div>

        <button onClick={() => onSave(form)} style={{ width: '100%', marginTop: 16 }}>保存资料</button>
        <button onClick={onLogout} style={{ width: '100%', marginTop: 10, background: 'var(--c-red-dim)', color: 'var(--c-red)', fontSize: 14 }}>退出登录</button>
      </div>
    </div>
  );
};

// ─── Day Summary Modal ──────────────────────────────────────────────────────
const DaySummaryModal = ({ date, data, onClose }) => {
  const dateLabel = new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0 }}>{dateLabel}</h3>
          <button className="secondary" onClick={onClose} style={{ padding:'6px 14px', fontSize:13 }}>关闭</button>
        </div>
        {!data ? (
          <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-3)', fontSize:14 }}>加载中…</div>
        ) : data.exercises.length === 0 ? (
          <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-3)', fontSize:14 }}>这一天没有训练记录</div>
        ) : (
          <>
            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              <div style={{ flex:1, background:'var(--surface-3)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:800 }}>{data.exerciseCount}</div>
                <div style={{ fontSize:10, color:'var(--text-4)', fontWeight:600 }}>动作</div>
              </div>
              <div style={{ flex:1, background:'var(--surface-3)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:800 }}>{(data.totalVolume/1000).toFixed(1)}t</div>
                <div style={{ fontSize:10, color:'var(--text-4)', fontWeight:600 }}>训练量</div>
              </div>
              <div style={{ flex:1, background:'var(--surface-3)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:20, fontWeight:800 }}>{Math.round(data.totalDuration/60)}m</div>
                <div style={{ fontSize:10, color:'var(--text-4)', fontWeight:600 }}>时长</div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {data.exercises.map((ex, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'var(--surface-3)', borderRadius:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{ex.exercise}</div>
                    <div style={{ fontSize:11, color:'var(--text-4)' }}>{ex.type === 'cardio' ? '有氧' : '力量'} · {ex.sets}组</div>
                  </div>
                  {ex.bestSet && ex.type === 'strength' && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--c-blue)' }}>{ex.bestSet.weight === 0 ? '自重' : `${ex.bestSet.weight}kg`}</div>
                      <div style={{ fontSize:10, color:'var(--text-4)' }}>×{ex.bestSet.reps}次</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Progress Photos Modal ────────────────────────────────────────────────────
const PhotosModal = ({ photos, token, onClose, onRefresh }) => {
  const toast = useToast();
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch(`${API_URL}/api/workouts/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify({ image: reader.result, date: new Date(), label: '' }),
        });
        if (!res.ok) throw new Error();
        onRefresh();
        toast.success('照片已上传');
      } catch {
        toast.error('上传失败，请稍后重试');
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const toggleSelect = (photo) => {
    setSelectedPhotos(prev => {
      if (prev.find(p => p._id === photo._id)) return prev.filter(p => p._id !== photo._id);
      if (prev.length >= 2) return [prev[1], photo];
      return [...prev, photo];
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0 }}>体态对比</h3>
          <button className="secondary" onClick={onClose} style={{ padding:'6px 14px', fontSize:13 }}>关闭</button>
        </div>

        {/* 对比视图 */}
        {selectedPhotos.length === 2 && (
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {selectedPhotos.map((p, i) => (
              <div key={i} style={{ flex:1, position:'relative' }}>
                <img src={`${API_URL}${p.url}`} alt="" style={{ width:'100%', borderRadius:12, objectFit:'cover', maxHeight:250 }} />
                <div style={{ position:'absolute', bottom:6, left:6, background:'rgba(0,0,0,.6)', color:'#fff', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600 }}>{new Date(p.date).toLocaleDateString('zh-CN',{month:'short',day:'numeric'})}</div>
              </div>
            ))}
          </div>
        )}

        {/* 上传 */}
        <label style={{ display:'block', marginBottom:12 }}>
          <div style={{ padding:'12px', border:'2px dashed var(--border)', borderRadius:12, textAlign:'center', cursor:'pointer', color:'var(--c-blue)', fontWeight:600, fontSize:14 }}>
            {uploading ? '上传中…' : '+ 上传新照片'}
          </div>
          <input type="file" accept="image/*" capture="environment" onChange={handleUpload} style={{ display:'none' }} />
        </label>

        {/* 照片列表 */}
        <div style={{ fontSize:11, color:'var(--text-4)', marginBottom:8, fontWeight:600 }}>选择2张照片对比（点击选择）</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, maxHeight:'40vh', overflowY:'auto' }}>
          {photos.map(p => {
            const isSelected = selectedPhotos.find(s => s._id === p._id);
            return (
              <div key={p._id} onClick={() => toggleSelect(p)} style={{ position:'relative', cursor:'pointer', borderRadius:10, overflow:'hidden', border: isSelected ? '3px solid var(--c-blue)' : '3px solid transparent', transition:'border .2s' }}>
                <img src={`${API_URL}${p.url}`} alt="" style={{ width:'100%', aspectRatio:'3/4', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', bottom:4, left:4, background:'rgba(0,0,0,.5)', color:'#fff', padding:'1px 6px', borderRadius:4, fontSize:10 }}>
                  {new Date(p.date).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}
                </div>
                {isSelected && <div style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%', background:'var(--c-blue)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>✓</div>}
              </div>
            );
          })}
        </div>
        {photos.length === 0 && <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-3)', fontSize:13 }}>还没有照片，上传第一张吧</div>}
      </div>
    </div>
  );
};

// ─── Edit Workout Modal ──────────────────────────────────────────────────────
const EditWorkoutModal = ({ workout, onSave, onClose }) => {
  const [sets, setSets] = useState(workout.sets.map((s, i) => ({ ...s, idx: i })));
  const isCardio = workout.type === 'cardio';
  const handleSetChange = (i, field, val) => {
    setSets(prev => { const ns = [...prev]; ns[i] = { ...ns[i], [field]: field === 'isWarmup' ? val : (field === 'rpe' ? (val || undefined) : parseFloat(val) || 0) }; return ns; });
  };
  const removeSet = (i) => setSets(prev => prev.length <= 1 ? prev : prev.filter((_, j) => j !== i));
  const addSet = () => setSets(prev => [...prev, { weight: 0, reps: 0, isWarmup: false, rpe: undefined, idx: prev.length }]);
  const handleSave = () => {
    onSave(sets.map(({ idx, ...s }) => s));
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0 }}>编辑 {workout.exercise}</h3>
          <button className="secondary" onClick={onClose} style={{ padding:'6px 14px', fontSize:13 }}>关闭</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:'50vh', overflowY:'auto', marginBottom:16 }}>
          {sets.map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 10px', background:'var(--surface-3)', borderRadius:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color: s.isWarmup ? 'var(--c-orange)' : 'var(--text-4)', width:24 }}>{s.isWarmup ? 'W' : 'S'}{i+1}</span>
              {isCardio ? (
                <>
                  <input type="number" value={s.weight} onChange={e => handleSetChange(i, 'weight', e.target.value)} placeholder="分钟" style={{ width:60, fontSize:14, textAlign:'center', border:'none', background:'white', borderRadius:6, padding:'6px 4px', outline:'none' }} />
                  <span style={{ fontSize:10, color:'var(--text-4)' }}>min</span>
                  <input type="number" value={s.reps} onChange={e => handleSetChange(i, 'reps', e.target.value)} placeholder="卡路里" style={{ width:60, fontSize:14, textAlign:'center', border:'none', background:'white', borderRadius:6, padding:'6px 4px', outline:'none' }} />
                  <span style={{ fontSize:10, color:'var(--text-4)' }}>kcal</span>
                </>
              ) : (
                <>
                  <input type="number" value={s.weight} onChange={e => handleSetChange(i, 'weight', e.target.value)} style={{ width:56, fontSize:14, textAlign:'center', border:'none', background:'white', borderRadius:6, padding:'6px 4px', outline:'none' }} />
                  <span style={{ fontSize:10, color:'var(--text-4)' }}>kg</span>
                  <span style={{ color:'var(--text-4)' }}>×</span>
                  <input type="number" value={s.reps} onChange={e => handleSetChange(i, 'reps', e.target.value)} style={{ width:44, fontSize:14, textAlign:'center', border:'none', background:'white', borderRadius:6, padding:'6px 4px', outline:'none' }} />
                  <span style={{ fontSize:10, color:'var(--text-4)' }}>次</span>
                  <button onClick={() => handleSetChange(i, 'isWarmup', !s.isWarmup)} style={{ background: s.isWarmup ? 'var(--c-orange-dim)' : 'white', border:'none', borderRadius:6, padding:'4px 8px', fontSize:10, fontWeight:700, cursor:'pointer', color: s.isWarmup ? '#b86800' : 'var(--text-4)' }}>{s.isWarmup ? '热' : '正'}</button>
                  {!s.isWarmup && <div style={{ display:'flex', gap:2 }}>
                    {[['normal','N',''],['superset','超','#5e5ce6'],['dropset','降','#ff9f0a']].map(([v,l,c]) => (
                      <button key={v} onClick={() => handleSetChange(i, 'setType', s.setType === v ? 'normal' : v)} style={{ padding:'2px 6px', borderRadius:4, fontSize:9, fontWeight:700, border:'none', cursor:'pointer', background: s.setType === v ? (c ? `${c}15` : 'var(--c-blue-dim)') : 'white', color: s.setType === v ? (c || 'var(--c-blue)') : 'var(--text-4)' }}>{l}</button>
                    ))}
                  </div>}
                </>
              )}
              <button onClick={() => removeSet(i)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--c-red)', fontSize:16, cursor:'pointer', padding:'0 4px' }}>×</button>
            </div>
          ))}
        </div>
        <button onClick={addSet} style={{ width:'100%', background:'var(--c-blue-dim)', color:'var(--c-blue)', border:'none', borderRadius:10, padding:'8px', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:12 }}>+ 添加一组</button>
        <div style={{ display:'flex', gap:10 }}>
          <button className="secondary" onClick={onClose} style={{ flex:1 }}>取消</button>
          <button onClick={handleSave} style={{ flex:2 }}>保存修改</button>
        </div>
      </div>
    </div>
  );
};

// ─── 多周计划创建 Modal ──────────────────────────────────────────────────────
const CreatePlanModal = ({ templates, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [schedule, setSchedule] = useState([]);
  const dayNames = ['周日','周一','周二','周三','周四','周五','周六'];

  const toggleDay = (week, dow) => {
    setSchedule(prev => {
      const existing = prev.findIndex(s => s.week === week && s.dayOfWeek === dow);
      if (existing >= 0) return prev.filter((_, i) => i !== existing);
      return [...prev, { week, dayOfWeek: dow, templateId: templates[0]?._id || '', label: templates[0]?.name || '', isRestDay: false }];
    });
  };
  const setRestDay = (week, dow) => {
    setSchedule(prev => {
      const existing = prev.findIndex(s => s.week === week && s.dayOfWeek === dow);
      if (existing >= 0) return prev.map((s, i) => i === existing ? { ...s, isRestDay: true, label: '休息日', templateId: '' } : s);
      return [...prev, { week, dayOfWeek: dow, isRestDay: true, label: '休息日', templateId: '' }];
    });
  };
  const updateTemplate = (week, dow, templateId) => {
    const tmpl = templates.find(t => t._id === templateId);
    setSchedule(prev => prev.map(s => s.week === week && s.dayOfWeek === dow ? { ...s, templateId, label: tmpl?.name || '', isRestDay: false } : s));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0 }}>创建训练计划</h3>
          <button className="secondary" onClick={onClose} style={{ padding:'6px 14px', fontSize:13 }}>关闭</button>
        </div>
        <label>计划名称</label>
        <input type="text" placeholder="如：8周增肌计划" value={name} onChange={e => setName(e.target.value)} />
        <label>总周数</label>
        <input type="number" min="1" max="52" value={weeks} onChange={e => setWeeks(parseInt(e.target.value)||4)} />
        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:12 }}>点击日期添加训练，再次点击切换模板</div>
        <div style={{ maxHeight:'40vh', overflowY:'auto', marginBottom:16 }}>
          {Array.from({ length: Math.min(weeks, 12) }).map((_, w) => (
            <div key={w} style={{ marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:4, color:'var(--text-2)' }}>第 {w+1} 周</div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {dayNames.map((d, dow) => {
                  const entry = schedule.find(s => s.week === w && s.dayOfWeek === dow);
                  const isActive = !!entry;
                  const isRest = entry?.isRestDay;
                  return (
                    <div key={dow} style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      <div onClick={() => !isRest && toggleDay(w, dow)} onContextMenu={e => { e.preventDefault(); setRestDay(w, dow); }}
                        style={{ padding:'6px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', textAlign:'center', minWidth:50,
                          background: isRest ? 'var(--c-orange-dim)' : isActive ? 'var(--c-blue-dim)' : 'var(--surface-3)',
                          color: isRest ? 'var(--c-orange)' : isActive ? 'var(--c-blue)' : 'var(--text-4)',
                          border: isActive ? '1px solid var(--c-blue-dim)' : '1px solid transparent' }}>
                        {d.replace('周','')}<br/>{isRest ? '💤' : isActive ? '🏋️' : '—'}
                      </div>
                      {isActive && !isRest && templates.length > 0 && (
                        <select value={entry.templateId} onChange={e => updateTemplate(w, dow, e.target.value)} style={{ fontSize:10, padding:'2px', borderRadius:4, border:'1px solid var(--border)' }}>
                          {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:'var(--text-4)', marginBottom:12 }}>提示：右键/长按标记休息日</div>
        <button disabled={!name.trim() || schedule.length === 0} onClick={() => onSave({ name, weeks, schedule })} style={{ width:'100%' }}>创建计划</button>
      </div>
    </div>
  );
};

// ─── 主 Dashboard ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  const [workouts, setWorkouts]         = useState([]);
  const [stats, setStats]               = useState(null);
  const [prs, setPrs]                   = useState([]);
  const [insights, setInsights]         = useState([]);
  const [bodyWeightLog, setBWLog]       = useState([]);
  const [templates, setTemplates]       = useState([]);
  const [todayPlan, setTodayPlan]       = useState([]);
  const [userProfile, setUserProfile]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [muscleHeatmap, setMuscleHeatmap] = useState(null);
  const [muscleVolume, setMuscleVolume]   = useState(null);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [reminderSettings, setReminderSettings] = useState(null);
  const [todaySuggestions, setTodaySuggestions] = useState([]);

  const [period, setPeriod]             = useState('all');
  const [activeTab, setActiveTab]       = useState('overview');
  const [progressExercise, setProgressExercise] = useState(null);
  const [showBWModal, setShowBWModal]   = useState(false);
  const [showProfile, setShowProfile]   = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState(null);

  // 编辑模式
  const [editWorkout, setEditWorkout] = useState(null);

  // 日历详情
  const [selectedDay, setSelectedDay] = useState(null);
  const [daySummary, setDaySummary] = useState(null);

  // 体态对比
  const [showPhotos, setShowPhotos] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wRes, sRes, prRes, insRes, bwRes, profRes, mhRes, mvRes, tpRes, tsRes] = await Promise.all([
        fetch(`${API_URL}/api/workouts?period=${period}`, { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/stats`,            { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/pr`,               { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/insights`,         { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/body-weight`,      { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/profile`,          { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/muscle-heatmap?period=${period}`, { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/muscle-volume?weeks=4`,           { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/training-plans`,                   { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/today-suggestions`,                { headers: { 'x-auth-token': token } }),
      ]);
      if (wRes.ok)    setWorkouts(await wRes.json());
      if (sRes.ok)    setStats(await sRes.json());
      if (prRes.ok)   setPrs(await prRes.json());
      if (insRes.ok)  setInsights(await insRes.json());
      if (bwRes.ok)   setBWLog(await bwRes.json());
      if (mhRes.ok)   setMuscleHeatmap(await mhRes.json());
      if (mvRes.ok)   setMuscleVolume(await mvRes.json());
      if (tpRes.ok)   setTrainingPlans(await tpRes.json());
      if (tsRes.ok)   setTodaySuggestions(await tsRes.json());
      if (profRes.ok) {
        const p = await profRes.json();
        setTemplates(p.templates || []);
        setTodayPlan(p.weeklyPlan || []);
        setUserProfile(p.profile || null);
        setProgressPhotos(p.progressPhotos || []);
        setReminderSettings(p.reminder || { enabled: false, time: '18:00', days: [] });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token, period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── 训练提醒通知
  useEffect(() => {
    if (!reminderSettings?.enabled || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
    const checkReminder = () => {
      if (Notification.permission !== 'granted') return;
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const shouldRemind = reminderSettings.days.length === 0 || reminderSettings.days.includes(currentDay);
      if (shouldRemind && currentTime === reminderSettings.time) {
        new Notification('IRON 健身提醒', { body: '该去训练了！保持连续打卡 💪', icon: '/favicon.ico' });
      }
    };
    const interval = setInterval(checkReminder, 60000);
    return () => clearInterval(interval);
  }, [reminderSettings]);

  // ── 删除执行 ──
  const execDelete = async () => {
    if (!deleteTarget) return;
    const { type, id, setIndex } = deleteTarget;
    try {
      if (type === 'workout') {
        const res = await fetch(`${API_URL}/api/workouts/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
        if (!res.ok) throw new Error();
        setWorkouts(w => w.filter(x => x._id !== id));
        fetchAll();
        toast.success('已删除训练记录');
      } else if (type === 'set') {
        const res = await fetch(`${API_URL}/api/workouts/${id}/set/${setIndex}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
        if (!res.ok) throw new Error();
        fetchAll();
        toast.success('已删除该组');
      } else if (type === 'bwEntry') {
        setBWLog(log => log.filter((_, i) => i !== id));
        toast.success('已删除体重记录');
      }
    } catch (e) {
      console.error(e);
      toast.error('删除失败，请检查网络后重试');
    }
    setDeleteTarget(null);
  };

  const handleSaveProfile = async (form) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ profile: { heightCm: parseInt(form.heightCm)||undefined, age: parseInt(form.age)||undefined, gender: form.gender||undefined, goal: form.goal, level: form.level, weeklyFrequency: parseInt(form.weeklyFrequency)||3 } }),
      });
      if (!res.ok) throw new Error();
      setShowProfile(false);
      fetchAll();
      toast.success('个人资料已更新');
    } catch (e) {
      console.error(e);
      toast.error('保存失败，请稍后重试');
    }
  };

  const handleUseShield = async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/streak-shield`, { method: 'POST', headers: { 'x-auth-token': token } });
      if (!res.ok) throw new Error();
      fetchAll();
      toast.success('护盾已使用，连续打卡不中断 🛡️');
    } catch (e) {
      console.error(e);
      toast.error('护盾使用失败');
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/templates/${id}`, { method: 'DELETE', headers: { 'x-auth-token': token } });
      if (!res.ok) throw new Error();
      fetchAll();
      toast.success('模板已删除');
    } catch (e) {
      console.error(e);
      toast.error('删除模板失败');
    }
  };

  const handleStartTemplate = (template) => {
    fetch(`${API_URL}/api/workouts/templates/${template._id}/use`, { method: 'POST', headers: { 'x-auth-token': token } }).catch(() => {});
    navigate('/add', { state: { template } });
  };

  const handleSaveBW = async (date, weight) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/body-weight`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ date, weight }),
      });
      if (!res.ok) throw new Error();
      fetchAll();
      setShowBWModal(false);
      toast.success(`体重 ${weight}kg 已记录`);
    } catch (e) {
      console.error(e);
      toast.error('保存失败，请稍后重试');
    }
  };

  // ── 编辑训练记录
  const handleSaveEdit = async (overrideSets) => {
    const setsToSave = overrideSets || editWorkout?.sets;
    if (!editWorkout || !setsToSave) return;
    try {
      const res = await fetch(`${API_URL}/api/workouts/${editWorkout._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ sets: setsToSave.map(({ idx, ...s }) => s) }),
      });
      if (!res.ok) throw new Error();
      setEditWorkout(null);
      fetchAll();
      toast.success('修改已保存');
    } catch (e) {
      console.error(e);
      toast.error('保存失败，请稍后重试');
    }
  };

  // ── 日历点击查看训练详情
  const handleDayClick = useCallback(async (dateStr) => {
    setSelectedDay(dateStr);
    setDaySummary(null);
    try {
      const res = await fetch(`${API_URL}/api/workouts/day/${dateStr}`, { headers: { 'x-auth-token': token } });
      if (res.ok) setDaySummary(await res.json());
      else setDaySummary({ exercises: [], exerciseCount: 0, totalVolume: 0, totalDuration: 0 });
    } catch { setDaySummary({ exercises: [], exerciseCount: 0, totalVolume: 0, totalDuration: 0 }); }
  }, [token]);

  // ── 训练提醒
  const handleSaveReminder = async (settings) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/reminder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setReminderSettings(updated);
      if (updated.enabled && 'Notification' in window) {
        Notification.requestPermission();
        toast.success(`已开启提醒 · ${updated.time}`);
      } else {
        toast.success('提醒已更新');
      }
    } catch (e) {
      console.error(e);
      toast.error('保存提醒失败');
    }
  };

  // ── 数据导出
  const handleExport = (format) => {
    const url = `${API_URL}/api/workouts/export?format=${format}`;
    fetch(url, { headers: { 'x-auth-token': token } })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `fitness_data.${format}`;
        a.click();
        toast.success(`已导出 ${format.toUpperCase()} 文件`);
      })
      .catch(() => toast.error('导出失败，请稍后重试'));
  };

  // ── 创建训练计划
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const handleCreatePlan = async (data) => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/training-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      setShowCreatePlan(false);
      fetchAll();
      toast.success('训练计划已创建');
    } catch (e) {
      console.error(e);
      toast.error('创建计划失败');
    }
  };

  // ── 数据处理 ──
  const allActiveDates = workouts.map(w => toLocalDateStr(w.date));

  const groupedWorkouts = workouts.reduce((acc, w) => {
    const raw = new Date(w.date);
    const key = raw.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    if (!acc[key]) acc[key] = { rawDate: raw, items: [], totalVol: 0, totalCals: 0, totalDuration: 0 };
    acc[key].items.push(w);
    if (w.type === 'strength') acc[key].totalVol += w.sets.reduce((a, s) => a + s.weight * s.reps, 0);
    else acc[key].totalCals += w.sets.reduce((a, s) => a + (s.reps || 0), 0);
    acc[key].totalDuration += (w.duration || 0);
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
    { key: 'plan',      label: '计划',  icon: '📅' },
    { key: 'pr',        label: '纪录',  icon: '🏆' },
    { key: 'body',      label: '体重',  icon: '⚖️' },
    { key: 'muscles',   label: '肌群',  icon: '💪' },
  ];

  // 渲染各 Tab 内容
  const renderTabContent = () => {
    if (loading && !stats && activeTab === 'overview') {
      return <OverviewSkeleton />;
    }
    switch (activeTab) {

      // ═══ 总览 ═══
      case 'overview': return (
        <div className="overview-grid">
          <div className="bento-grid">
            {/* 日历 */}
            <div className="bento-item calendar-card">
              <MonthCalendar activeDates={allActiveDates} onDayClick={handleDayClick} />
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
              <div className="bento-row">
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">总时长</div>
                  <div className="stat-value">{loading ? '…' : stats ? Math.round(stats.totalDuration / 3600) : '0'}</div>
                  <div className="stat-unit">小时</div>
                </div>
                <div className="bento-item stat-mini-card">
                  <div className="stat-label">训练</div>
                  <div className="stat-value">{loading ? '…' : stats?.totalWorkouts ?? 0}</div>
                  <div className="stat-unit">次</div>
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

          {/* 今日建议 — 规则教练 */}
          {todaySuggestions.length > 0 && (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: 16, border: '1px solid var(--border)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16 }}>今日建议</h3>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--c-blue-dim)', color: 'var(--c-blue)', padding: '2px 8px', borderRadius: 99, letterSpacing: '.04em' }}>规则教练</span>
                </div>
                <button onClick={() => navigate('/add')} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>全部 ›</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todaySuggestions.map((s, i) => (
                  <div key={i}
                    onClick={() => navigate('/add', { state: { preselectExercise: s.exercise } })}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 'var(--r-m)', cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--c-blue-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-3)'}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--c-blue-dim)', color: 'var(--c-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{s.exercise}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.reason}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', background: 'var(--surface)', padding: '3px 8px', borderRadius: 99, flexShrink: 0 }}>{s.muscle}</span>
                    <span style={{ color: 'var(--text-4)', fontSize: 16, flexShrink: 0 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* 体态对比入口 */}
          <div onClick={() => setShowPhotos(true)} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <span style={{ fontSize:24 }}>📸</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>体态对比</div>
              <div style={{ fontSize:12, color:'var(--text-3)' }}>{progressPhotos.length > 0 ? `${progressPhotos.length}张照片 · 点击对比` : '上传照片记录变化'}</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="var(--text-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      );

      // ═══ 历史 ═══
      case 'history': return (
        <div style={{ maxWidth: 'var(--max-w)', margin: '0 auto', padding: '0 12px 20px' }}>
          {/* 筛选 + 导出 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            {[{k:'week',l:'7天'},{k:'month',l:'30天'},{k:'all',l:'全部'}].map(p => (
              <button key={p.k} onClick={() => setPeriod(p.k)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 99, background: period===p.k?'var(--text-1)':'var(--surface-3)', color: period===p.k?'#fff':'var(--text-2)', border: 'none' }}>{p.l}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button onClick={() => handleExport('csv')} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, borderRadius: 99, background: 'var(--surface-3)', color: 'var(--text-3)', border: 'none', cursor: 'pointer' }}>📥 CSV</button>
              <button onClick={() => handleExport('json')} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, borderRadius: 99, background: 'var(--surface-3)', color: 'var(--text-3)', border: 'none', cursor: 'pointer' }}>📥 JSON</button>
            </div>
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
            <EmptyState
              kind="history"
              title="暂无记录"
              desc="从今天开始记录你的训练"
              action={<Link to="/add"><button style={{ padding:'11px 24px' }}>开始训练</button></Link>}
            />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {sortedDates.map(dateKey => {
                const day = groupedWorkouts[dateKey];
                return (
                  <div key={dateKey}>
                    {/* 日期头 */}
                               <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{dateKey}</span>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        {day.totalDuration > 0 && <span style={{ fontSize:10, fontWeight:700, color:'var(--c-purple)', background:'rgba(94,92,230,.1)', padding:'2px 8px', borderRadius:99 }}>{Math.round(day.totalDuration / 60)}分钟</span>}
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
                              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                                {w.duration > 0 && <span style={{ fontSize:10, fontWeight:700, color:'var(--c-purple)', background:'rgba(94,92,230,.1)', padding:'2px 8px', borderRadius:99 }}>{Math.round(w.duration/60)}分钟</span>}
                                <button
                                  onClick={() => setEditWorkout({ _id: w._id, exercise: w.exercise, type: w.type, sets: w.sets.map((s,i) => ({...s, idx: i})) })}
                                  style={{ background:'none', border:'none', color:'var(--c-blue)', fontSize:12, fontWeight:600, padding:'2px 6px', cursor:'pointer', borderRadius:4 }}
                                >编辑</button>
                                <button
                                  onClick={() => setDeleteTarget({ type:'workout', id:w._id, label:`删除「${w.exercise}」`, desc:'将删除该动作的全部组数，无法撤销。' })}
                                  style={{ background:'none', border:'none', color:'var(--text-4)', fontSize:18, padding:'2px 4px', cursor:'pointer', lineHeight:1, borderRadius:6 }}
                                >×</button>
                              </div>
                            </div>

                             {/* 组数列表 */}
                            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                              {w.sets.map((s, i) => (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0', borderBottom:i<w.sets.length-1?'1px solid var(--border)':'none', fontSize:13 }}>
                                  {w.type==='strength' && <span style={{ color: s.isWarmup ? 'var(--c-orange)' : 'var(--text-4)', fontFamily:'var(--font-mono)', fontSize:11, width:26, flexShrink:0 }}>{s.isWarmup ? `W${String(i+1).padStart(2,'0')}` : `S${String(i+1).padStart(2,'0')}`}</span>}
                                  {w.type==='cardio' ? (
                                    <><span style={{ fontWeight:600 }}>{s.weight} min</span>{s.reps>0 && <span style={{ color:'var(--c-orange)', fontWeight:600 }}>{s.reps} kcal</span>}</>
                                  ) : (
                                    <><span style={{ fontWeight:600 }}>{s.weight===0?'自重':`${s.weight} kg`}</span><span style={{ color:'var(--text-4)' }}>×</span><span style={{ fontWeight:600 }}>{s.reps} 次</span>{s.setType==='superset' && <span style={{ color:'#5e5ce6', fontSize:9, fontWeight:700, marginLeft:4, background:'rgba(94,92,230,.1)', padding:'1px 4px', borderRadius:3 }}>超级</span>}{s.setType==='dropset' && <span style={{ color:'#ff9f0a', fontSize:9, fontWeight:700, marginLeft:4, background:'rgba(255,159,10,.1)', padding:'1px 4px', borderRadius:3 }}>递减</span>}{s.rpe && <span style={{ color: s.rpe >= 9 ? '#ff3b30' : s.rpe >= 7 ? '#ff9f0a' : '#34c759', fontSize: 10, fontWeight: 700, marginLeft:4 }}>RPE{s.rpe}</span>}</>
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
            <EmptyState
              kind="pr"
              title="还没有个人记录"
              desc="完成力量训练后，最佳成绩会自动统计"
            />
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
                     {pr.best1RM > 0 && <div style={{ fontSize:10, color:'var(--c-purple)', fontWeight:700, marginTop:2 }}>1RM ≈ {pr.best1RM} kg</div>}
                   </div>
                  <button className="secondary" style={{ fontSize:12, padding:'7px 12px', borderRadius:99, flexShrink:0 }} onClick={() => setProgressExercise(pr.exercise)}>趋势</button>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      // ═══ 计划（模板 + 多周计划）═══
      case 'plan': return (
        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 12px 20px' }}>
          {/* 训练模板 */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:15, fontWeight:700 }}>训练模板</span>
              <button onClick={() => navigate('/add')} style={{ padding:'6px 14px', fontSize:13, fontWeight:600, borderRadius:99, background:'var(--c-blue-dim)', color:'var(--c-blue)', border:'none' }}>+ 开始训练</button>
            </div>
            {templates.length === 0 ? (
              <EmptyState
                kind="template"
                title="暂无训练模板"
                desc="完成训练后可保存为模板，下次快速开始"
                compact
              />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {templates.map(t => (
                  <SwipeToDeleteRow key={t._id} onDelete={() => handleDeleteTemplate(t._id)} deleteLabel="删除">
                    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-l)', padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:2 }}>{t.name}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {t.exercises.map(e => e.exercise).join(' · ')}
                        </div>
                        {t.lastUsed && (
                          <div style={{ fontSize:11, color:'var(--c-blue)', marginTop:2, fontWeight:500 }}>
                            上次 {new Date(t.lastUsed).toLocaleDateString('zh-CN')}{t.useCount > 1 && ` · ${t.useCount}次`}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleStartTemplate(t)} style={{ padding:'9px 18px', fontSize:14, flexShrink:0 }}>开始</button>
                    </div>
                  </SwipeToDeleteRow>
                ))}
              </div>
            )}
          </div>

          {/* 多周训练计划 */}
          <div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>多周训练计划</div>
            {trainingPlans.length === 0 ? (
              <EmptyState
                kind="plan"
                title="暂无训练计划"
                desc="创建多周结构化计划，系统化提升"
                compact
              />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {trainingPlans.map(plan => {
                  const startDate = new Date(plan.startDate);
                  const now = new Date();
                  const currentWeek = Math.min(plan.weeks - 1, Math.floor((now - startDate) / (7 * 86400000)));
                  const pct = Math.round(((currentWeek + 1) / plan.weeks) * 100);
                  return (
                    <SwipeToDeleteRow key={plan._id} onDelete={() => {
                      fetch(`${API_URL}/api/workouts/training-plans/${plan._id}`, { method:'DELETE', headers:{ 'x-auth-token': token } }).then(() => fetchAll());
                    }} deleteLabel="删除">
                      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-l)', padding:'14px 16px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                          <div style={{ fontSize:15, fontWeight:700 }}>{plan.name}</div>
                          <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background: plan.isActive ? 'var(--c-green-dim)' : 'var(--surface-3)', color: plan.isActive ? 'var(--c-green)' : 'var(--text-4)' }}>{plan.isActive ? '进行中' : '已完成'}</span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>{plan.weeks} 周 · {plan.schedule?.length || 0} 个训练日</div>
                        <div style={{ height:6, background:'var(--surface-3)', borderRadius:99, overflow:'hidden', marginBottom:4 }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,var(--c-blue),var(--c-indigo))', borderRadius:99, transition:'width .5s' }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-4)' }}>
                          <span>第 {currentWeek + 1} / {plan.weeks} 周</span><span>{pct}%</span>
                        </div>
                      </div>
                    </SwipeToDeleteRow>
                  );
                })}
              </div>
            )}
            <button onClick={() => setShowCreatePlan(true)} style={{ border:'1.5px dashed var(--border)', background:'transparent', color:'var(--text-3)', padding:'14px', fontSize:14, fontWeight:600, borderRadius:'var(--r-l)', marginTop:12, width:'100%' }}>
              + 新建训练计划
            </button>
          </div>
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

      // ═══ 肌群分析 ═══
      case 'muscles': return (
        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 12px 20px' }}>
          {/* 肌群热力图 */}
          {muscleHeatmap && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'16px', marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>肌群热力图</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {Object.entries(muscleHeatmap.muscles || {}).sort((a,b) => b[1] - a[1]).map(([muscle, count]) => {
                  const intensity = Math.min(1, count / (muscleHeatmap.max * 0.7));
                  const r = Math.round(232 * intensity + 240 * (1-intensity));
                  const g = Math.round(64 * intensity + 240 * (1-intensity));
                  const b2 = Math.round(64 * intensity + 240 * (1-intensity));
                  return (
                    <div key={muscle} style={{ padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:700, background:`rgba(${Math.round(0+220*(1-intensity))},${Math.round(100*intensity+200*(1-intensity))},${Math.round(80*intensity+220*(1-intensity))},${0.15+intensity*0.35})`, color:`rgb(${Math.round(30+50*intensity)},${Math.round(80*intensity+120*(1-intensity))},${Math.round(50*intensity+120*(1-intensity))})` }}>
                      {muscle} <span style={{ opacity:0.7 }}>{count}组</span>
                    </div>
                  );
                })}
                {Object.keys(muscleHeatmap.muscles || {}).length === 0 && <div style={{ fontSize:13, color:'var(--text-3)', padding:'20px 0', width:'100%', textAlign:'center' }}>暂无训练数据</div>}
              </div>
            </div>
          )}

          {/* 肌群训练量柱状图 */}
          {muscleVolume && Object.keys(muscleVolume.muscles || {}).length > 0 && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>近4周训练量（组数）</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {Object.entries(muscleVolume.muscles).sort((a,b) => {
                  const aTotal = a[1].reduce((x,y)=>x+y,0);
                  const bTotal = b[1].reduce((x,y)=>x+y,0);
                  return bTotal - aTotal;
                }).map(([muscle, weekly]) => {
                  const total = weekly.reduce((a,b)=>a+b,0);
                  const maxWeek = Math.max(...weekly, 1);
                  const gl = muscleVolume.guidelines?.[muscle];
                  return (
                    <div key={muscle}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>{muscle}</span>
                        <span style={{ fontSize:11, color:'var(--text-3)' }}>{total}组/4周 · 最近{weekly[weekly.length-1]}组</span>
                      </div>
                      <div style={{ display:'flex', gap:3 }}>
                        {weekly.map((count, i) => {
                          const pct = Math.min(100, (count / (gl?.mrv || 20)) * 100);
                          const overMev = !gl || count >= gl.mev;
                          const overMrv = gl && count >= gl.mrv;
                          return (
                            <div key={i} style={{ flex:1, height:20, borderRadius:4, background: overMrv ? 'rgba(255,59,48,.15)' : overMev ? 'rgba(52,199,89,.12)' : 'var(--surface-3)', position:'relative', overflow:'hidden' }}>
                              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${pct}%`, background: overMrv ? 'rgba(255,59,48,.4)' : overMev ? 'rgba(52,199,89,.35)' : 'rgba(0,113,227,.2)', borderRadius:4, transition:'height .5s' }} />
                              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'var(--text-3)' }}>{count}</div>
                            </div>
                          );
                        })}
                      </div>
                      {gl && <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--text-4)', marginTop:2 }}><span>MEV {gl.mev}</span><span>MRV {gl.mrv}</span></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!muscleHeatmap || Object.keys(muscleHeatmap.muscles || {}).length === 0) && (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-3)' }}>
              <div style={{ fontSize:44, marginBottom:12 }}>💪</div>
              <div style={{ fontSize:16, fontWeight:600, color:'var(--text-1)', marginBottom:6 }}>开始训练以查看肌群分析</div>
              <div style={{ fontSize:13 }}>训练后自动统计各肌群训练量</div>
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
         {/* 计划 */}
         <div className={`tab-item ${activeTab==='plan'?'active':''}`} onClick={() => setActiveTab('plan')}>
           <span className="tab-icon">📅</span>
           <span className="tab-label">计划</span>
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
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} onSave={handleSaveProfile} onLogout={logout} currentProfile={userProfile} reminderSettings={reminderSettings} onSaveReminder={handleSaveReminder} />}
      {editWorkout && <EditWorkoutModal workout={editWorkout} onClose={() => setEditWorkout(null)} onSave={(newSets) => handleSaveEdit(newSets)} />}
      {showCreatePlan && <CreatePlanModal templates={templates} onClose={() => setShowCreatePlan(false)} onSave={handleCreatePlan} />}
      {selectedDay && <DaySummaryModal date={selectedDay} data={daySummary} onClose={() => { setSelectedDay(null); setDaySummary(null); }} />}
      {showPhotos && <PhotosModal photos={progressPhotos} token={token} onClose={() => setShowPhotos(false)} onRefresh={() => fetchAll()} />}

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
