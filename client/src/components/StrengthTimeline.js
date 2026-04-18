import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_URL } from '../config';

// 折线颜色 (Morandi 家族)
const LINE_COLORS = ['#6a8b85', '#b8845a', '#7e7a98'];

const daysAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return `${diff}天前`;
  if (diff < 30) return `${Math.floor(diff/7)}周前`;
  return `${Math.floor(diff/30)}月前`;
};

// 紧凑数字格式
const fmtVol = (v) => {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}t`;
  return `${v}kg`;
};

const StrengthTimeline = ({ token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [months, setMonths] = useState(12);
  const scrollRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/workouts/strength-timeline?months=${months}`, { headers: { 'x-auth-token': token } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setData(d);
        setLoading(false);
        // 默认选中最近有数据的月份
        if (d?.buckets?.length) {
          for (let i = d.buckets.length - 1; i >= 0; i--) {
            if (d.buckets[i].workouts > 0) { setSelectedIdx(i); break; }
          }
        }
      })
      .catch(() => setLoading(false));
  }, [token, months]);

  // 滚动到最新月份 (右侧)
  useEffect(() => {
    if (scrollRef.current && data) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  const selected = data?.buckets?.[selectedIdx];

  // 生成 e1RM 折线 SVG 路径 (按月份 x 分布)
  const chartPaths = useMemo(() => {
    if (!data?.exerciseSeries) return [];
    const months = data.buckets.length;
    const maxE1RM = data.maxE1RM || 1;
    const W = Math.max(280, months * 32);
    const H = 140;
    const padTop = 16, padBottom = 16, padLeft = 16, padRight = 16;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    return Object.entries(data.exerciseSeries).map(([ex, series], i) => {
      const pts = series.map((v, idx) => {
        const x = padLeft + (plotW * idx) / Math.max(1, months - 1);
        const y = v > 0 ? padTop + plotH - (v / maxE1RM) * plotH : null;
        return { x, y, v };
      });
      // 跳过零值构建连续路径
      let d = '';
      let started = false;
      for (const p of pts) {
        if (p.y === null) { started = false; continue; }
        if (!started) { d += `M ${p.x} ${p.y} `; started = true; }
        else d += `L ${p.x} ${p.y} `;
      }
      return { exercise: ex, d, color: LINE_COLORS[i % LINE_COLORS.length], pts, W, H };
    });
  }, [data]);

  const maxVolume = data?.maxVolume || 1;

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-xl)', padding:'16px 0 16px', marginBottom:16 }}>
      {/* Header */}
      <div style={{ padding:'0 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:15, fontWeight:700 }}>力量进化</span>
          <span style={{ fontSize:10, fontWeight:700, background:'var(--c-blue-dim)', color:'var(--c-blue)', padding:'2px 8px', borderRadius:99 }}>时间轴</span>
        </div>
        <div style={{ display:'flex', background:'var(--surface-3)', borderRadius:99, padding:3 }}>
          {[{k:6,l:'6月'},{k:12,l:'12月'},{k:24,l:'24月'}].map(p => (
            <div key={p.k} onClick={() => setMonths(p.k)}
              style={{ padding:'6px 12px', fontSize:11, fontWeight:700, borderRadius:99, cursor:'pointer',
                background: months === p.k ? 'var(--surface)' : 'transparent',
                color: months === p.k ? 'var(--c-blue)' : 'var(--text-3)',
                boxShadow: months === p.k ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                WebkitTapHighlightColor:'transparent', transition:'all .15s' }}>{p.l}</div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:'40px 16px', textAlign:'center', fontSize:13, color:'var(--text-3)' }}>加载中…</div>
      ) : !data?.buckets?.length ? (
        <div style={{ padding:'40px 16px', textAlign:'center', fontSize:13, color:'var(--text-3)' }}>暂无训练数据</div>
      ) : (
        <>
          {/* e1RM 折线图 (水平滚动) */}
          {data.topExercises?.length > 0 && chartPaths.length > 0 && (
            <div style={{ overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', paddingBottom:4 }}>
              <svg viewBox={`0 0 ${chartPaths[0].W} ${chartPaths[0].H}`}
                width={chartPaths[0].W} height={chartPaths[0].H}
                style={{ display:'block', minWidth:'100%' }}>
                {/* 网格线 */}
                {[0.25, 0.5, 0.75].map(t => {
                  const y = 16 + (chartPaths[0].H - 32) * (1 - t);
                  return <line key={t} x1={16} y1={y} x2={chartPaths[0].W - 16} y2={y} stroke="var(--border)" strokeDasharray="2 3" strokeWidth={0.8} />;
                })}
                {/* 当前选中月竖线 */}
                {selectedIdx !== null && (() => {
                  const W = chartPaths[0].W;
                  const x = 16 + ((W - 32) * selectedIdx) / Math.max(1, data.buckets.length - 1);
                  return <line x1={x} y1={10} x2={x} y2={chartPaths[0].H - 10} stroke="var(--c-blue)" strokeDasharray="3 2" strokeWidth={1.2} opacity={0.5} />;
                })()}
                {/* 折线 */}
                {chartPaths.map(({ d, color }, i) => (
                  <path key={i} d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {/* 点 */}
                {chartPaths.map(({ pts, color }, i) =>
                  pts.map((p, j) => p.y !== null && (
                    <circle key={`${i}-${j}`} cx={p.x} cy={p.y} r={j === selectedIdx ? 5 : 3} fill={color} stroke="var(--surface)" strokeWidth={1.5} />
                  ))
                )}
              </svg>
            </div>
          )}

          {/* 图例 */}
          {data.topExercises?.length > 0 && (
            <div style={{ padding:'4px 16px 10px', display:'flex', gap:12, flexWrap:'wrap' }}>
              {data.topExercises.map((ex, i) => (
                <div key={ex} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-3)', fontWeight:600 }}>
                  <span style={{ width:12, height:3, background: LINE_COLORS[i], borderRadius:2 }} />
                  {ex}
                </div>
              ))}
            </div>
          )}

          {/* 月度节点时间轴 (横向滚动) */}
          <div ref={scrollRef} style={{ overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', padding:'8px 16px 4px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', minHeight:90 }}>
              {data.buckets.map((b, i) => {
                const size = 24 + Math.round((b.volume / maxVolume) * 36);
                const isSelected = i === selectedIdx;
                const trendColor = b.trend > 0 ? 'var(--c-green)' : b.trend < 0 ? 'var(--c-red)' : 'var(--text-3)';
                const nodeBg = b.workouts === 0 ? 'var(--surface-3)' : isSelected ? 'var(--c-blue)' : b.trend > 0 ? '#a5c0b8' : b.trend < 0 ? '#c9a8a0' : '#c9c4b8';
                const textColor = isSelected || (b.workouts > 0 && !isSelected) ? 'var(--surface)' : 'var(--text-4)';
                return (
                  <div key={b.key} onClick={() => setSelectedIdx(i)}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer', flexShrink:0, WebkitTapHighlightColor:'transparent', minWidth:44 }}>
                    <div style={{
                      width: size, height: size, borderRadius:'50%',
                      background: nodeBg,
                      border: isSelected ? '3px solid var(--c-blue)' : '2px solid var(--surface)',
                      boxShadow: isSelected ? '0 4px 14px rgba(0,113,227,0.25)' : b.workouts > 0 ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: size < 36 ? 10 : 11, fontWeight:800,
                      color: textColor,
                      transition:'all .2s ease-out',
                      transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    }}>
                      {b.trend !== 0 && b.workouts > 0 && <span style={{ fontSize:10 }}>{b.trend > 0 ? '↑' : '↓'}</span>}
                    </div>
                    <div style={{ fontSize:10, fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--c-blue)' : 'var(--text-3)', whiteSpace:'nowrap' }}>
                      {b.month === 1 ? `${b.year}` : b.label}
                    </div>
                    {b.workouts > 0 && (
                      <div style={{ fontSize:8, color: trendColor, fontWeight:700, height:10 }}>
                        {fmtVol(b.volume)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 选中月详情 */}
          {selected && (
            <div style={{ margin:'12px 16px 0', padding:'14px 16px', background:'var(--surface-3)', borderRadius:'var(--r-l)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:15, fontWeight:800 }}>{selected.year}年{selected.label}</div>
                {selected.trend !== 0 && selected.workouts > 0 && (
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:99,
                    background: selected.trend > 0 ? 'var(--c-green-dim)' : 'var(--c-red-dim, rgba(255,59,48,0.1))',
                    color: selected.trend > 0 ? 'var(--c-green)' : 'var(--c-red)' }}>
                    {selected.trend > 0 ? '↑ 进步' : '↓ 波动'}
                  </span>
                )}
              </div>
              {selected.workouts === 0 ? (
                <div style={{ fontSize:12, color:'var(--text-3)', textAlign:'center', padding:'16px 0' }}>该月没有训练记录</div>
              ) : (
                <>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    <div style={{ flex:1, textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:800 }}>{selected.workouts}</div>
                      <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>训练次</div>
                    </div>
                    <div style={{ flex:1, textAlign:'center', borderLeft:'1px solid var(--border)', borderRight:'1px solid var(--border)' }}>
                      <div style={{ fontSize:18, fontWeight:800 }}>{selected.trainingDays}</div>
                      <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>天数</div>
                    </div>
                    <div style={{ flex:1, textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:800 }}>{fmtVol(selected.volume)}</div>
                      <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>总容量</div>
                    </div>
                  </div>
                  {selected.bestPR && (
                    <div style={{ padding:'10px 12px', background:'var(--surface)', borderRadius:'var(--r-m)', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:18 }}>🏆</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:'var(--text-3)' }}>月度 PR · {daysAgo(selected.bestPR.date)}</div>
                        <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {selected.bestPR.exercise} · {selected.bestPR.weight}kg × {selected.bestPR.reps}
                        </div>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--c-purple)' }}>e1RM {selected.bestPR.e1rm}</span>
                    </div>
                  )}
                  {selected.topExercises?.length > 0 && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:6 }}>主要动作</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        {selected.topExercises.map((e, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                            <span style={{ fontWeight:600 }}>{e.exercise}</span>
                            <span style={{ color:'var(--text-3)' }}>{fmtVol(e.volume)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StrengthTimeline;
