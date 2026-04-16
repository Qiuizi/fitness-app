// RPE-based progression rules. Pure function: history → recommendation.
// 规则完全透明、可解释、可验证 — 这是产品差异化的核心。

const { epley, bestSet } = require('./e1rm');

// 上肢用小增量、下肢/躯干用大增量
const UPPER_BODY_HINTS = ['卧推','推举','弯举','下压','飞鸟','划船','引体','下拉','侧平举','前平举','耸肩','面拉','肩推','臂屈伸','夹胸'];
const isLowerBody = (exercise = '') => {
  if (UPPER_BODY_HINTS.some(k => exercise.includes(k))) return false;
  return /深蹲|硬拉|腿|弓步|臀|蹲|提踵|分腿/.test(exercise);
};

const increment = (exercise, weight) => {
  if (isLowerBody(exercise)) return 5;
  if (weight >= 60) return 2.5;
  return 1.25;
};

// Extract best working set + rpe per session.
const sessionSummary = (workout) => {
  const best = bestSet(workout.sets || []);
  if (!best) return null;
  // 取最后一组非热身的 RPE 作为"疲劳指示"（用户习惯在最后一组给 RPE）
  const lastRpe = [...(workout.sets || [])]
    .reverse()
    .find(s => !s.isWarmup && s.rpe != null)?.rpe;
  return {
    date: workout.date,
    weight: best.weight,
    reps: best.reps,
    e1rm: best.e1rm,
    rpe: lastRpe ?? null,
  };
};

// 核心规则函数：给定历史（最近先排），返回下一次建议
// history: [{date, weight, reps, e1rm, rpe}] — 时间倒序（最新在前）
const recommend = (history, exercise) => {
  // Case 0: 无历史 — 起步建议
  if (!history || history.length === 0) {
    return {
      weight: null,
      reps: 8,
      reason: '第一次做这个动作，选一个能稳稳完成 8 次的重量作为起点',
      rule: 'first_time',
    };
  }

  const latest = history[0];
  const prev = history[1];

  // Case 1: 只有 1 次历史 — 按上次重复
  if (!prev) {
    return {
      weight: latest.weight,
      reps: latest.reps,
      reason: '数据还少，先按上次的来适应',
      rule: 'insufficient_history',
    };
  }

  const recent3 = history.slice(0, 3);
  const recent3E1rm = recent3.map(h => h.e1rm).filter(Boolean);
  const e1rmRange = recent3E1rm.length >= 3
    ? (Math.max(...recent3E1rm) - Math.min(...recent3E1rm)) / Math.max(...recent3E1rm)
    : 1;

  const inc = increment(exercise, latest.weight);

  // Case 2: 停滞超过 3 次 — deload
  if (recent3E1rm.length >= 3 && e1rmRange < 0.02) {
    return {
      weight: Math.round(latest.weight * 0.9 * 10) / 10,
      reps: 8,
      reason: `连续 3 次 e1RM 波动 < 2%，已经停滞。本周 deload 到 ${Math.round(latest.weight * 0.9 * 10) / 10}kg × 8 恢复状态，下周再冲`,
      rule: 'deload_plateau',
    };
  }

  // Case 3: 最后一组 RPE ≤ 7 且达成 → 可以加重
  if (latest.rpe != null && latest.rpe <= 7) {
    return {
      weight: latest.weight + inc,
      reps: latest.reps,
      reason: `上次 RPE ${latest.rpe}（还有余力），加 ${inc}kg 挑战 ${latest.weight + inc}kg × ${latest.reps}`,
      rule: 'rpe_low_progress',
    };
  }

  // Case 4: 最后一组 RPE ≥ 9 → 保持重量，目标巩固
  if (latest.rpe != null && latest.rpe >= 9) {
    return {
      weight: latest.weight,
      reps: latest.reps,
      reason: `上次 RPE ${latest.rpe} 接近极限，先稳住 ${latest.weight}kg × ${latest.reps} 巩固，下次再加`,
      rule: 'rpe_high_consolidate',
    };
  }

  // Case 5: 无 RPE 数据 — 回退到"次数进阶法"
  // 5a: 最近两次次数都提高了 → 加重 + 降次
  if (history.length >= 2 && latest.reps > prev.reps && latest.weight === prev.weight && latest.reps >= 10) {
    return {
      weight: latest.weight + inc,
      reps: Math.max(6, latest.reps - 2),
      reason: `次数已达 ${latest.reps}，升重到 ${latest.weight + inc}kg，降回 ${Math.max(6, latest.reps - 2)} 次`,
      rule: 'double_progression_up',
    };
  }

  // 5b: 重量最近没涨 → 加次
  if (latest.weight === prev.weight && latest.reps <= prev.reps) {
    return {
      weight: latest.weight,
      reps: latest.reps + 1,
      reason: `保持 ${latest.weight}kg，今天目标多做 1 次（${latest.reps + 1} 次）`,
      rule: 'add_rep',
    };
  }

  // 5c: 刚加重 → 先适应
  if (latest.weight > prev.weight) {
    return {
      weight: latest.weight,
      reps: Math.min(latest.reps + 1, 12),
      reason: `上次刚加到 ${latest.weight}kg，今天多做 1 次巩固`,
      rule: 'consolidate_new_weight',
    };
  }

  // Default: 保持
  return {
    weight: latest.weight,
    reps: latest.reps,
    reason: '保持上次节奏',
    rule: 'hold',
  };
};

module.exports = { recommend, sessionSummary, increment };
