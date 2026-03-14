const express = require('express');
const jwt = require('jsonwebtoken');
const Workout = require('../models/Workout');
const User = require('../models/User');
const router = express.Router();

// ─── Auth middleware ────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret').user;
    next();
  } catch {
    res.status(401).json({ msg: 'Token invalid' });
  }
};

// ─── 工具函数 ────────────────────────────────────────────────────────────────

const toDateStr = (date) => new Date(date).toLocaleDateString('zh-CN');

const calcStreak = (workouts) => {
  if (!workouts.length) return 0;
  const days = new Set(workouts.map(w => toDateStr(w.date)));
  const today = new Date();
  const todayStr = toDateStr(today);
  let streak = 0;
  const start = days.has(todayStr) ? 0 : 1;
  for (let i = start; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(toDateStr(d))) streak++;
    else break;
  }
  return streak;
};

const calcAchievements = (workouts, streak, longestStreak) => {
  const out = [];
  const total = workouts.length;
  const days = new Set(workouts.map(w => toDateStr(w.date))).size;
  const vol = workouts.filter(w => w.type === 'strength')
    .reduce((a, w) => a + w.sets.reduce((b, s) => b + s.weight * s.reps, 0), 0);

  if (total >= 1)   out.push('first_workout');
  if (total >= 10)  out.push('workout_10');
  if (total >= 50)  out.push('workout_50');
  if (total >= 100) out.push('workout_100');
  if (days  >= 7)   out.push('week_warrior');
  if (days  >= 30)  out.push('month_master');
  if (Math.max(streak, longestStreak) >= 3)  out.push('streak_3');
  if (Math.max(streak, longestStreak) >= 7)  out.push('streak_7');
  if (Math.max(streak, longestStreak) >= 30) out.push('streak_30');
  if (vol >= 10000)   out.push('volume_10k');
  if (vol >= 100000)  out.push('volume_100k');
  return out;
};

/**
 * 洞察引擎：对比最近两次同动作训练，生成自然语言洞察
 * 返回数组，每条是一句有意义的结论
 */
const generateInsights = async (userId) => {
  const workouts = await Workout.find({ user: userId, type: 'strength' }).sort({ date: -1 }).limit(200);

  // 按动作分组
  const byExercise = {};
  for (const w of workouts) {
    if (!byExercise[w.exercise]) byExercise[w.exercise] = [];
    byExercise[w.exercise].push(w);
  }

  const insights = [];

  for (const [exercise, records] of Object.entries(byExercise)) {
    if (records.length < 2) continue;

    const latest = records[0];
    const prev   = records[1];

    const latestMaxWeight = Math.max(...latest.sets.map(s => s.weight));
    const prevMaxWeight   = Math.max(...prev.sets.map(s => s.weight));
    const latestTotalReps = latest.sets.reduce((a, s) => a + s.reps, 0);
    const prevTotalReps   = prev.sets.reduce((a, s) => a + s.reps, 0);
    const latestVol = latest.sets.reduce((a, s) => a + s.weight * s.reps, 0);
    const prevVol   = prev.sets.reduce((a, s) => a + s.weight * s.reps, 0);

    // 重量突破
    if (latestMaxWeight > prevMaxWeight) {
      insights.push({
        type: 'weight_up',
        exercise,
        value: latestMaxWeight - prevMaxWeight,
        text: `${exercise} 最高重量提升了 ${latestMaxWeight - prevMaxWeight} kg`,
        icon: '💪',
        priority: 3,
      });
    }
    // 总次数提升
    else if (latestTotalReps > prevTotalReps && latestMaxWeight >= prevMaxWeight) {
      insights.push({
        type: 'reps_up',
        exercise,
        value: latestTotalReps - prevTotalReps,
        text: `${exercise} 总次数比上次多了 ${latestTotalReps - prevTotalReps} 次`,
        icon: '📈',
        priority: 2,
      });
    }
    // 训练量提升
    else if (latestVol > prevVol * 1.05) {
      const pct = Math.round((latestVol / prevVol - 1) * 100);
      insights.push({
        type: 'volume_up',
        exercise,
        value: pct,
        text: `${exercise} 训练量比上次增加了 ${pct}%`,
        icon: '🔺',
        priority: 1,
      });
    }
  }

  // 检查本周是否创造了历史最高训练量
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekVol = workouts
    .filter(w => new Date(w.date) >= weekAgo)
    .reduce((a, w) => a + w.sets.reduce((b, s) => b + s.weight * s.reps, 0), 0);

  if (thisWeekVol > 0 && insights.length < 3) {
    const allWorkouts = await Workout.find({ user: userId, type: 'strength' }).sort({ date: -1 });
    const weeks = {};
    for (const w of allWorkouts) {
      const d = new Date(w.date);
      const weekKey = `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
      if (!weeks[weekKey]) weeks[weekKey] = 0;
      weeks[weekKey] += w.sets.reduce((a, s) => a + s.weight * s.reps, 0);
    }
    const weekVols = Object.values(weeks).sort((a, b) => b - a);
    if (weekVols.length >= 2 && thisWeekVol > weekVols[1]) {
      insights.push({
        type: 'best_week',
        text: `本周训练总量 ${thisWeekVol.toLocaleString()} kg，是近期最高纪录`,
        icon: '🏆',
        priority: 4,
      });
    }
  }

  // 按优先级排序，最多返回3条
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 3);
};

// ─── 训练记录 ────────────────────────────────────────────────────────────────

// GET /api/workouts?period=week|month|all
router.get('/', auth, async (req, res) => {
  try {
    const { period } = req.query;
    let filter = {};
    if (period === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      filter = { date: { $gte: d } };
    } else if (period === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      filter = { date: { $gte: d } };
    }
    const workouts = await Workout.find({ user: req.user.id, ...filter }).sort({ date: -1 });
    res.json(workouts);
  } catch { res.status(500).send('Server Error'); }
});

// GET /api/workouts/stats — 综合统计 + streak + 成就 + 更新longestStreak
router.get('/stats', auth, async (req, res) => {
  try {
    const [workouts, user] = await Promise.all([
      Workout.find({ user: req.user.id }).sort({ date: -1 }),
      User.findById(req.user.id),
    ]);

    const streak = calcStreak(workouts);

    // 更新历史最长streak
    if (streak > (user.longestStreak || 0)) {
      user.longestStreak = streak;
      await user.save();
    }

    // 每月重置streakShield
    const thisMonth = new Date().getMonth();
    if (user.streakShieldResetMonth !== thisMonth) {
      user.streakShield = 1;
      user.streakShieldResetMonth = thisMonth;
      await user.save();
    }

    const achievements = calcAchievements(workouts, streak, user.longestStreak);
    const activeDays = new Set(workouts.map(w => toDateStr(w.date))).size;
    const totalVolume = workouts
      .filter(w => w.type === 'strength')
      .reduce((a, w) => a + w.sets.reduce((b, s) => b + s.weight * s.reps, 0), 0);
    const totalCardioCalories = workouts
      .filter(w => w.type === 'cardio')
      .reduce((a, w) => a + w.sets.reduce((b, s) => b + (s.reps || 0), 0), 0);

    res.json({
      streak,
      longestStreak: user.longestStreak || 0,
      streakShield: user.streakShield || 0,
      achievements,
      totalWorkouts: workouts.length,
      activeDays,
      totalVolume,
      totalCardioCalories,
    });
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// GET /api/workouts/insights — 训练洞察
router.get('/insights', auth, async (req, res) => {
  try {
    const insights = await generateInsights(req.user.id);
    res.json(insights);
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// GET /api/workouts/suggest/:exercise — 智能重量建议
// 逻辑：分析该动作最近5次记录的进步趋势，推荐本次目标重量和目标次数
router.get('/suggest/:exercise', auth, async (req, res) => {
  try {
    const records = await Workout.find({
      user: req.user.id,
      exercise: req.params.exercise,
      type: 'strength',
    }).sort({ date: -1 }).limit(5);

    if (records.length < 2) {
      return res.json(null); // 数据不足，不给建议
    }

    // 取每次训练的最高重量 + 对应次数
    const history = records.map(w => {
      const best = w.sets.reduce((b, s) => s.weight > b.weight ? s : b, { weight: 0, reps: 0 });
      return { weight: best.weight, reps: best.reps, date: w.date };
    }).reverse(); // 时间正序

    const latest = history[history.length - 1];
    const prev   = history[history.length - 2];

    // 判断趋势
    const weightStuck = history.slice(-3).every(h => h.weight === latest.weight);
    const repsUp = latest.reps > prev.reps;
    const weightUp = latest.weight > prev.weight;

    let suggestedWeight = latest.weight;
    let suggestedReps   = latest.reps;
    let reason = '';

    if (weightUp) {
      // 最近一次刚加重，继续保持，提高次数
      suggestedWeight = latest.weight;
      suggestedReps   = Math.min(latest.reps + 1, 15);
      reason = `上次刚加到 ${latest.weight}kg，今天争取多做一次`;
    } else if (weightStuck && latest.reps >= 10) {
      // 重量卡住且次数已够，可以尝试加重
      const increment = latest.weight >= 60 ? 2.5 : 1.25;
      suggestedWeight = latest.weight + increment;
      suggestedReps   = Math.max(6, latest.reps - 2);
      reason = `已连续3次完成 ${latest.weight}kg，建议尝试 ${suggestedWeight}kg`;
    } else if (repsUp) {
      // 次数在涨，继续加次数
      suggestedWeight = latest.weight;
      suggestedReps   = latest.reps + 1;
      reason = `次数持续提升，今天目标 ${suggestedReps} 次`;
    } else {
      // 保持现状，巩固
      suggestedWeight = latest.weight;
      suggestedReps   = latest.reps;
      reason = `保持 ${latest.weight}kg，稳扎稳打`;
    }

    res.json({
      suggestedWeight,
      suggestedReps,
      reason,
      lastWeight: latest.weight,
      lastReps: latest.reps,
    });
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// GET /api/workouts/today — 获取今日训练记录（用于训练总结）
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end   = new Date(start.getTime() + 86400000);
    const workouts = await Workout.find({
      user: req.user.id,
      date: { $gte: start, $lt: end },
    }).sort({ createdAt: 1 });
    res.json(workouts);
  } catch { res.status(500).send('Server Error'); }
});

// POST /api/workouts/copy-last-session — 一键复制上次训练的所有动作
router.post('/copy-last-session', auth, async (req, res) => {
  try {
    const allWorkouts = await Workout.find({ user: req.user.id }).sort({ date: -1 });
    if (!allWorkouts.length) return res.status(404).json({ msg: 'No previous workouts found' });

    // 找到上次训练日期（最近的不是今天的日期）
    const todayStr = toDateStr(new Date());
    const lastSessionDate = allWorkouts.find(w => toDateStr(w.date) !== todayStr)?.date;
    if (!lastSessionDate) return res.status(404).json({ msg: 'No previous session found' });

    const lastStr = toDateStr(lastSessionDate);
    const lastSession = allWorkouts.filter(w => toDateStr(w.date) === lastStr);

    // 返回模板数据（不直接创建，让前端决定是否确认）
    const template = lastSession.map(w => ({
      exercise: w.exercise,
      type: w.type,
      sets: w.sets,
    }));

    res.json({
      date: lastStr,
      exercises: template,
    });
  } catch { res.status(500).send('Server Error'); }
});

// GET /api/workouts/pr — 个人记录
router.get('/pr', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id, type: 'strength' });
    const prMap = {};
    for (const w of workouts) {
      for (const s of w.sets) {
        const vol = s.weight * s.reps;
        if (!prMap[w.exercise] || vol > prMap[w.exercise].volume) {
          prMap[w.exercise] = { exercise: w.exercise, weight: s.weight, reps: s.reps, volume: vol, date: w.date };
        }
      }
    }
    res.json(Object.values(prMap).sort((a, b) => b.volume - a.volume).slice(0, 10));
  } catch { res.status(500).send('Server Error'); }
});

// GET /api/workouts/progress/:exercise — 单动作进步曲线
router.get('/progress/:exercise', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id, exercise: req.params.exercise }).sort({ date: 1 });
    res.json(workouts.map(w => {
      const best = w.sets.reduce((b, s) => s.weight > b.weight ? s : b, { weight: 0, reps: 0 });
      return {
        date: w.date,
        bestWeight: best.weight,
        bestReps: best.reps,
        totalVolume: w.sets.reduce((a, s) => a + s.weight * s.reps, 0),
      };
    }));
  } catch { res.status(500).send('Server Error'); }
});

// GET /api/workouts/last/:exercise — 上次同动作记录（智能预填 + 实时对比用）
router.get('/last/:exercise', auth, async (req, res) => {
  try {
    const workout = await Workout.findOne({ user: req.user.id, exercise: req.params.exercise }).sort({ date: -1 });
    res.json(workout || null);
  } catch { res.status(500).send('Server Error'); }
});

// POST /api/workouts — 新增训练
router.post('/', auth, async (req, res) => {
  try {
    const { date, exercise, type, sets, notes } = req.body;
    const workout = await new Workout({ user: req.user.id, date, exercise, type: type || 'strength', sets, notes }).save();
    res.json(workout);
  } catch { res.status(500).send('Server Error'); }
});

// DELETE /api/workouts/templates/:templateId  ← 必须在 /:id 之前
router.delete('/templates/:templateId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.templates = user.templates.filter(t => t._id.toString() !== req.params.templateId);
    await user.save();
    res.json(user.templates);
  } catch { res.status(500).send('Server Error'); }
});

// POST /api/workouts/templates/:templateId/use  ← 必须在 /:id 之前
router.post('/templates/:templateId/use', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const t = user.templates.id(req.params.templateId);
    if (!t) return res.status(404).json({ msg: 'Template not found' });
    t.lastUsed = new Date();
    t.useCount = (t.useCount || 0) + 1;
    await user.save();
    res.json(t);
  } catch { res.status(500).send('Server Error'); }
});

// DELETE /api/workouts/:id — 删除训练
router.delete('/:id', auth, async (req, res) => {
  try {
    const w = await Workout.findById(req.params.id);
    if (!w) return res.status(404).json({ msg: 'Not found' });
    if (w.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
    await Workout.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch { res.status(500).send('Server Error'); }
});

// DELETE /api/workouts/:id/set/:setIndex — 删除单组
router.delete('/:id/set/:setIndex', auth, async (req, res) => {
  try {
    const w = await Workout.findById(req.params.id);
    if (!w) return res.status(404).json({ msg: 'Not found' });
    if (w.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
    const idx = parseInt(req.params.setIndex);
    w.sets.splice(idx, 1);
    if (w.sets.length === 0) {
      await Workout.findByIdAndDelete(req.params.id);
      return res.json({ deleted: true });
    }
    await w.save();
    res.json(w);
  } catch { res.status(500).send('Server Error'); }
});

// ─── 身体数据 ─────────────────────────────────────────────────────────────────

router.get('/body-weight', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user?.bodyWeightLog || []);
  } catch { res.status(500).send('Server Error'); }
});

router.post('/body-weight', auth, async (req, res) => {
  const { date, weight } = req.body;
  if (!date || !weight) return res.status(400).json({ msg: 'Missing fields' });
  try {
    const user = await User.findById(req.user.id);
    const existing = user.bodyWeightLog.find(e => toDateStr(e.date) === toDateStr(date));
    if (existing) { existing.weight = weight; existing.date = date; }
    else user.bodyWeightLog.push({ date, weight });
    user.bodyWeightLog.sort((a, b) => new Date(b.date) - new Date(a.date));
    user.bodyWeightLog = user.bodyWeightLog.slice(0, 180);
    await user.save();
    res.json(user.bodyWeightLog);
  } catch { res.status(500).send('Server Error'); }
});

// ─── 训练模板 ─────────────────────────────────────────────────────────────────

// GET /api/workouts/templates
router.get('/templates', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user?.templates || []);
  } catch { res.status(500).send('Server Error'); }
});

// POST /api/workouts/templates — 保存模板
router.post('/templates', auth, async (req, res) => {
  const { name, exercises } = req.body;
  if (!name || !exercises?.length) return res.status(400).json({ msg: 'Missing fields' });
  try {
    const user = await User.findById(req.user.id);
    user.templates.push({ name, exercises });
    await user.save();
    res.json(user.templates);
  } catch { res.status(500).send('Server Error'); }
});



// ─── 用户画像 & 周计划 ────────────────────────────────────────────────────────

// GET /api/workouts/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ profile: user.profile, weeklyPlan: user.weeklyPlan, templates: user.templates });
  } catch { res.status(500).send('Server Error'); }
});

// PUT /api/workouts/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (req.body.profile) Object.assign(user.profile, req.body.profile);
    if (req.body.weeklyPlan) user.weeklyPlan = req.body.weeklyPlan;
    await user.save();
    res.json({ profile: user.profile, weeklyPlan: user.weeklyPlan });
  } catch { res.status(500).send('Server Error'); }
});

// POST /api/workouts/streak-shield — 使用streak免死金牌
router.post('/streak-shield', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if ((user.streakShield || 0) <= 0) return res.status(400).json({ msg: 'No shield available' });
    user.streakShield -= 1;
    await user.save();
    res.json({ streakShield: user.streakShield });
  } catch { res.status(500).send('Server Error'); }
});

module.exports = router;
