// 自动周计划生成器。纯确定性规则 — 无 AI。
// 输入：goal, availableDays, userHistory, exerciseMap
// 输出：weekPlan [{day, dayLabel, exercises:[{exercise, sets, reps, weight, role}]}]

const { recommend, sessionSummary } = require('./progressionRules');
const { bestSet } = require('./e1rm');

// ═══ 分组模板 ═══
// 每个 slot 定义：主要肌群 + 角色（compound 复合 / isolation 孤立）
const SPLIT_TEMPLATES = {
  // 推拉腿
  push: [
    { muscles: ['胸'], role: 'compound', label: '胸主项' },
    { muscles: ['胸'], role: 'isolation', label: '胸辅助' },
    { muscles: ['肩前束', '肩中束'], role: 'compound', label: '肩推' },
    { muscles: ['肩中束'], role: 'isolation', label: '侧平举' },
    { muscles: ['三头'], role: 'isolation', label: '三头' },
  ],
  pull: [
    { muscles: ['背'], role: 'compound', label: '背主项' },
    { muscles: ['背'], role: 'compound', label: '背辅助' },
    { muscles: ['后束'], role: 'isolation', label: '后束' },
    { muscles: ['二头'], role: 'isolation', label: '二头' },
    { muscles: ['二头', '前臂'], role: 'isolation', label: '前臂/弯举' },
  ],
  legs: [
    { muscles: ['股四', '臀'], role: 'compound', label: '腿主项' },
    { muscles: ['股四'], role: 'compound', label: '腿辅助' },
    { muscles: ['腿后侧', '臀'], role: 'compound', label: '后链' },
    { muscles: ['臀'], role: 'isolation', label: '臀部' },
    { muscles: ['小腿'], role: 'isolation', label: '小腿' },
  ],
  upper: [
    { muscles: ['胸'], role: 'compound', label: '胸' },
    { muscles: ['背'], role: 'compound', label: '背' },
    { muscles: ['肩前束', '肩中束'], role: 'compound', label: '肩' },
    { muscles: ['二头'], role: 'isolation', label: '二头' },
    { muscles: ['三头'], role: 'isolation', label: '三头' },
  ],
  lower: [
    { muscles: ['股四', '臀'], role: 'compound', label: '深蹲类' },
    { muscles: ['腿后侧', '臀'], role: 'compound', label: '硬拉类' },
    { muscles: ['股四'], role: 'isolation', label: '腿伸展' },
    { muscles: ['臀'], role: 'isolation', label: '臀部' },
    { muscles: ['小腿', '核心'], role: 'isolation', label: '小腿/核心' },
  ],
};

// 按可用天数选择分组方案
const pickSplit = (days) => {
  const n = days.length;
  if (n <= 2) return days.map((d, i) => ({ day: d, type: i === 0 ? 'upper' : 'lower' }));
  if (n === 3) return days.map((d, i) => ({ day: d, type: ['push', 'pull', 'legs'][i] }));
  if (n === 4) return days.map((d, i) => ({ day: d, type: ['upper', 'lower', 'upper', 'lower'][i] }));
  if (n === 5) return days.map((d, i) => ({ day: d, type: ['push', 'pull', 'legs', 'upper', 'lower'][i] }));
  // 6 days
  return days.slice(0, 6).map((d, i) => ({ day: d, type: ['push', 'pull', 'legs', 'push', 'pull', 'legs'][i] }));
};

// ═══ 目标 → 组次参数 ═══
const GOAL_PARAMS = {
  strength:    { compoundSets: 4, compoundReps: 5,  isoSets: 3, isoReps: 8  },
  hypertrophy: { compoundSets: 4, compoundReps: 10, isoSets: 3, isoReps: 12 },
  maintain:    { compoundSets: 3, compoundReps: 8,  isoSets: 2, isoReps: 10 },
};

// ═══ Mesocycle 周数调节 ═══
// weekOfCycle: 1-4, 4 = deload
const mesocycleAdjust = (baseSets, weekOfCycle) => {
  if (weekOfCycle === 4) return Math.max(2, Math.ceil(baseSets * 0.5)); // deload: 半量
  if (weekOfCycle === 3) return baseSets + 1; // peak: +1 set
  return baseSets; // week 1-2: baseline
};

const mesocycleWeightFactor = (weekOfCycle) => {
  if (weekOfCycle === 4) return 0.8; // deload: -20%
  return 1;
};

// ═══ 动作选择 ═══
// 从 exerciseMap 中为一个 slot 选一个动作
// 优先级：用户练过（familiarSet）> 复合动作 > 其他
const pickExercise = (slot, exerciseMap, familiarSet, usedSet) => {
  // 找所有候选：primary muscle 匹配 slot.muscles 中任意一个
  const candidates = Object.entries(exerciseMap)
    .filter(([ex, ms]) => {
      if (usedSet.has(ex)) return false;
      return slot.muscles.some(target => ms.includes(target));
    })
    .map(([ex, ms]) => ({
      ex,
      familiar: familiarSet.has(ex),
      isCompound: ms.length >= 2,
      primaryMatch: slot.muscles.includes(ms[0]),
    }));

  if (!candidates.length) return null;

  // 排序：熟悉 > primaryMatch > 复合
  candidates.sort((a, b) => {
    if (a.familiar !== b.familiar) return b.familiar - a.familiar;
    if (a.primaryMatch !== b.primaryMatch) return b.primaryMatch - a.primaryMatch;
    if (slot.role === 'compound' && a.isCompound !== b.isCompound) return b.isCompound - a.isCompound;
    if (slot.role === 'isolation' && a.isCompound !== b.isCompound) return a.isCompound - b.isCompound;
    return 0;
  });

  return candidates[0].ex;
};

// ═══ 主函数 ═══
// userWorkouts: 最近 30 天的 Workout documents (from DB)
// exerciseMap: EXERCISE_MUSCLE_MAP
// options: { goal: 'strength'|'hypertrophy'|'maintain', days: [0-6], weekOfCycle: 1-4 }
const generateWeekPlan = (userWorkouts, exerciseMap, options) => {
  const { goal = 'hypertrophy', days = [1, 3, 5], weekOfCycle = 1 } = options;
  const params = GOAL_PARAMS[goal] || GOAL_PARAMS.hypertrophy;
  const wFactor = mesocycleWeightFactor(weekOfCycle);

  // 用户历史：哪些动作练过
  const familiarSet = new Set(userWorkouts.map(w => w.exercise));

  // 每个动作的历史 sessions（用于 recommend）
  const historyByExercise = {};
  for (const w of userWorkouts) {
    if (w.type !== 'strength') continue;
    if (!historyByExercise[w.exercise]) historyByExercise[w.exercise] = [];
    const s = sessionSummary(w);
    if (s) historyByExercise[w.exercise].push(s);
  }
  // 每个动作按时间倒序
  for (const key of Object.keys(historyByExercise)) {
    historyByExercise[key].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  const dayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const split = pickSplit(days);

  const plan = split.map(({ day, type }) => {
    const template = SPLIT_TEMPLATES[type];
    if (!template) return { day, dayLabel: dayLabels[day], type, exercises: [] };

    const usedSet = new Set();
    const exercises = template.map(slot => {
      const ex = pickExercise(slot, exerciseMap, familiarSet, usedSet);
      if (!ex) return null;
      usedSet.add(ex);

      const isCompound = slot.role === 'compound';
      const baseSets = isCompound ? params.compoundSets : params.isoSets;
      const targetSets = mesocycleAdjust(baseSets, weekOfCycle);
      const targetReps = isCompound ? params.compoundReps : params.isoReps;

      // 用规则教练推荐重量
      const history = historyByExercise[ex] || [];
      const rec = recommend(history, ex);
      let weight = rec.weight;
      if (weight != null) weight = Math.round(weight * wFactor * 10) / 10;

      return {
        exercise: ex,
        muscles: exerciseMap[ex] || [],
        role: slot.role,
        label: slot.label,
        sets: targetSets,
        reps: rec.reps || targetReps,
        weight,
        reason: rec.reason,
        rule: rec.rule,
      };
    }).filter(Boolean);

    return { day, dayLabel: dayLabels[day], type, exercises };
  });

  return {
    goal,
    weekOfCycle,
    totalWeeks: 4,
    isDeload: weekOfCycle === 4,
    days: plan,
  };
};

module.exports = { generateWeekPlan, SPLIT_TEMPLATES, GOAL_PARAMS, pickSplit };
