import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';

// ─── 趣味换算 ─────────────────────────────────────────────
const volumeEquivalent = (vol) => {
  if (vol < 1000) return `${vol} kg`;
  const tons = vol / 1000;
  if (tons < 5) return `${tons.toFixed(1)} 吨 · 约 ${Math.round(tons * 1000 / 6)} 袋大米`;
  if (tons < 20) return `${tons.toFixed(1)} 吨 · 约 ${Math.round(tons / 1.5)} 头成年亚洲象`;
  if (tons < 100) return `${tons.toFixed(1)} 吨 · 约 ${Math.round(tons / 1.5)} 头非洲象`;
  return `${tons.toFixed(1)} 吨 · 约 ${Math.round(tons / 40)} 辆汽车的重量`;
};

const durationEquivalent = (sec) => {
  const hours = sec / 3600;
  if (hours < 10) return `${hours.toFixed(1)} 小时`;
  if (hours < 40) return `${Math.round(hours)} 小时 · 约 ${Math.round(hours / 2)} 部电影`;
  if (hours < 200) return `${Math.round(hours)} 小时 · 约 ${Math.round(hours / 40)} 个工作周`;
  return `${Math.round(hours)} 小时`;
};

const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

// ─── 卡片组件 ──────────────────────────────────────────────
const Card = ({ bg, children, dark = false }) => (
  <div style={{
    width:'100%', height:'100%', background: bg, color: dark ? '#fff' : 'var(--text-1)',
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    padding:'40px 28px', boxSizing:'border-box', position:'relative', overflow:'hidden',
  }}>
    {children}
  </div>
);

const BigNum = ({ n, unit, color }) => (
  <div style={{ textAlign:'center', margin:'24px 0' }}>
    <div style={{ fontSize:72, fontWeight:900, lineHeight:1, letterSpacing:'-0.04em', color: color || 'inherit' }}>{n}</div>
    {unit && <div style={{ fontSize:14, opacity:0.75, marginTop:8, fontWeight:600 }}>{unit}</div>}
  </div>
);

// ─── 主组件 ──────────────────────────────────────────────
const YearlyWrap = ({ token, year, onClose }) => {
  const y = year || new Date().getFullYear();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardIdx, setCardIdx] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetch(`${API_URL}/api/workouts/yearly-wrap?year=${y}`, { headers: { 'x-auth-token': token } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, y]);

  // 构造卡片
  const cards = React.useMemo(() => {
    if (!data || !data.hasData) return [];
    const c = [];

    // 1. 封面
    c.push({
      key: 'cover', bg: 'linear-gradient(135deg, #8a9d96 0%, #6a8b85 100%)', dark: true,
      render: () => (
        <>
          <div style={{ fontSize:13, fontWeight:700, opacity:0.75, letterSpacing:'0.2em', marginBottom:16 }}>IRON WRAPPED</div>
          <div style={{ fontSize:88, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1 }}>{data.year}</div>
          <div style={{ fontSize:15, fontWeight:600, opacity:0.9, marginTop:24, textAlign:'center', lineHeight:1.6 }}>
            你的年度<br/>健身故事
          </div>
          <div style={{ position:'absolute', bottom:40, fontSize:11, opacity:0.7 }}>向右滑动开始 →</div>
        </>
      ),
    });

    // 2. 总训练
    c.push({
      key: 'totals', bg: 'linear-gradient(135deg, #c9bdb3 0%, #a89585 100%)', dark: true,
      render: () => (
        <>
          <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em', textTransform:'uppercase' }}>今年</div>
          <BigNum n={data.totalWorkouts} unit="次训练" />
          <div style={{ display:'flex', gap:24, marginTop:8 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:800 }}>{data.trainingDays}</div>
              <div style={{ fontSize:11, opacity:0.8, marginTop:4 }}>训练日</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:800 }}>{data.longestStreak}</div>
              <div style={{ fontSize:11, opacity:0.8, marginTop:4 }}>最长连胜</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:800 }}>{data.totalSets}</div>
              <div style={{ fontSize:11, opacity:0.8, marginTop:4 }}>总组数</div>
            </div>
          </div>
        </>
      ),
    });

    // 3. 总吨位
    c.push({
      key: 'volume', bg: 'linear-gradient(135deg, #b8b5c8 0%, #7e7a98 100%)', dark: true,
      render: () => (
        <>
          <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em' }}>你总共推举了</div>
          <BigNum n={(data.totalVolume / 1000).toFixed(1)} unit="吨" />
          <div style={{ fontSize:14, fontWeight:600, opacity:0.85, textAlign:'center', marginTop:8, lineHeight:1.6 }}>
            {volumeEquivalent(data.totalVolume)}
          </div>
        </>
      ),
    });

    // 4. 最大 PR
    if (data.biggestPR) {
      c.push({
        key: 'pr', bg: 'linear-gradient(135deg, #d4a373 0%, #b8845a 100%)', dark: true,
        render: () => (
          <>
            <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em' }}>今年的最高光时刻</div>
            <div style={{ marginTop:24, textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, marginBottom:12 }}>{data.biggestPR.exercise}</div>
              <div style={{ fontSize:64, fontWeight:900, letterSpacing:'-0.04em', lineHeight:1 }}>
                {data.biggestPR.weight}<span style={{ fontSize:24, opacity:0.8 }}>kg</span>
              </div>
              <div style={{ fontSize:16, fontWeight:600, opacity:0.85, marginTop:8 }}>× {data.biggestPR.reps} 次</div>
              <div style={{ fontSize:12, opacity:0.75, marginTop:20 }}>
                {new Date(data.biggestPR.date).toLocaleDateString('zh-CN', { month:'long', day:'numeric' })} · e1RM {data.biggestPR.e1rm}kg
              </div>
            </div>
          </>
        ),
      });
    }

    // 5. Top 动作
    if (data.topExercises.length > 0) {
      c.push({
        key: 'topEx', bg: 'linear-gradient(135deg, #a8b5a0 0%, #7a8c70 100%)', dark: true,
        render: () => (
          <>
            <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em', marginBottom:32 }}>最熟悉的动作</div>
            <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:12 }}>
              {data.topExercises.map((e, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 18px', background:'rgba(255,255,255,0.15)', borderRadius:16, backdropFilter:'blur(10px)' }}>
                  <div style={{ fontSize:36, fontWeight:900, opacity: 1 - i * 0.25 }}>{i + 1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:800 }}>{e.exercise}</div>
                    <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>{e.count} 次训练</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ),
      });
    }

    // 6. 肌群玫瑰图
    if (data.muscleDistribution.length > 0) {
      const maxSets = Math.max(...data.muscleDistribution.map(m => m.sets));
      c.push({
        key: 'muscles', bg: 'linear-gradient(135deg, #c4a8a0 0%, #9e8478 100%)', dark: true,
        render: () => {
          const cx = 140, cy = 160, maxR = 120;
          const angleStep = (Math.PI * 2) / data.muscleDistribution.length;
          return (
            <>
              <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em', marginBottom:12 }}>肌群分布</div>
              <svg viewBox="0 0 280 320" width="100%" style={{ maxWidth:280, maxHeight:320 }}>
                {/* 同心圆参考线 */}
                {[0.25, 0.5, 0.75, 1].map(r => (
                  <circle key={r} cx={cx} cy={cy} r={maxR * r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                ))}
                {/* 花瓣 */}
                {data.muscleDistribution.map((m, i) => {
                  const angle = angleStep * i - Math.PI / 2;
                  const r = (m.sets / maxSets) * maxR;
                  const x = cx + Math.cos(angle) * r;
                  const y = cy + Math.sin(angle) * r;
                  const lx = cx + Math.cos(angle) * (maxR + 18);
                  const ly = cy + Math.sin(angle) * (maxR + 18);
                  return (
                    <g key={m.muscle}>
                      <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
                      <circle cx={x} cy={y} r="5" fill="white" />
                      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="white">{m.muscle}</text>
                    </g>
                  );
                })}
                {/* 中心填充 */}
                <polygon
                  points={data.muscleDistribution.map((m, i) => {
                    const angle = angleStep * i - Math.PI / 2;
                    const r = (m.sets / maxSets) * maxR;
                    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
                  }).join(' ')}
                  fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="1.5"
                />
              </svg>
            </>
          );
        },
      });
    }

    // 7. 月度分布
    {
      const maxMonth = Math.max(...data.monthly);
      c.push({
        key: 'monthly', bg: 'linear-gradient(135deg, #9ea8b5 0%, #6e7a88 100%)', dark: true,
        render: () => (
          <>
            <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em' }}>月度节奏</div>
            <div style={{ fontSize:16, fontWeight:700, marginTop:8, marginBottom:24, opacity:0.85 }}>
              {monthNames[data.bestMonth]} 是你最拼的一个月
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:200, width:'100%', padding:'0 8px', boxSizing:'border-box' }}>
              {data.monthly.map((count, i) => {
                const h = maxMonth > 0 ? (count / maxMonth) * 100 : 0;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ fontSize:10, fontWeight:600, opacity: count > 0 ? 0.9 : 0.3 }}>{count || ''}</div>
                    <div style={{ width:'100%', height:`${h}%`, minHeight: count > 0 ? 4 : 0, background: i === data.bestMonth ? '#fff' : 'rgba(255,255,255,0.5)', borderRadius:'4px 4px 2px 2px', transition:'height .6s' }} />
                    <div style={{ fontSize:9, opacity:0.7, fontWeight:600 }}>{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </>
        ),
      });
    }

    // 8. 时长
    if (data.totalDuration > 0) {
      c.push({
        key: 'duration', bg: 'linear-gradient(135deg, #b8a88a 0%, #8c7a5c 100%)', dark: true,
        render: () => (
          <>
            <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em' }}>泡在训练里的时间</div>
            <BigNum n={Math.round(data.totalDuration / 3600)} unit="小时" />
            <div style={{ fontSize:13, fontWeight:600, opacity:0.85, textAlign:'center', marginTop:8, lineHeight:1.6 }}>
              {durationEquivalent(data.totalDuration)}
            </div>
          </>
        ),
      });
    }

    // 9. 成长
    if (data.growth) {
      c.push({
        key: 'growth', bg: 'linear-gradient(135deg, #a5c0b8 0%, #6e958a 100%)', dark: true,
        render: () => (
          <>
            <div style={{ fontSize:12, fontWeight:700, opacity:0.8, letterSpacing:'0.15em' }}>你变强了</div>
            <div style={{ marginTop:24, textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:16, opacity:0.9 }}>{data.growth.exercise}</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:28, fontWeight:800, opacity:0.7 }}>{data.growth.startE1RM}</div>
                  <div style={{ fontSize:10, opacity:0.7, marginTop:4 }}>年初</div>
                </div>
                <div style={{ fontSize:32, fontWeight:900, opacity:0.4 }}>→</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:44, fontWeight:900 }}>{data.growth.endE1RM}</div>
                  <div style={{ fontSize:10, opacity:0.9, marginTop:4, fontWeight:700 }}>年末</div>
                </div>
              </div>
              <div style={{ fontSize:36, fontWeight:900, marginTop:32, color: data.growth.delta >= 0 ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                {data.growth.delta >= 0 ? '+' : ''}{data.growth.delta} kg
              </div>
              <div style={{ fontSize:12, opacity:0.8, marginTop:4, fontWeight:600 }}>
                {data.growth.delta >= 0 ? '力量增长' : '保持力量'} {data.growth.pct >= 0 ? '+' : ''}{data.growth.pct}%
              </div>
            </div>
          </>
        ),
      });
    }

    // 10. 身份标签
    c.push({
      key: 'identity', bg: 'linear-gradient(135deg, #3a4a52 0%, #1a252c 100%)', dark: true,
      render: () => (
        <>
          <div style={{ fontSize:12, fontWeight:700, opacity:0.7, letterSpacing:'0.15em' }}>你在 {data.year} 年是</div>
          <div style={{ fontSize:100, marginTop:32 }}>{data.identity.icon}</div>
          <div style={{ fontSize:32, fontWeight:900, marginTop:16, letterSpacing:'-0.02em' }}>{data.identity.label}</div>
          <div style={{ fontSize:12, opacity:0.7, marginTop:40, textAlign:'center', lineHeight:1.8 }}>
            新的一年<br/>继续铸铁
          </div>
          <button onClick={onClose} style={{ position:'absolute', bottom:40, padding:'12px 32px', background:'rgba(255,255,255,0.15)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:99, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            完成回顾
          </button>
        </>
      ),
    });

    return c;
  }, [data, onClose]);

  // 手势切换
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) next(); else prev();
  };

  const next = () => setCardIdx(i => Math.min(i + 1, cards.length - 1));
  const prev = () => setCardIdx(i => Math.max(i - 1, 0));

  // 点击区域切换 (左半边 prev, 右半边 next)
  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) prev();
    else if (x > rect.width * 0.65) next();
  };

  // 键盘
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cards.length, onClose]);

  if (loading) {
    return (
      <div style={{ position:'fixed', inset:0, background:'#1a252c', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, fontSize:14 }}>
        加载中…
      </div>
    );
  }

  if (!data || !data.hasData) {
    return (
      <div style={{ position:'fixed', inset:0, background:'#1a252c', color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:500, padding:32 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📖</div>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>{y} 年还没有故事</div>
        <div style={{ fontSize:13, opacity:0.7, textAlign:'center', marginBottom:24 }}>完成几次训练后再回来看看</div>
        <button onClick={onClose} style={{ padding:'12px 28px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:99, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>关闭</button>
      </div>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* 主容器 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        style={{ width:'100%', height:'100%', maxWidth:480, maxHeight:854, position:'relative', overflow:'hidden', background:'#000', cursor:'pointer' }}
      >
        {/* 进度条 */}
        <div style={{ position:'absolute', top:12, left:12, right:12, display:'flex', gap:4, zIndex:10 }}>
          {cards.map((_, i) => (
            <div key={i} style={{ flex:1, height:3, background:'rgba(255,255,255,0.3)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ width: i < cardIdx ? '100%' : i === cardIdx ? '100%' : '0%', height:'100%', background:'#fff', transition:'width .4s' }} />
            </div>
          ))}
        </div>
        {/* 关闭按钮 */}
        <button onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ position:'absolute', top:28, right:16, width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)', border:'none', color:'#fff', fontSize:18, cursor:'pointer', zIndex:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
          ×
        </button>
        {/* 卡片 */}
        {cards[cardIdx] && (
          <div key={cards[cardIdx].key} style={{ width:'100%', height:'100%', animation:'wrapFade .4s ease-out' }}>
            <Card bg={cards[cardIdx].bg} dark={cards[cardIdx].dark}>
              {cards[cardIdx].render()}
            </Card>
          </div>
        )}
        <style>{`
          @keyframes wrapFade { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </div>
  );
};

export default YearlyWrap;
