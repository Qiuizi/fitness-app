import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── 肌群 → SVG 形状映射 ────────────────────────────────────────────
// 每个肌群对应一个 SVG path/ellipse, 点击区域使用相同 shape 作为可交互层
// 坐标基于 viewBox "0 0 280 460"
const FRONT_MUSCLES = {
  '肩前束': [
    { type: 'ellipse', cx: 96, cy: 92, rx: 20, ry: 15 },
    { type: 'ellipse', cx: 184, cy: 92, rx: 20, ry: 15 },
  ],
  '肩中束': [
    { type: 'ellipse', cx: 73, cy: 100, rx: 10, ry: 18 },
    { type: 'ellipse', cx: 207, cy: 100, rx: 10, ry: 18 },
  ],
  '胸': [
    { type: 'path', d: 'M 100 110 Q 90 138 105 152 L 138 152 L 138 115 Q 120 108 100 110 Z' },
    { type: 'path', d: 'M 180 110 Q 190 138 175 152 L 142 152 L 142 115 Q 160 108 180 110 Z' },
  ],
  '二头': [
    { type: 'ellipse', cx: 60, cy: 148, rx: 13, ry: 28 },
    { type: 'ellipse', cx: 220, cy: 148, rx: 13, ry: 28 },
  ],
  '前臂': [
    { type: 'ellipse', cx: 46, cy: 210, rx: 12, ry: 34 },
    { type: 'ellipse', cx: 234, cy: 210, rx: 12, ry: 34 },
  ],
  '腹直肌': [
    { type: 'path', d: 'M 120 160 L 160 160 L 160 240 Q 160 250 140 250 Q 120 250 120 240 Z' },
  ],
  '腹斜肌': [
    { type: 'path', d: 'M 105 175 Q 98 200 108 235 L 120 235 L 120 170 Z' },
    { type: 'path', d: 'M 175 175 Q 182 200 172 235 L 160 235 L 160 170 Z' },
  ],
  '核心': [
    { type: 'path', d: 'M 120 245 L 160 245 L 160 258 Q 160 266 140 266 Q 120 266 120 258 Z' },
  ],
  '股四': [
    { type: 'path', d: 'M 100 270 Q 92 310 100 360 L 130 360 L 130 275 Q 115 265 100 270 Z' },
    { type: 'path', d: 'M 180 270 Q 188 310 180 360 L 150 360 L 150 275 Q 165 265 180 270 Z' },
  ],
  '腿内侧': [
    { type: 'path', d: 'M 131 280 L 149 280 L 149 345 Q 140 348 131 345 Z' },
  ],
  '小腿': [
    { type: 'ellipse', cx: 108, cy: 400, rx: 15, ry: 30 },
    { type: 'ellipse', cx: 172, cy: 400, rx: 15, ry: 30 },
  ],
};

const BACK_MUSCLES = {
  '斜方肌': [
    { type: 'path', d: 'M 110 80 Q 140 70 170 80 L 170 120 Q 140 115 110 120 Z' },
  ],
  '后束': [
    { type: 'ellipse', cx: 90, cy: 98, rx: 16, ry: 14 },
    { type: 'ellipse', cx: 190, cy: 98, rx: 16, ry: 14 },
  ],
  '背': [
    { type: 'path', d: 'M 105 125 Q 90 160 100 210 L 180 210 Q 190 160 175 125 Q 140 120 105 125 Z' },
  ],
  '三头': [
    { type: 'ellipse', cx: 60, cy: 148, rx: 13, ry: 30 },
    { type: 'ellipse', cx: 220, cy: 148, rx: 13, ry: 30 },
  ],
  '臀中肌': [
    { type: 'ellipse', cx: 105, cy: 232, rx: 13, ry: 12 },
    { type: 'ellipse', cx: 175, cy: 232, rx: 13, ry: 12 },
  ],
  '臀': [
    { type: 'path', d: 'M 112 228 Q 100 260 112 278 L 138 278 L 138 226 Z' },
    { type: 'path', d: 'M 168 228 Q 180 260 168 278 L 142 278 L 142 226 Z' },
  ],
  '腿后侧': [
    { type: 'path', d: 'M 102 290 Q 94 330 102 360 L 130 360 L 130 290 Z' },
    { type: 'path', d: 'M 178 290 Q 186 330 178 360 L 150 360 L 150 290 Z' },
  ],
  // '小腿' 在背面也显示（复用 front 的坐标即可），但需要不同 key 以免冲突
};

// Body silhouette path (front + back共用简化轮廓)
const BODY_OUTLINE_FRONT = `
  M 140 12
  C 120 12, 110 28, 110 44
  C 110 56, 118 66, 128 70
  L 128 80
  L 96 82
  C 74 84, 58 95, 54 118
  L 46 175
  C 40 195, 38 215, 40 240
  L 52 258
  L 58 258
  L 54 240
  C 54 220, 60 200, 66 180
  L 78 148
  C 82 135, 86 125, 96 120
  L 110 115
  L 110 250
  L 96 365
  L 88 425
  C 86 440, 92 448, 106 448
  L 118 448
  C 130 448, 132 440, 132 428
  L 138 365
  L 140 260
  L 142 365
  L 148 428
  C 148 440, 150 448, 162 448
  L 174 448
  C 188 448, 194 440, 192 425
  L 184 365
  L 170 250
  L 170 115
  L 184 120
  C 194 125, 198 135, 202 148
  L 214 180
  C 220 200, 226 220, 226 240
  L 222 258
  L 228 258
  L 240 240
  C 242 215, 240 195, 234 175
  L 226 118
  C 222 95, 206 84, 184 82
  L 152 80
  L 152 70
  C 162 66, 170 56, 170 44
  C 170 28, 160 12, 140 12
  Z
`.replace(/\s+/g, ' ').trim();

// Morandi 强度色: 从浅灰到深蓝绿色
const intensityColor = (intensity) => {
  if (intensity <= 0) return 'var(--surface-3)';
  const t = Math.max(0, Math.min(1, intensity));
  // 从 #d7dfdc (淡) → #6a8b85 (深) 过渡
  const r = Math.round(215 - 109 * t);
  const g = Math.round(223 - 84 * t);
  const b = Math.round(220 - 87 * t);
  return `rgb(${r},${g},${b})`;
};

// 肌群对应的推荐代表动作 (第一选择, 用于长按跳转 AddWorkout)
const MUSCLE_REP_EXERCISE = {
  '胸': '杠铃卧推', '肩前束': '杠铃推举', '肩中束': '哑铃侧平举', '后束': '面拉',
  '背': '引体向上', '斜方肌': '杠铃耸肩',
  '二头': '杠铃弯举', '三头': '三头绳索下压', '前臂': '腕弯举',
  '股四': '深蹲', '腿后侧': '罗马尼亚硬拉', '腿内侧': '腿内收机',
  '臀': '臀桥', '臀中肌': '蚌式训练', '小腿': '提踵（站姿）',
  '腹直肌': '卷腹', '腹斜肌': '侧平板', '核心': '平板支撑',
};

const daysAgo = (d) => {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return `${diff}天前`;
  if (diff < 30) return `${Math.floor(diff/7)}周前`;
  return `${Math.floor(diff/30)}月前`;
};

const BodyCanvas = ({ bodyMap, period, onPeriodChange }) => {
  const navigate = useNavigate();
  const [view, setView] = useState('front');
  const [selected, setSelected] = useState(null);
  const [previewMuscle, setPreviewMuscle] = useState(null); // 移动端 tap 预览
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const muscleData = bodyMap?.muscles || {};
  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;

  // 背面也显示小腿
  const effectiveMuscles = useMemo(() => {
    if (view === 'back') return { ...muscles, '小腿': FRONT_MUSCLES['小腿'] };
    return muscles;
  }, [view, muscles]);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const onPressStart = (muscle, e) => {
    if (e) e.preventDefault(); // 阻止滚动
    setPreviewMuscle(muscle);
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      const ex = MUSCLE_REP_EXERCISE[muscle];
      if (ex && navigator.vibrate) navigator.vibrate(20);
      if (ex) navigate('/add', { state: { preselectExercise: ex } });
    }, 600);
  };

  const onPressEnd = (muscle) => {
    clearLongPress();
    if (!longPressFiredRef.current) {
      setSelected(muscle);
    }
    setPreviewMuscle(null);
  };

  const onPressCancel = () => {
    clearLongPress();
    setPreviewMuscle(null);
  };

  const renderShape = (muscle, shape, idx) => {
    const isPreview = previewMuscle === muscle;
    const isSelected = selected === muscle;
    const data = muscleData[muscle];
    const intensity = data?.intensity || 0;
    const fill = intensityColor(intensity);
    const stroke = isSelected ? 'var(--c-blue)' : isPreview ? 'var(--text-2)' : 'rgba(0,0,0,0.08)';
    const strokeWidth = isSelected ? 2.5 : isPreview ? 2 : 0.8;
    const commonProps = {
      fill,
      stroke,
      strokeWidth,
      style: { cursor: 'pointer', transition: 'stroke-width .15s, stroke .15s', WebkitTapHighlightColor:'transparent' },
      onMouseEnter: () => setPreviewMuscle(muscle),
      onMouseLeave: onPressCancel,
      onMouseDown: () => onPressStart(muscle),
      onMouseUp: () => onPressEnd(muscle),
      onTouchStart: (e) => onPressStart(muscle, e),
      onTouchEnd: (e) => { e.preventDefault(); onPressEnd(muscle); },
      onTouchCancel: onPressCancel,
    };
    if (shape.type === 'ellipse') {
      return <ellipse key={`${muscle}-${idx}`} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...commonProps} />;
    }
    return <path key={`${muscle}-${idx}`} d={shape.d} {...commonProps} />;
  };

  const selectedData = selected ? muscleData[selected] : null;

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'16px', marginBottom:16, position:'relative' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:15, fontWeight:700 }}>身体</span>
          <span style={{ fontSize:10, fontWeight:700, background:'var(--c-blue-dim)', color:'var(--c-blue)', padding:'2px 8px', borderRadius:99 }}>交互</span>
        </div>
        {/* Period toggle — 移动端更大 tap 区 */}
        <div style={{ display:'flex', background:'var(--surface-3)', borderRadius:99, padding:3 }}>
          {[{k:'week',l:'7天'},{k:'month',l:'4周'},{k:'year',l:'全年'}].map(p => (
            <div key={p.k} onClick={() => onPeriodChange(p.k)}
              style={{ padding:'8px 14px', fontSize:12, fontWeight:700, borderRadius:99, cursor:'pointer',
                background: period === p.k ? 'var(--surface)' : 'transparent',
                color: period === p.k ? 'var(--c-blue)' : 'var(--text-3)',
                boxShadow: period === p.k ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition:'all .15s',
                WebkitTapHighlightColor:'transparent' }}>{p.l}</div>
          ))}
        </div>
      </div>

      {/* Front/Back toggle */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:12 }}>
        {[{k:'front',l:'正面'},{k:'back',l:'背面'}].map(v => (
          <div key={v.k} onClick={() => { setView(v.k); setSelected(null); }}
            style={{ padding:'10px 22px', fontSize:13, fontWeight:700, borderRadius:99, cursor:'pointer',
              background: view === v.k ? 'var(--c-blue)' : 'var(--surface-3)',
              color: view === v.k ? 'var(--surface)' : 'var(--text-3)',
              transition:'all .15s',
              WebkitTapHighlightColor:'transparent' }}>{v.l}</div>
        ))}
      </div>

      {/* SVG body — 手机端相对宽度自适应 */}
      <div style={{ display:'flex', justifyContent:'center', touchAction:'manipulation' }}>
        <svg viewBox="0 0 280 460" style={{ width:'min(85vw, 320px)', maxWidth:'100%', userSelect:'none' }}>
          {/* 轮廓 */}
          <path d={BODY_OUTLINE_FRONT} fill="var(--surface-3)" stroke="var(--border)" strokeWidth="1" opacity={0.7} />
          {/* 肌群 */}
          {Object.entries(effectiveMuscles).map(([muscle, shapes]) =>
            shapes.map((s, i) => renderShape(muscle, s, i))
          )}
          {/* 当前按压的肌群: 显示组数气泡 */}
          {previewMuscle && muscleData[previewMuscle] && (() => {
            const shapes = effectiveMuscles[previewMuscle];
            if (!shapes?.length) return null;
            const s = shapes[0];
            const cx = s.cx ?? 140;
            const cy = s.cy ?? 230;
            return (
              <g pointerEvents="none">
                <rect x={cx - 28} y={cy - 16} width={56} height={22} rx={11} fill="var(--text-1)" opacity={0.92} />
                <text x={cx} y={cy - 1} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--surface)">
                  {muscleData[previewMuscle].sets}组
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* 当前按压肌群名称 — 移动端视觉反馈 */}
      <div style={{ textAlign:'center', fontSize:13, fontWeight:700, color: previewMuscle ? 'var(--c-blue)' : 'var(--text-4)', height:18, marginTop:4, transition:'color .15s' }}>
        {previewMuscle || '点击肌群查看详情 · 长按直接训练'}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, fontSize:10, color:'var(--text-4)', marginTop:8 }}>
        <span>训练强度</span>
        <div style={{ display:'flex', gap:2 }}>
          {[0, 0.25, 0.5, 0.75, 1].map(i => (
            <div key={i} style={{ width:14, height:10, borderRadius:2, background: intensityColor(i), border:'1px solid rgba(0,0,0,0.05)' }} />
          ))}
        </div>
        <span>低 → 高</span>
      </div>

      {!Object.keys(muscleData).length && (
        <div style={{ textAlign:'center', fontSize:12, color:'var(--text-4)', marginTop:10 }}>
          本时段暂无训练数据，切换时段查看
        </div>
      )}

      {/* Bottom sheet — 手机端全宽 + 安全区 */}
      {selected && (
        <div onClick={() => setSelected(null)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', animation:'fadeIn .2s', touchAction:'none' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'var(--surface)', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:500, padding:'20px 20px calc(20px + env(safe-area-inset-bottom))', boxShadow:'0 -8px 32px rgba(0,0,0,0.15)', animation:'slideUp .25s ease-out', maxHeight:'80dvh', overflowY:'auto' }}>
            {/* Handle */}
            <div style={{ width:40, height:4, background:'var(--surface-3)', borderRadius:99, margin:'0 auto 16px' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:800, marginBottom:2 }}>{selected}</div>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>
                  {selectedData?.lastDate ? `上次训练 · ${daysAgo(selectedData.lastDate)}` : '暂无训练记录'}
                </div>
              </div>
              <div style={{ width:44, height:44, borderRadius:'50%', background: intensityColor(selectedData?.intensity || 0), border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'var(--text-1)' }}>
                {Math.round((selectedData?.intensity || 0) * 100)}
              </div>
            </div>
            {selectedData && selectedData.sets > 0 ? (
              <>
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                  <div style={{ flex:1, padding:'12px', background:'var(--surface-3)', borderRadius:'var(--r-m)', textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>总组数</div>
                    <div style={{ fontSize:20, fontWeight:800 }}>{selectedData.sets}</div>
                  </div>
                  <div style={{ flex:1, padding:'12px', background:'var(--surface-3)', borderRadius:'var(--r-m)', textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>总容量</div>
                    <div style={{ fontSize:20, fontWeight:800 }}>{selectedData.volume > 1000 ? (selectedData.volume/1000).toFixed(1) + 't' : selectedData.volume + 'kg'}</div>
                  </div>
                </div>
                {selectedData.topExercises?.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-2)', marginBottom:8 }}>主要动作</div>
                    {selectedData.topExercises.map((e, i) => (
                      <div key={i} onClick={() => navigate('/add', { state: { preselectExercise: e.exercise } })}
                        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:'var(--r-m)', background:'var(--surface-3)', marginBottom:6, cursor:'pointer' }}>
                        <span style={{ fontSize:13, fontWeight:600 }}>{e.exercise}</span>
                        <span style={{ fontSize:11, color:'var(--text-3)' }}>{e.volume > 1000 ? (e.volume/1000).toFixed(1) + 't' : e.volume + 'kg'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'24px 0', fontSize:13, color:'var(--text-3)' }}>
                本时段没有训练该肌群
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setSelected(null)} style={{ flex:1, padding:'14px', fontSize:14, background:'var(--surface-3)', color:'var(--text-2)', border:'none', borderRadius:'var(--r-m)', fontWeight:600, cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>关闭</button>
              <button onClick={() => {
                const ex = MUSCLE_REP_EXERCISE[selected];
                if (ex) navigate('/add', { state: { preselectExercise: ex } });
              }} style={{ flex:1, padding:'14px', fontSize:14, background:'var(--c-blue)', color:'var(--surface)', border:'none', borderRadius:'var(--r-m)', fontWeight:700, cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>去训练</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default BodyCanvas;
