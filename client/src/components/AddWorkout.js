import React, {
  useState, useContext, useEffect, useRef, useCallback, useMemo, memo
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { API_URL } from '../config';

// ═══════════════════════════════════════════════════════════════
// 动作库（扩充版，按部位细分）
// ═══════════════════════════════════════════════════════════════
const EXERCISE_LIBRARY = {
  '胸部': [
    '杠铃卧推','哑铃卧推','上斜杠铃卧推','上斜哑铃推举','下斜杠铃卧推',
    '哑铃飞鸟','上斜哑铃飞鸟','下斜哑铃飞鸟','绳索夹胸','绳索飞鸟',
    '俯卧撑','宽距俯卧撑','钻石俯卧撑','双杠臂屈伸（胸）','史密斯卧推',
    '蝴蝶机夹胸','龙门架夹胸','下斜绳索飞鸟','弹力带卧推','悬吊俯卧撑',
  ],
  '背部': [
    '引体向上','反握引体向上','宽握引体向上','中握引体向上',
    '高位下拉','反握高位下拉','中立握高位下拉',
    '杠铃划船','坐姿划船','T型划船','单臂哑铃划船','绳索划船',
    '硬拉','直腿硬拉','早安式硬拉','绳索直臂下压','直立划船',
    '杠铃耸肩','哑铃耸肩','面拉','俯身飞鸟','反向飞鸟',
    '史密斯划船','悬吊划船','背部伸展',
  ],
  '腿部': [
    '深蹲','前蹲','哈克深蹲','史密斯深蹲','相扑深蹲','壶铃深蹲',
    '腿举','腿屈伸','腿弯举（坐姿）','腿弯举（俯卧）',
    '罗马尼亚硬拉','保加利亚分腿蹲','弓步蹲','行走弓步',
    '提踵（坐姿）','提踵（站姿）','单腿提踵',
    '臀桥','负重臀桥','单腿臀桥','髋关节伸展',
    '腿外展机','腿内收机','侧卧抬腿','消防栓',
  ],
  '肩部': [
    '杠铃推举','哑铃肩推','阿诺德推举','史密斯推举',
    '哑铃侧平举','绳索侧平举','单臂绳索侧平举',
    '哑铃前平举','绳索前平举','杠铃前平举',
    '绳索面拉','杠铃直立划船','哑铃直立划船',
    '俯身哑铃飞鸟','绳索后束拉','反向蝴蝶机',
    '弹力带肩推','哑铃耸肩（斜方肌）',
  ],
  '手臂': [
    // 二头
    '杠铃弯举','哑铃弯举','锤式弯举','绳索弯举',
    '上斜哑铃弯举','集中弯举','蜘蛛弯举','反握弯举',
    '对握弯举','弹力带弯举',
    // 三头
    '三头绳索下压','绳索过头伸展','仰卧臂屈伸',
    '双杠臂屈伸（三头）','哑铃过头臂屈伸','单臂绳索下压',
    '窄距卧推','下斜臂屈伸','椅子撑体',
    // 前臂
    '腕弯举','反握腕弯举','握力训练',
  ],
  '核心': [
    '卷腹','仰卧起坐','反向卷腹','自行车卷腹','V字起坐',
    '平板支撑','侧平板','侧平板旋转','RKC平板',
    '悬垂举腿','悬垂屈膝举腿','仰卧举腿','直腿上举',
    '俄罗斯挺身','木桩式转体','绳索卷腹','绳索旋转',
    '山地爬行','滚轮卷腹','药球砸地','死虫式',
    '鸟狗式','麦克罗伊卷腹','Pallof推举',
  ],
  '臀部': [
    '臀桥','负重臀桥','单腿臀桥','弹力带臀桥',
    '深蹲（臀向后）','罗马尼亚硬拉','保加利亚分腿蹲',
    '蚌式训练','侧卧蚌式','站姿髋外展',
    '绳索臀部后踢','站姿臀部外展','俯卧臀部后踢',
    '弹力带侧走','臀冲','反向弓步',
  ],
  '有氧': [
    '跑步','快走','椭圆机','动感单车','划船机',
    '跳绳','游泳','爬楼梯','HIIT','跳箱',
    '战绳','开合跳','波比跳','高抬腿','踏步机',
    '空中自行车','原地跑','划水机','雪橇推拉',
  ],
};

// 部位配色（SVG图标，不依赖emoji字体，统一精致）
const CATEGORY_META = {
  '胸部': { color: '#e84040', bg: 'rgba(232,64,64,0.08)',   desc: '胸大肌 · 前锯肌' },
  '背部': { color: '#2f86eb', bg: 'rgba(47,134,235,0.08)',  desc: '背阔肌 · 斜方肌 · 菱形肌' },
  '腿部': { color: '#27ae60', bg: 'rgba(39,174,96,0.08)',   desc: '股四头肌 · 腘绳肌 · 小腿' },
  '肩部': { color: '#d4a017', bg: 'rgba(212,160,23,0.08)',  desc: '三角肌前 / 中 / 后束' },
  '手臂': { color: '#8e44ad', bg: 'rgba(142,68,173,0.08)',  desc: '二头肌 · 三头肌 · 前臂' },
  '核心': { color: '#e67e22', bg: 'rgba(230,126,34,0.08)',  desc: '腹直肌 · 腹斜肌 · 深层核心' },
  '臀部': { color: '#c0395e', bg: 'rgba(192,57,94,0.08)',   desc: '臀大肌 · 臀中肌 · 臀小肌' },
  '有氧': { color: '#16a085', bg: 'rgba(22,160,133,0.08)',  desc: '心肺耐力 · 脂肪燃烧' },
};

// SVG图标：用简洁线条图标代替emoji
const CategoryIcon = ({ cat, size = 18, color }) => {
  const c = color || CATEGORY_META[cat]?.color || '#666';
  const icons = {
    '胸部': <><rect x="4" y="8" width="7" height="8" rx="3.5" stroke={c} strokeWidth="1.6" fill="none"/><rect x="13" y="8" width="7" height="8" rx="3.5" stroke={c} strokeWidth="1.6" fill="none"/><path d="M11 12h2" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M4 8 Q12 4 20 8" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/></>,
    '背部': <><path d="M12 3 L12 21" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M6 7 Q12 5 18 7" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/><path d="M5 12 Q12 9 19 12" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/><path d="M6 17 Q12 14 18 17" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/></>,
    '腿部': <><path d="M9 3 L7 21" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M15 3 L17 21" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M8.5 12 Q12 11 15.5 12" stroke={c} strokeWidth="1.4" fill="none"/><path d="M7 21 L10 21" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M17 21 L14 21" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></>,
    '肩部': <><circle cx="12" cy="5" r="2" stroke={c} strokeWidth="1.6" fill="none"/><path d="M5 10 Q12 6 19 10" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/><path d="M5 10 L5 19" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M19 10 L19 19" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M5 19 L19 19" stroke={c} strokeWidth="1.6" strokeLinecap="round"/></>,
    '手臂': <><path d="M8 20 L8 10 Q8 4 14 4 Q17 4 17 8 Q17 11 14 11 L8 11" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 14 L15 14 Q18 14 18 17 Q18 20 15 20 L8 20" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></>,
    '核心': <><ellipse cx="12" cy="12" rx="7" ry="9" stroke={c} strokeWidth="1.6" fill="none"/><path d="M12 3 L12 21" stroke={c} strokeWidth="1.4" strokeLinecap="round"/><path d="M5.5 9 Q12 8 18.5 9" stroke={c} strokeWidth="1.2" fill="none"/><path d="M5 12 Q12 11 19 12" stroke={c} strokeWidth="1.2" fill="none"/><path d="M5.5 15 Q12 14 18.5 15" stroke={c} strokeWidth="1.2" fill="none"/></>,
    '臀部': <><path d="M5 20 Q5 11 12 11 Q19 11 19 20" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round"/><path d="M5 20 L19 20" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><circle cx="8" cy="8" r="2.5" stroke={c} strokeWidth="1.4" fill="none"/><circle cx="16" cy="8" r="2.5" stroke={c} strokeWidth="1.4" fill="none"/></>,
    '有氧': <><circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.6" fill="none"/><path d="M12 4 L12 7" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M12 17 L12 20" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M4 12 L7 12" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M17 12 L20 12" stroke={c} strokeWidth="1.6" strokeLinecap="round"/><path d="M6.3 6.3 L8.5 8.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/><path d="M15.5 15.5 L17.7 17.7" stroke={c} strokeWidth="1.4" strokeLinecap="round"/><path d="M17.7 6.3 L15.5 8.5" stroke={c} strokeWidth="1.4" strokeLinecap="round"/><path d="M8.5 15.5 L6.3 17.7" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {icons[cat] || <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.6" fill="none"/>}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════
// 工具函数（模块级，不在组件内，避免每次渲染重建）
// ═══════════════════════════════════════════════════════════════
const fmt      = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const fmtShort = s => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
const toDay    = () => new Date().toISOString().split('T')[0];

const isCardioExercise = (ex, cat) => {
  if (cat === '有氧') return true;
  return ['跑', '骑', '椭圆', '划船机', '跳绳', '游泳', 'HIIT', '爬楼', '踏步'].some(k => ex.includes(k));
};

// 搜索（全库 + 自定义动作，按匹配度排序）
const searchExercises = (query, customList) => {
  if (!query.trim()) return [];
  const q = query.trim();
  const results = [];
  Object.entries(EXERCISE_LIBRARY).forEach(([cat, list]) => {
    list.forEach(ex => {
      if (ex.includes(q)) results.push({ ex, cat, score: ex === q ? 200 : ex.startsWith(q) ? 150 : 100 });
    });
  });
  // 自定义动作搜索
  if (customList) {
    customList.forEach(ce => {
      if (ce.name.includes(q)) results.push({ ex: ce.name, cat: '自定义', score: ce.name === q ? 200 : ce.name.startsWith(q) ? 150 : 100 });
    });
  }
  // 模糊：逐字符相似度
  if (results.length < 8) {
    Object.entries(EXERCISE_LIBRARY).forEach(([cat, list]) => {
      list.forEach(ex => {
        if (results.find(r => r.ex === ex)) return;
        let sim = 0;
        for (let i = 0; i < Math.min(q.length, ex.length); i++) { if (q[i] === ex[i]) sim++; }
        const score = (sim / Math.max(q.length, ex.length)) * 60;
        if (score > 8) results.push({ ex, cat, score });
      });
    });
    if (customList) {
      customList.forEach(ce => {
        if (results.find(r => r.ex === ce.name)) return;
        let sim = 0;
        for (let i = 0; i < Math.min(q.length, ce.name.length); i++) { if (q[i] === ce.name[i]) sim++; }
        const score = (sim / Math.max(q.length, ce.name.length)) * 60;
        if (score > 8) results.push({ ex: ce.name, cat: '自定义', score });
      });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 15);
};

// ─── localStorage 草稿（仅保存核心字段，不含 elapsed 避免每秒写入）
const DRAFT_KEY = 'workout_draft_v2';
const saveDraft = (data) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() })); } catch {}
};
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (Date.now() - d.savedAt > 6 * 3600 * 1000) { localStorage.removeItem(DRAFT_KEY); return null; }
    return d;
  } catch { return null; }
};
const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

const vibrate = (p) => { try { navigator?.vibrate?.(p); } catch {} };

// ═══════════════════════════════════════════════════════════════
// 子组件（memo 包裹，避免父组件重渲染时不必要的子组件渲染）
// ═══════════════════════════════════════════════════════════════

// ─── 退出确认 Sheet
const ExitSheet = memo(({ onSave, onDiscard, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 4000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'modalFadeIn 0.2s ease' }} onClick={onCancel}>
    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', width: '100%', maxWidth: 500, borderRadius: 'var(--r-xl) var(--r-xl) 0 0', padding: '8px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px auto 20px' }} />
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>退出训练？</div>
      <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24, lineHeight: 1.5 }}>训练进度已自动保存，下次打开会自动恢复。</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onSave} style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, borderRadius: 'var(--r-l)', background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>保存草稿，稍后继续</button>
        <button onClick={onDiscard} style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, borderRadius: 'var(--r-l)', background: 'var(--c-red-dim)', color: 'var(--c-red)', border: 'none', cursor: 'pointer' }}>放弃本次训练</button>
        <button onClick={onCancel} style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 600, borderRadius: 'var(--r-l)', background: 'var(--surface-3)', color: 'var(--text-2)', border: 'none', cursor: 'pointer' }}>继续训练</button>
      </div>
    </div>
  </div>
));

// ─── 完成一组闪光动画
const SetCompleteFlash = memo(({ onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 750); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--c-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#fff', animation: 'setCheckPop 0.75s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>✓</div>
      <style>{`@keyframes setCheckPop{0%{transform:scale(0);opacity:0;box-shadow:0 0 0 0 rgba(52,199,89,.5)}40%{transform:scale(1.2);opacity:1;box-shadow:0 0 0 20px rgba(52,199,89,.15)}70%{transform:scale(1);box-shadow:0 0 0 32px rgba(52,199,89,0)}100%{transform:scale(1);opacity:0}}`}</style>
    </div>
  );
});

// ─── 草稿恢复横幅
const DraftBanner = memo(({ draft, onRestore, onDiscard }) => {
  const ago = Math.round((Date.now() - draft.savedAt) / 60000);
  const agoText = ago < 1 ? '刚刚' : ago < 60 ? `${ago}分钟前` : `${Math.floor(ago / 60)}小时前`;
  return (
    <div style={{ background: 'linear-gradient(135deg,var(--c-blue-dim),rgba(94,92,230,.08))', border: '1px solid rgba(0,113,227,.2)', borderRadius: 'var(--r-l)', padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>💾</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>发现未完成的训练</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{agoText}保存 · {draft.completedExercises?.length || 0} 个动作已完成</div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={onDiscard} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 12, fontWeight: 600, padding: '6px 10px', cursor: 'pointer', borderRadius: 8 }}>丢弃</button>
        <button onClick={onRestore} style={{ background: 'var(--c-blue)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, padding: '7px 14px', cursor: 'pointer', borderRadius: 99 }}>恢复</button>
      </div>
    </div>
  );
});

// ─── 休息计时浮窗（独立组件，自己维护 interval）
const RestTimer = memo(({ initialSecs, onSkip, onAdd, onExpire }) => {
  const [secs, setSecs] = useState(initialSecs);
  const secsRef = useRef(initialSecs);

  // 当父组件 onAdd 触发时同步
  const handleAdd = useCallback(() => {
    setSecs(s => { secsRef.current = s + 30; return s + 30; });
    onAdd?.();
  }, [onAdd]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(id); vibrate([100, 50, 200]); onExpire?.(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // 只在 mount 时启动一次

  const pct = secs / Math.max(initialSecs, 1);
  const circumference = 2 * Math.PI * 24;
  const urgent = secs <= 10;

  return (
    <div style={{ position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 400, background: 'rgba(20,20,22,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 24, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 12px 40px rgba(0,0,0,.4)', zIndex: 2000, animation: 'timerSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)', border: `1px solid ${urgent ? 'rgba(255,59,48,.4)' : 'rgba(255,255,255,.08)'}`, transition: 'border 0.3s' }}>
      <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
        <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="4" />
          <circle cx="28" cy="28" r="24" fill="none" stroke={urgent ? '#ff453a' : '#32d74b'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${circumference * pct} ${circumference}`} style={{ transition: 'stroke-dasharray 1s linear, stroke .3s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: urgent ? '#ff453a' : '#fff' }}>{fmt(secs)}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>休息中</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{fmt(secs)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button onClick={handleAdd} style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+30s</button>
        <button onClick={onSkip} style={{ background: 'rgba(255,59,48,.2)', color: '#ff453a', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>跳过</button>
      </div>
    </div>
  );
});

// ─── 有氧计时器
const CardioTimer = memo(({ onFinish }) => {
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (running) ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running]);
  const mins = Math.floor(secs / 60);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '20px', marginBottom: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>有氧计时</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 800, lineHeight: 1, marginBottom: 20, color: running ? 'var(--c-blue)' : 'var(--text-1)', transition: 'color .3s', fontVariantNumeric: 'tabular-nums' }}>
        {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {!running ? (
          <button onClick={() => setRunning(true)} style={{ background: 'var(--c-blue)', color: '#fff', border: 'none', borderRadius: 99, padding: '12px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>{secs === 0 ? '▶ 开始' : '▶ 继续'}</button>
        ) : (
          <button onClick={() => setRunning(false)} style={{ background: 'var(--c-orange)', color: '#fff', border: 'none', borderRadius: 99, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>⏸ 暂停</button>
        )}
        {secs > 0 && <button onClick={() => { setRunning(false); onFinish(mins); }} style={{ background: 'var(--c-green)', color: '#fff', border: 'none', borderRadius: 99, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>✓ {mins > 0 ? `完成 ${mins}min` : '完成'}</button>}
      </div>
    </div>
  );
});

// ─── 单组行（memo：只有自己的 set 数据变化时才重渲染）
const SetRow = memo(({ set, index, isCardio, isBodyweight, onChange, onRemove, onComplete, isDone, onToggleBodyweight }) => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const iRef = useRef(null);

  useEffect(() => {
    if (running) iRef.current = setInterval(() => setElapsed(t => t + 1), 1000);
    else clearInterval(iRef.current);
    return () => clearInterval(iRef.current);
  }, [running]);

  const handleComplete = useCallback(() => {
    setRunning(false);
    onComplete(index, elapsed);
  }, [index, elapsed, onComplete]);

  const warmupStyle = set.isWarmup ? { opacity: 0.6, borderStyle: 'dashed' } : {};

  return (
    <div style={{ background: isDone ? 'rgba(52,199,89,.06)' : set.isWarmup ? 'rgba(255,159,10,.04)' : 'var(--surface)', border: `1.5px solid ${isDone ? 'rgba(52,199,89,.35)' : set.isWarmup ? 'rgba(255,159,10,.25)' : 'var(--border)'}`, borderRadius: 'var(--r-l)', padding: '12px 14px', transition: 'all .25s ease', display: 'flex', flexDirection: 'column', gap: 10, ...warmupStyle }}>
      {/* 顶行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 99, flexShrink: 0, background: isDone ? 'var(--c-green)' : set.isWarmup ? 'var(--c-orange)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: isDone || set.isWarmup ? '#fff' : 'var(--text-3)', transition: 'all .3s cubic-bezier(.34,1.56,.64,1)' }}>{isDone ? '✓' : set.isWarmup ? 'W' : index + 1}</div>

        {!isCardio && !isDone && (
          <button type="button" onClick={() => onChange(index, 'isWarmup', !set.isWarmup)} style={{ background: set.isWarmup ? 'var(--c-orange-dim)' : 'var(--surface-3)', color: set.isWarmup ? '#b86800' : 'var(--text-4)', border: 'none', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>{set.isWarmup ? '热身' : '正式'}</button>
        )}

        {!isCardio && (
          <div style={{ flex: 1 }}>
            {isDone ? (
              set.setDuration > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>用时 {fmtShort(set.setDuration)}</span>
            ) : elapsed === 0 && !running ? (
              <button type="button" onClick={() => setRunning(true)} style={{ background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', borderRadius: 99, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>▶ 开始计时</button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: running ? 'var(--c-blue)' : 'var(--text-3)', minWidth: 40, animation: running ? 'pulse-text 1s infinite' : 'none' }}>{fmt(elapsed)}</span>
                {running
                  ? <button type="button" onClick={() => setRunning(false)} style={{ background: 'var(--surface-3)', border: 'none', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--text-3)' }}>暂停</button>
                  : <button type="button" onClick={() => setRunning(true)} style={{ background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>继续</button>
                }
              </div>
            )}
          </div>
        )}

        {!isDone ? (
          <>
            <button type="button" onClick={handleComplete} style={{ background: 'var(--c-blue)', color: '#fff', border: 'none', borderRadius: 99, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>完成</button>
            <button type="button" onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 20, padding: '0 2px', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--c-green)', fontWeight: 700, flexShrink: 0 }}>{set.isWarmup ? '热身' : '已完成'}</span>
        )}
      </div>

      {/* 输入行 */}
      {!isDone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isBodyweight ? (
              <div onClick={() => onToggleBodyweight(index)} style={{ width: '100%', textAlign: 'center', background: 'var(--c-blue-dim)', color: 'var(--c-blue)', fontWeight: 700, fontSize: 20, borderRadius: 10, padding: '10px 6px', cursor: 'pointer', border: '1px solid rgba(0,113,227,.2)' }}>自重</div>
            ) : (
              <input type="number" inputMode="decimal" value={set.weight === 0 || set.weight === '' ? '' : set.weight} onChange={e => onChange(index, 'weight', e.target.value)} placeholder="0" step={isCardio ? '1' : '0.5'} style={{ width: '100%', fontSize: 24, fontWeight: 700, textAlign: 'center', border: 'none', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 6px', color: 'var(--text-1)', outline: 'none', margin: 0, MozAppearance: 'textfield' }} />
            )}
            <span style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{isCardio ? '分钟' : isBodyweight ? '自重' : 'kg'}</span>
          </div>

          {!isBodyweight && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
              <button type="button" onClick={() => onChange(index, 'weight', Math.max(0, (parseFloat(set.weight) || 0) + (isCardio ? 5 : 2.5)))} style={{ width: 34, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 800, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--c-blue)', padding: 0 }}>+</button>
              <button type="button" onClick={() => onChange(index, 'weight', Math.max(0, (parseFloat(set.weight) || 0) - (isCardio ? 5 : 2.5)))} style={{ width: 34, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 800, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>-</button>
            </div>
          )}

          {!isCardio && (
            <>
              <div style={{ color: 'var(--text-4)', fontSize: 18, fontWeight: 300, flexShrink: 0 }}>×</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <input type="number" inputMode="numeric" value={set.reps === '' ? '' : set.reps} onChange={e => onChange(index, 'reps', e.target.value)} placeholder="0" step="1" style={{ width: '100%', fontSize: 24, fontWeight: 700, textAlign: 'center', border: 'none', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 6px', color: 'var(--text-1)', outline: 'none', margin: 0, MozAppearance: 'textfield' }} />
                <span style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>次</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                <button type="button" onClick={() => onChange(index, 'reps', (parseInt(set.reps) || 0) + 1)} style={{ width: 34, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 800, background: 'rgba(52,199,89,.1)', border: '1px solid rgba(52,199,89,.25)', cursor: 'pointer', color: 'var(--c-green)', padding: 0 }}>+</button>
                <button type="button" onClick={() => onChange(index, 'reps', Math.max(0, (parseInt(set.reps) || 0) - 1))} style={{ width: 34, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 800, background: 'var(--surface-3)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)', padding: 0 }}>-</button>
              </div>
              <button type="button" onClick={() => onToggleBodyweight(index)} title="切换自重" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: isBodyweight ? 'var(--c-blue-dim)' : 'var(--surface-3)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{isBodyweight ? '🏋️' : '⚖️'}</button>
            </>
          )}
        </div>
      )}

      {/* RPE 选择行（力量训练 & 非热身组） */}
      {!isCardio && !set.isWarmup && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: isDone ? 38 : 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', flexShrink: 0, minWidth: 24 }}>RPE</span>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {[5, 6, 7, 8, 9, 10].map(v => (
              <button key={v} type="button" onClick={() => onChange(index, 'rpe', set.rpe === v ? undefined : v)}
                style={{ flex: 1, minWidth: 0, padding: '4px 0', borderRadius: 6, fontSize: 12, fontWeight: 800, border: 'none', cursor: 'pointer',
                  background: set.rpe === v ? (v >= 9 ? 'rgba(255,59,48,.15)' : v >= 7 ? 'rgba(255,159,10,.15)' : 'rgba(52,199,89,.15)') : 'var(--surface-3)',
                  color: set.rpe === v ? (v >= 9 ? '#ff3b30' : v >= 7 ? '#ff9f0a' : '#34c759') : 'var(--text-4)',
                  transition: 'all .15s',
                }}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {/* 组类型选择（力量训练 & 非热身组 & 非完成） */}
      {!isCardio && !set.isWarmup && !isDone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', flexShrink: 0, minWidth: 24 }}>类型</span>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {[['normal','普通组',''],['superset','超级组','#5e5ce6'],['dropset','递减组','#ff9f0a']].map(([val, label, color]) => (
              <button key={val} type="button" onClick={() => onChange(index, 'setType', set.setType === val ? 'normal' : val)}
                style={{ flex: 1, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  background: set.setType === val ? (color ? `${color}18` : 'var(--c-blue-dim)') : 'var(--surface-3)',
                  color: set.setType === val ? (color || 'var(--c-blue)') : 'var(--text-4)',
                  transition: 'all .15s',
                }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {isDone && (
        <div style={{ fontSize: 14, fontWeight: 600, paddingLeft: 38, color: 'var(--text-2)' }}>
          {isCardio ? `${set.weight} 分钟` : isBodyweight ? `自重 × ${set.reps} 次` : `${set.weight} kg × ${set.reps} 次`}
          {set.setType === 'superset' && <span style={{ color:'#5e5ce6', fontSize:10, fontWeight:700, marginLeft:6, background:'rgba(94,92,230,.1)', padding:'1px 6px', borderRadius:4 }}>超级组</span>}
          {set.setType === 'dropset' && <span style={{ color:'#ff9f0a', fontSize:10, fontWeight:700, marginLeft:6, background:'rgba(255,159,10,.1)', padding:'1px 6px', borderRadius:4 }}>递减组</span>}
          {set.rpe && <span style={{ color: set.rpe >= 9 ? '#ff3b30' : set.rpe >= 7 ? '#ff9f0a' : '#34c759', fontSize: 11, fontWeight: 700, marginLeft: 8 }}>RPE {set.rpe}</span>}
          {set.setDuration > 0 && <span style={{ color: 'var(--text-4)', fontSize: 11, fontFamily: 'var(--font-mono)', marginLeft: 8 }}>{fmtShort(set.setDuration)}</span>}
        </div>
      )}
    </div>
  );
});

// ─── 动作完成庆祝页
const ExerciseDonePage = memo(({ exercise, sets, completedExercises, onNext, onEnd }) => {
  const vol = sets.reduce((a, s) => a + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
  useEffect(() => { vibrate([50, 30, 100]); }, []);
  return (
    <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto', padding: '48px 20px calc(80px + env(safe-area-inset-bottom))', textAlign: 'center' }}>
      <div style={{ animation: 'popIn .5s cubic-bezier(.34,1.56,.64,1)', marginBottom: 32 }}>
        <div style={{ width: 80, height: 80, background: 'var(--c-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 16px', boxShadow: '0 8px 28px rgba(52,199,89,.35)' }}>💪</div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 6 }}>{exercise}</div>
        <div style={{ fontSize: 15, color: 'var(--text-3)' }}>{sets.length} 组完成{vol > 0 && ` · ${vol.toLocaleString()} kg`}</div>
      </div>
      {completedExercises.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: '14px 16px', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>本次已完成</div>
          {[...completedExercises, { exercise, sets }].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < completedExercises.length ? '1px solid var(--border)' : 'none', fontSize: 14 }}>
              <span style={{ fontWeight: 600, color: i === completedExercises.length ? 'var(--c-green)' : 'var(--text-2)' }}>{r.exercise}</span>
              <span style={{ color: 'var(--text-3)' }}>{r.sets.length} 组</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onNext} style={{ fontSize: 16, padding: 15, borderRadius: 'var(--r-xl)', fontWeight: 700, background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>+ 继续下一个动作</button>
        <button onClick={onEnd} style={{ fontSize: 15, padding: 14, borderRadius: 'var(--r-xl)', fontWeight: 700, background: 'var(--c-green-dim)', color: '#1a7a35', border: 'none', cursor: 'pointer' }}>结束本次训练</button>
      </div>
    </div>
  );
});

// ─── 结算分享卡片
const WorkoutSummary = memo(({ records, duration, onDone }) => {
  const totalVol  = records.filter(r => r.type !== 'cardio').reduce((a, r) => a + r.sets.reduce((b, s) => b + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0), 0);
  const totalSets = records.reduce((a, r) => a + r.sets.length, 0);
  const mins      = Math.floor(duration / 60);
  const circumference = 2 * Math.PI * 42;
  const Ring = ({ pct, color, val, unit }) => (
    <div style={{ width: 88, height: 88, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${circumference * Math.min(1, pct)} ${circumference}`} style={{ transition: 'stroke-dasharray 1.5s cubic-bezier(.34,1.56,.64,1)' }} />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1 }}>{val}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 2 }}>{unit}</div>
      </div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px calc(80px + env(safe-area-inset-bottom))' }}>
      <div style={{ textAlign: 'center', marginBottom: 20, animation: 'popIn .5s cubic-bezier(.34,1.56,.64,1)' }}>
        <div style={{ width: 72, height: 72, background: 'var(--c-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(52,199,89,.35)' }}>🎉</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>训练完成</div>
      </div>
      <div style={{ background: '#141416', width: '100%', maxWidth: 390, borderRadius: 32, padding: '28px 24px 24px', color: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,.45)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 260, height: 260, background: 'radial-gradient(circle,rgba(52,199,89,.15) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.1 }}>完成训练<span style={{ color: '#32d74b' }}>.</span></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
          <Ring pct={mins / 60} color="#32d74b" val={mins} unit="分钟" />
          {totalVol > 0 && <Ring pct={totalVol / 10000} color="#0a84ff" val={`${(totalVol / 1000).toFixed(1)}`} unit="吨" />}
          <Ring pct={totalSets / 30} color="#ff453a" val={totalSets} unit="组" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '14px 8px', marginBottom: 20 }}>
          {[{ val: records.length, label: '动作' }, { val: `${mins}m`, label: '时长' }, { val: totalSets, label: '总组数' }].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 16 }}>
          {records.slice(0, 5).map((r, i) => {
            const best = r.sets.reduce((b, s) => (s.weight * s.reps > b.weight * b.reps ? s : b), r.sets[0] || {});
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < Math.min(records.length, 5) - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.8)' }}>{r.exercise}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>{r.type === 'cardio' ? `${r.sets.reduce((a, s) => a + (parseFloat(s.weight) || 0), 0)}min` : `${r.sets.length}组 · ${best.weight === 0 ? '自重' : `${best.weight}kg`}`}</span>
              </div>
            );
          })}
          {records.length > 5 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', textAlign: 'center', paddingTop: 10 }}>+{records.length - 5} 个动作</div>}
        </div>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.18)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>IRON · 健身日记</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.15)' }}>截图分享</span>
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 390, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onDone} style={{ width: '100%', padding: 15, fontSize: 16, fontWeight: 700, borderRadius: 'var(--r-xl)', background: 'var(--c-blue)', color: '#fff', border: 'none', cursor: 'pointer' }}>回到主页</button>
        <button onClick={() => navigator.share?.({ title: 'IRON 健身日记', text: `今天完成训练！${records.length}个动作，${totalSets}组，${mins}分钟。` })} style={{ width: '100%', padding: 13, fontSize: 14, fontWeight: 600, borderRadius: 'var(--r-xl)', background: 'var(--surface-3)', color: 'var(--text-2)', border: 'none', cursor: 'pointer' }}>分享成就</button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════
const AddWorkout = () => {
  const { token } = useContext(AuthContext);
  const navigate  = useNavigate();
  const location  = useLocation();
  const templateData = location.state?.template;

  // 总计时：用 ref 避免影响渲染
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startTimeRef.current) / 1000);
      elapsedRef.current = s;
      setElapsed(s);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // 核心状态
  const [phase, setPhase]               = useState('init');
  const [date, setDate]                 = useState(toDay());
  const [exercise, setExercise]         = useState('');
  const [exerciseType, setExerciseType] = useState('strength');
  const [sets, setSets]                 = useState([{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined, isWarmup: false, rpe: undefined }]);
  const [notes, setNotes]               = useState('');
  const [completedExercises, setCompletedExercises] = useState([]);
  const [templateQueue, setTemplateQueue] = useState([]);

  // 选择动作
  const [activeCategory, setActiveCategory] = useState('胸部');
  const [searchText, setSearchText]         = useState('');
  const [customExercise, setCustomExercise] = useState('');

  // 参考数据
  const [lastRecord, setLastRecord] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading]   = useState(false);

  // 能量
  const [energyLevel, setEnergyLevel] = useState(3);

  // 自定义动作库
  const [customExercises, setCustomExercises] = useState([]);

  // 动作替代建议
  const [alternatives, setAlternatives] = useState([]);

  // 休息计时：用 key 控制 RestTimer 组件重新挂载
  const [restKey, setRestKey]         = useState(0);
  const [restSecs, setRestSecs]       = useState(0);
  const [restActive, setRestActive]   = useState(false);

  // UI
  const [showExit, setShowExit]   = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [flashData, setFlashData] = useState(null); // { idx, duration }
  const [draft, setDraft]         = useState(null);

  // sets ref（解决闭包问题）
  const setsRef = useRef(sets);
  useEffect(() => { setsRef.current = sets; }, [sets]);

  // ── 初始化
  useEffect(() => {
    if (templateData) {
      const first = templateData.exercises[0];
      setExercise(first.exercise);
      setExerciseType(first.type || 'strength');
      setSets(first.sets?.length ? first.sets.map(s => ({ ...s, done: false, setDuration: 0, isWarmup: false, rpe: undefined })) : [{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined }]);
      setTemplateQueue(templateData.exercises.slice(1));
      loadExerciseData(first.exercise, first.type === 'cardio');
      setPhase('log');
    } else {
      const saved = loadDraft();
      if (saved) setDraft(saved);
      else setPhase('select');
    }
  }, []); // init once — loadExerciseData stable via useCallback

  // ── 自动保存（不含 elapsed，避免每秒写入）
  const draftTimerRef = useRef(null);
  useEffect(() => {
    if (phase === 'summary' || phase === 'init') return;
    if (completedExercises.length === 0 && sets.every(s => !s.weight && !s.reps && !s.done)) return;
    // 防抖 500ms
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft({ phase, date, exercise, exerciseType, sets, notes, completedExercises, templateQueue, energyLevel });
    }, 500);
    return () => clearTimeout(draftTimerRef.current);
  }, [phase, completedExercises, sets, exercise, notes, date, exerciseType, templateQueue, energyLevel]);

  // ── 加载自定义动作库
  useEffect(() => {
    fetch(`${API_URL}/api/workouts/custom-exercises`, { headers: { 'x-auth-token': token } })
      .then(r => r.ok ? r.json() : [])
      .then(setCustomExercises)
      .catch(() => {});
  }, [token]);

  // ── 草稿恢复
  const handleRestoreDraft = useCallback(() => {
    if (!draft) return;
    setPhase(draft.phase || 'log');
    setDate(draft.date || toDay());
    setExercise(draft.exercise || '');
    setExerciseType(draft.exerciseType || 'strength');
    setSets(draft.sets || [{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined }]);
    setNotes(draft.notes || '');
    setCompletedExercises(draft.completedExercises || []);
    setTemplateQueue(draft.templateQueue || []);
    setEnergyLevel(draft.energyLevel || 3);
    setDraft(null);
    clearDraft();
  }, [draft]);

  const handleDiscardDraft = useCallback(() => { clearDraft(); setDraft(null); setPhase('select'); }, []);

  // ── 推荐休息时间
  const getRestTime = useCallback(() => {
    const base = { '胸部': 90, '背部': 120, '腿部': 180, '肩部': 90, '手臂': 60, '核心': 60, '臀部': 120, '有氧': 0 };
    const mult = energyLevel <= 2 ? 1.3 : energyLevel >= 4 ? 0.8 : 1;
    const cat  = Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(exercise)) || '胸部';
    return Math.round((base[cat] || 90) * mult);
  }, [exercise, energyLevel]);

  // ── 加载动作历史
  const loadExerciseData = useCallback(async (ex, cardio) => {
    setIsLoading(true); setSuggestion(null); setLastRecord(null); setAlternatives([]);
    if (cardio) {
      const defaults = { '跑步': 30, '快走': 30, '动感单车': 45, '跳绳': 20, '游泳': 30, 'HIIT': 20, '椭圆机': 30, '划船机': 30 };
      setSets([{ weight: defaults[ex] || 30, reps: 0, done: false, setDuration: 0, isWarmup: false, rpe: undefined, setType: 'normal' }]);
      setIsLoading(false); return;
    }
    try {
      const [lastRes, sugRes, altRes] = await Promise.all([
        fetch(`${API_URL}/api/workouts/last/${encodeURIComponent(ex)}`, { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/suggest/${encodeURIComponent(ex)}`, { headers: { 'x-auth-token': token } }),
        fetch(`${API_URL}/api/workouts/alternatives/${encodeURIComponent(ex)}`, { headers: { 'x-auth-token': token } }),
      ]);
      if (lastRes.ok) {
        const last = await lastRes.json();
        setLastRecord(last);
        setSets(last?.sets?.length ? last.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false, setDuration: 0, isWarmup: s.isWarmup || false, rpe: s.rpe || undefined, setType: s.setType || 'normal' })) : [{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined, setType: 'normal' }]);
      } else setSets([{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined, setType: 'normal' }]);
      if (sugRes.ok) setSuggestion(await sugRes.json());
      if (altRes.ok) setAlternatives(await altRes.json());
    } catch { setSets([{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined, setType: 'normal' }]); }
    setIsLoading(false);
  }, [token]);

  // ── 选择动作
  const handleExerciseSelect = useCallback(async (ex, cat) => {
    // 立刻切换到 log 页，防止用户等待网络时页面无响应
    setExercise(ex);
    const resolvedCat = cat || Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(ex)) || activeCategory;
    const cardio = isCardioExercise(ex, resolvedCat);
    setExerciseType(cardio ? 'cardio' : 'strength');
    setNotes(''); setSearchText('');
    setPhase('log');
    // 切换页面后立即回到顶部
    window.scrollTo({ top: 0, behavior: 'instant' });
    // 后台加载历史数据
    await loadExerciseData(ex, cardio);
  }, [activeCategory, loadExerciseData]);

  const handleBackToSelect = useCallback(() => {
    setSets([{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined, setType: 'normal' }]);
    setNotes(''); setExercise(''); setSuggestion(null); setLastRecord(null);
    setPhase('select');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // ── 组数操作（useCallback 避免 SetRow 不必要重渲染）
  const handleSetChange = useCallback((i, field, val) => {
    setSets(prev => { const ns = [...prev]; ns[i] = { ...ns[i], [field]: val }; return ns; });
  }, []);

  const handleSetComplete = useCallback((i, dur) => {
    setFlashData({ idx: i, duration: dur });
    setShowFlash(true);
    vibrate([40, 20, 80]);
  }, []);

  const onFlashDone = useCallback(() => {
    setShowFlash(false);
    setFlashData(fd => {
      if (!fd) return fd;
      // 使用 ref 读取最新 sets，避免闭包过期
      setSets(prev => {
        const ns = [...prev];
        ns[fd.idx] = { ...ns[fd.idx], done: true, setDuration: fd.duration || 0 };
        return ns;
      });
      // 启动休息计时
      const rec = getRestTime();
      if (rec > 0) {
        setRestSecs(rec);
        setRestKey(k => k + 1); // 重新挂载 RestTimer
        setRestActive(true);
      }
      return null;
    });
  }, [getRestTime]);

  const addSet = useCallback(() => {
    setSets(prev => {
      const last = prev[prev.length - 1];
      return [...prev, { weight: last?.weight || '', reps: last?.reps || '', done: false, setDuration: 0, isWarmup: false, rpe: undefined, setType: 'normal' }];
    });
  }, []);

  const removeSet = useCallback((i) => {
    setSets(prev => prev.length <= 1 ? prev : prev.filter((_, j) => j !== i));
  }, []);

  const handleToggleBodyweight = useCallback((i) => {
    setSets(prev => {
      const ns = [...prev];
      ns[i] = { ...ns[i], weight: (ns[i].weight === 0 || ns[i].weight === '0') ? '' : 0 };
      return ns;
    });
  }, []);

  // ── 完成当前动作
  const getValidSets = useCallback(() => {
    return sets
      .map(s => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0, setDuration: s.setDuration || 0, isWarmup: !!s.isWarmup, rpe: s.rpe || undefined, setType: s.setType || 'normal' }))
      .filter(s => exerciseType === 'cardio' ? s.weight > 0 : s.reps > 0);
  }, [sets, exerciseType]);

  const handleFinishExercise = useCallback(() => {
    const validSets = getValidSets();
    if (!validSets.length) { alert('请至少完成一组有效数据'); return; }
    const record = { date, exercise, type: exerciseType, sets: validSets, notes, duration: elapsedRef.current || 0 };
    setCompletedExercises(prev => [...prev, record]);
    setRestActive(false); setRestSecs(0);
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 如果是自定义动作，自动保存到用户自定义动作库
    const cat = Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(exercise));
    if (!cat && exerciseType !== 'cardio') {
      fetch(`${API_URL}/api/workouts/custom-exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ name: exercise, category: '自定义', type: exerciseType }),
      }).catch(() => {});
    }

    if (templateQueue.length > 0) {
      const next = templateQueue[0];
      setTemplateQueue(q => q.slice(1));
      setExercise(next.exercise);
      setExerciseType(next.type || 'strength');
      setNotes('');
      setPhase('log');
      loadExerciseData(next.exercise, next.type === 'cardio');
    } else {
      setPhase('done');
    }
  }, [getValidSets, date, exercise, exerciseType, notes, templateQueue, loadExerciseData, token]);

  // ── 提交结算
  const handleEndWorkout = useCallback(async (overrideCompleted) => {
    const records = overrideCompleted ?? completedExercises;
    if (!records.length) { navigate('/'); return; }
    try {
      await Promise.all(records.map(r =>
        fetch(`${API_URL}/api/workouts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify(r),
        })
      ));
      clearDraft();
      window.scrollTo({ top: 0, behavior: 'instant' });
      setPhase('summary');
    } catch { alert('提交失败，请重试'); }
  }, [completedExercises, navigate, token]);

  // ── 复制上次训练
  const handleCopyLastSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/workouts/copy-last-session`, { method: 'POST', headers: { 'x-auth-token': token } });
      if (!res.ok) { alert('没有找到上次训练记录'); return; }
      const data = await res.json();
      if (!window.confirm(`复制 ${new Date(data.date).toLocaleDateString('zh-CN')} 的训练？共 ${data.exercises.length} 个动作`)) return;
      const first = data.exercises[0];
      setExercise(first.exercise); setExerciseType(first.type || 'strength');
      setSets(first.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false, setDuration: 0, isWarmup: false, rpe: undefined })));
      setTemplateQueue(data.exercises.slice(1));
      await loadExerciseData(first.exercise, first.type === 'cardio');
      setPhase('log');
    } catch { alert('获取失败，请重试'); }
  }, [token, loadExerciseData]);

  // ── 退出（有任何训练数据时必须确认）
  const hasAnyData = useCallback(() => {
    if (completedExercises.length > 0) return true;
    // 有任何填写过的组
    if (sets.some(s => s.done || (s.weight !== '' && s.weight !== undefined) || (s.reps !== '' && s.reps !== undefined && s.reps !== 0))) return true;
    return false;
  }, [completedExercises, sets]);

  const handleExitIntent = useCallback(() => {
    if (!hasAnyData()) { clearDraft(); navigate('/'); }
    else setShowExit(true);
  }, [hasAnyData, navigate]);

  const handleSaveAndExit = useCallback(() => {
    saveDraft({ phase, date, exercise, exerciseType, sets, notes, completedExercises, templateQueue, energyLevel });
    navigate('/');
  }, [phase, date, exercise, exerciseType, sets, notes, completedExercises, templateQueue, energyLevel, navigate]);

  const handleDiscardAndExit = useCallback(() => { clearDraft(); navigate('/'); }, [navigate]);

  // ── 搜索结果（useMemo 避免每次渲染重新计算）
  const searchResults = useMemo(() => searchExercises(searchText, customExercises), [searchText, customExercises]);
  const filteredExercises = searchText.trim() ? searchResults.map(r => r.ex) : (EXERCISE_LIBRARY[activeCategory] || []);

  const isCardio = exerciseType === 'cardio';
  const totalExercises = completedExercises.length + (phase === 'log' ? 1 : 0) + templateQueue.length;
  const currentIdx     = completedExercises.length;

  // ── 应用建议
  const applySuggestion = useCallback(() => {
    if (suggestion) {
      const w = energyLevel <= 2 ? Math.round(suggestion.suggestedWeight * 0.85 * 2) / 2 : energyLevel >= 4 ? Math.round(suggestion.suggestedWeight * 1.05 * 2) / 2 : suggestion.suggestedWeight;
      setSets(prev => prev.map(s => ({ ...s, weight: w, reps: suggestion.suggestedReps })));
    } else if (lastRecord?.sets?.length) {
      setSets(lastRecord.sets.map(s => ({ weight: s.weight, reps: s.reps, done: false, setDuration: 0, isWarmup: s.isWarmup || false, rpe: s.rpe || undefined, setType: s.setType || 'normal' })));
    }
  }, [suggestion, lastRecord, energyLevel]);

  // ════════ 渲染 ════════

  if (phase === 'init') return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--text-3)', fontSize: 14 }}>加载中…</div>;

  if (phase === 'summary') return <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto' }}><WorkoutSummary records={completedExercises} duration={elapsed} onDone={() => navigate('/')} /></div>;

  if (phase === 'done') {
    const lastEx = completedExercises[completedExercises.length - 1];
    return (
      <ExerciseDonePage
        exercise={lastEx?.exercise} sets={lastEx?.sets || []}
        completedExercises={completedExercises.slice(0, -1)}
        onNext={() => { setSets([{ weight: '', reps: '', done: false, setDuration: 0, isWarmup: false, rpe: undefined }]); setNotes(''); setExercise(''); setSuggestion(null); setLastRecord(null); setPhase('select'); }}
        onEnd={() => handleEndWorkout()}
      />
    );
  }

  // ════ 选择动作页 ════
  if (phase === 'select') {
    return (
      <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto', padding: '16px 16px calc(80px + env(safe-area-inset-bottom))' }}>
        {draft && <DraftBanner draft={draft} onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>
            {completedExercises.length > 0 ? `第 ${completedExercises.length + 1} 个动作` : '选择动作'}
          </span>
          <button onClick={handleExitIntent} style={{ background: completedExercises.length > 0 ? 'var(--c-green-dim)' : 'var(--surface-3)', color: completedExercises.length > 0 ? '#1a7a35' : 'var(--text-3)', border: 'none', borderRadius: 99, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {completedExercises.length > 0 ? '结束训练' : '取消'}
          </button>
        </div>

        {completedExercises.length === 0 && (
          <div onClick={handleCopyLastSession} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,var(--c-green-dim),var(--c-blue-dim))', border: '1px solid rgba(52,199,89,.25)', borderRadius: 'var(--r-l)', padding: '14px 18px', cursor: 'pointer', marginBottom: 16, fontWeight: 600, fontSize: 15 }}>
            <span style={{ fontSize: 20 }}>⚡</span><span>一键复制上次训练</span><span style={{ marginLeft: 'auto', color: 'var(--text-4)' }}>→</span>
          </div>
        )}

        {completedExercises.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-l)', padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>已完成</div>
            {completedExercises.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: i < completedExercises.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontWeight: 600 }}>{r.exercise}</span>
                <span style={{ color: 'var(--text-3)' }}>{r.sets.length} 组</span>
              </div>
            ))}
          </div>
        )}

        {/* 搜索框 */}
        <input type="text" placeholder="搜索动作…" value={searchText} onChange={e => setSearchText(e.target.value)} style={{ marginBottom: 12 }} />

        {/* 部位分类 Tab */}
        {!searchText && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            {Object.entries(CATEGORY_META).map(([cat, meta]) => {
              const active = activeCategory === cat;
              return (
                <div key={cat} onClick={() => setActiveCategory(cat)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 99, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s',
                  background: active ? meta.color : 'var(--surface)',
                  border: `1px solid ${active ? meta.color : 'var(--border)'}`,
                  fontWeight: 600, fontSize: 13,
                  boxShadow: active ? `0 4px 14px ${meta.color}44` : 'none',
                }}>
                  <CategoryIcon cat={cat} size={15} color={active ? '#fff' : meta.color} />
                  <span style={{ color: active ? '#fff' : 'var(--text-2)' }}>{cat}</span>
                </div>
              );
            })}
            <div onClick={() => setActiveCategory('Custom')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 99, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600, fontSize: 13, background: activeCategory === 'Custom' ? 'var(--text-1)' : 'var(--surface)', color: activeCategory === 'Custom' ? '#fff' : 'var(--c-blue)', border: `1.5px dashed ${activeCategory === 'Custom' ? 'var(--text-1)' : 'var(--c-blue)'}` }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke={activeCategory === 'Custom' ? '#fff' : 'var(--c-blue)'} strokeWidth="2.2" strokeLinecap="round"/></svg>
              <span>自定义</span>
            </div>
          </div>
        )}

        {/* 当前分类描述条 */}
        {!searchText && activeCategory !== 'Custom' && CATEGORY_META[activeCategory] && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '9px 14px', background: CATEGORY_META[activeCategory].bg, borderRadius: 'var(--r-s)', borderLeft: `3px solid ${CATEGORY_META[activeCategory].color}` }}>
            <CategoryIcon cat={activeCategory} size={16} color={CATEGORY_META[activeCategory].color} />
            <span style={{ fontSize: 12, fontWeight: 600, color: CATEGORY_META[activeCategory].color }}>{CATEGORY_META[activeCategory].desc}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', fontWeight: 500 }}>{EXERCISE_LIBRARY[activeCategory]?.length} 个动作</span>
          </div>
        )}

        {/* 动作列表 */}
        {activeCategory !== 'Custom' || searchText ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredExercises.length === 0 && <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>没有找到"{searchText}"</div>}
            {filteredExercises.map(ex => {
              const cat = Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(ex));
              const meta = CATEGORY_META[cat];
              return (
                <div key={ex} onClick={() => handleExerciseSelect(ex, searchText ? null : activeCategory)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-m)', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background .1s', WebkitTapHighlightColor: 'transparent' }}
                  onTouchStart={e => e.currentTarget.style.background = 'var(--surface-3)'}
                  onTouchEnd={e => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: meta?.bg || 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CategoryIcon cat={cat} size={18} color={meta?.color || 'var(--text-3)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>{ex}</div>
                    {searchText && cat && <div style={{ fontSize: 11, color: meta?.color, fontWeight: 600, marginTop: 2 }}>{cat}</div>}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="var(--text-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {customExercises.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>已保存的自定义动作</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {customExercises.map(ce => (
                    <div key={ce._id} onClick={() => handleExerciseSelect(ce.name, 'Custom')}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-m)', padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'background .1s', WebkitTapHighlightColor: 'transparent' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,113,227,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="var(--c-blue)" strokeWidth="2" strokeLinecap="round"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{ce.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-blue)', fontWeight: 600 }}>{ce.type === 'cardio' ? '有氧' : '力量'}</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="var(--text-4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>新建自定义动作</div>
            <label>动作名称</label>
            <input type="text" placeholder="例如：保加利亚分腿蹲" value={customExercise} onChange={e => setCustomExercise(e.target.value)} onKeyDown={e => e.key === 'Enter' && customExercise.trim() && handleExerciseSelect(customExercise.trim(), 'Custom')} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1 }} disabled={!customExercise.trim()} onClick={() => handleExerciseSelect(customExercise.trim(), 'Custom')}>力量训练</button>
              <button className="secondary" style={{ flex: 1 }} disabled={!customExercise.trim()} onClick={() => { setExerciseType('cardio'); handleExerciseSelect(customExercise.trim(), 'Custom'); }}>有氧训练</button>
            </div>
          </div>
        )}
        {showExit && <ExitSheet onSave={handleSaveAndExit} onDiscard={handleDiscardAndExit} onCancel={() => setShowExit(false)} />}
      </div>
    );
  }

  // ════ 记录组数页（Gym Mode）════
  return (
    <div style={{ maxWidth: 'var(--content-w)', margin: '0 auto', padding: '0 16px calc(120px + env(safe-area-inset-bottom))' }}>
      {showFlash && <SetCompleteFlash onDone={onFlashDone} />}

      {/* 顶部工具栏 */}
      <div className="gym-header">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text-3)', flexShrink: 0 }}>{fmt(elapsed)}</div>
        {totalExercises > 1 && (
          <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center', padding: '0 8px', overflow: 'hidden' }}>
            {Array.from({ length: totalExercises }).map((_, i) => (
              <div key={i} style={{ height: 4, borderRadius: 99, flexShrink: 0, transition: 'all .3s', width: i === currentIdx ? 18 : 6, background: i < currentIdx ? 'var(--c-green)' : i === currentIdx ? 'var(--c-blue)' : 'var(--border)' }} />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {/* 重选：蓝色轮廓，清晰可见 */}
          <button onClick={handleBackToSelect} style={{ background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: '1px solid rgba(0,113,227,.2)', borderRadius: 99, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            ‹ 重选
          </button>
          {/* 退出：灰色低调，需要长按才触发，防止误触 */}
          <button
            onClick={handleExitIntent}
            style={{ background: 'var(--surface-3)', color: 'var(--text-4)', border: 'none', borderRadius: 99, padding: '6px 10px', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
          >✕</button>
        </div>
      </div>

      {/* 能量状态 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-m)', padding: '7px 12px', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap', flexShrink: 0 }}>状态</span>
        <div style={{ display: 'flex', gap: 3, flex: 1, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map(lv => (
            <button key={lv} type="button" onClick={() => setEnergyLevel(lv)} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, lineHeight: 1, transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center', background: energyLevel >= lv ? 'var(--c-blue)' : 'var(--surface-3)', color: energyLevel >= lv ? '#fff' : 'var(--text-4)', transform: energyLevel === lv ? 'scale(1.12)' : 'scale(1)', flexShrink: 0, padding: 0 }}>{lv}</button>
          ))}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-blue)', whiteSpace: 'nowrap', flexShrink: 0 }}>{energyLevel <= 2 ? '偏疲' : energyLevel === 3 ? '一般' : '状态好'}</span>
      </div>

      {/* 动作标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {(() => {
          const cat = Object.keys(EXERCISE_LIBRARY).find(c => EXERCISE_LIBRARY[c].includes(exercise));
          const meta = CATEGORY_META[cat];
          return meta ? (
            <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.bg, border: `1.5px solid ${meta.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CategoryIcon cat={cat} size={22} color={meta.color} />
            </div>
          ) : null;
        })()}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{exercise}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: isCardio ? 'var(--c-orange-dim)' : 'var(--c-blue-dim)', color: isCardio ? '#b86800' : 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{isCardio ? '有氧' : '力量'}</span>
            {isLoading && <span style={{ fontSize: 11, color: 'var(--text-4)' }}>加载中…</span>}
          </div>
        </div>
      </div>

      {isCardio && <CardioTimer onFinish={(mins) => { if (mins > 0) setSets([{ weight: mins, reps: 0, done: false, setDuration: 0, isWarmup: false, rpe: undefined, setType: 'normal' }]); }} />}

      {/* 上次记录 */}
      {lastRecord && !isCardio && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--c-blue-dim)', border: '1px solid rgba(0,113,227,.15)', borderRadius: 'var(--r-m)', padding: '9px 14px', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--c-blue)', textTransform: 'uppercase', letterSpacing: '.08em', flexShrink: 0 }}>上次</span>
          {lastRecord.sets.map((s, i) => (
            <span key={i} style={{ fontSize: 13, color: 'var(--text-2)', background: 'white', padding: '2px 9px', borderRadius: 99, fontWeight: 600 }}>{s.weight === 0 ? '自重' : `${s.weight}kg`} × {s.reps}</span>
          ))}
        </div>
      )}

      {/* 智能建议 */}
      {(suggestion || lastRecord) && !isCardio && (
        <div onClick={applySuggestion} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,rgba(94,92,230,.07),rgba(0,113,227,.05))', border: '1px solid rgba(94,92,230,.18)', borderRadius: 'var(--r-l)', padding: '12px 14px', marginBottom: 14, cursor: 'pointer' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>📊</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--c-purple)', marginBottom: 2 }}>{suggestion?.isBreakthrough ? '突破机会' : '参考记录'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>{suggestion?.reason || '应用上次记录'}</div>
            {suggestion && <div style={{ fontSize: 14, fontWeight: 700 }}>目标 {suggestion.suggestedWeight === 0 ? '自重' : `${suggestion.suggestedWeight}kg`} × {suggestion.suggestedReps}次</div>}
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-purple)', background: 'rgba(94,92,230,.1)', padding: '5px 10px', borderRadius: 8, flexShrink: 0 }}>应用</span>
        </div>
      )}

      {/* 替代动作推荐 */}
      {alternatives.length > 0 && !isCardio && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>同肌群替代动作</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
            {alternatives.map(alt => (
              <button key={alt.exercise} onClick={() => handleExerciseSelect(alt.exercise)}
                style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {alt.exercise}
                <span style={{ fontSize: 10, color: 'var(--text-4)', marginLeft: 4 }}>{alt.muscles[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 日期 */}
      <div style={{ marginBottom: 14 }}>
        <label>日期</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 14, padding: '9px 12px', marginTop: 4, marginBottom: 0 }} />
      </div>

      {/* 组列表 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {sets.map((set, i) => (
          <SetRow key={i} set={set} index={i} isCardio={isCardio}
            isBodyweight={!isCardio && (set.weight === 0 || set.weight === '0')}
            onChange={handleSetChange} onRemove={removeSet}
            onComplete={handleSetComplete}
            onToggleBodyweight={handleToggleBodyweight}
            isDone={set.done}
          />
        ))}
      </div>

      <button type="button" onClick={addSet} style={{ width: '100%', background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', borderRadius: 'var(--r-l)', padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 14 }}>+ 添加一组</button>

      {/* 休息快捷 */}
      {!isCardio && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>休息计时 · 推荐 {getRestTime()}s</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => { setRestSecs(getRestTime()); setRestKey(k => k + 1); setRestActive(true); }} style={{ flex: 1.5, background: 'var(--c-blue-dim)', color: 'var(--c-blue)', border: 'none', borderRadius: 99, padding: '10px 8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>⚡ 推荐</button>
            {[60, 90, 120, 180].map(s => (
              <button key={s} type="button" onClick={() => { setRestSecs(s); setRestKey(k => k + 1); setRestActive(true); }} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: '10px 6px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-2)' }}>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</button>
            ))}
          </div>
        </div>
      )}

      {/* 备注 */}
      <label>备注（选填）</label>
      <textarea placeholder="今天的状态、心得…" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ marginTop: 4, marginBottom: 16, fontSize: 15 }} />

      {/* 完成按钮 */}
      <button onClick={handleFinishExercise} style={{ width: '100%', fontSize: 17, padding: 15, borderRadius: 'var(--r-xl)', fontWeight: 700, background: templateQueue.length > 0 ? 'var(--c-blue)' : 'var(--c-green)', letterSpacing: '-.01em', color: '#fff', border: 'none', cursor: 'pointer' }}>
        {templateQueue.length > 0 ? `下一个：${templateQueue[0].exercise} →` : '完成这个动作 ✓'}
      </button>

      {/* 休息计时浮窗（用 key 控制重新挂载，避免 stale state） */}
      {restActive && restSecs > 0 && (
        <RestTimer key={restKey} initialSecs={restSecs} onSkip={() => setRestActive(false)} onAdd={() => {}} onExpire={() => setRestActive(false)} />
      )}

      {showExit && <ExitSheet onSave={handleSaveAndExit} onDiscard={handleDiscardAndExit} onCancel={() => setShowExit(false)} />}

      <style>{`
        @keyframes pulse-text{0%,100%{opacity:1}50%{opacity:.55}}
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
      `}</style>
    </div>
  );
};

export default AddWorkout;
