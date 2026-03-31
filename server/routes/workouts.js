const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
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

// Epley 公式计算 1RM: 1RM = weight × (1 + reps / 30)
// reps=1 时 1RM=weight，reps>30 不适用
const calc1RM = (weight, reps) => {
  if (!weight || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 30) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

// ─── 动作→肌肉群映射 ───────────────────────────────────────────────────────
const EXERCISE_MUSCLE_MAP = {
  '杠铃卧推':['胸','肩前束'],'哑铃卧推':['胸','肩前束'],'上斜杠铃卧推':['胸','肩前束'],'上斜哑铃推举':['肩前束','胸'],
  '下斜杠铃卧推':['胸'],'哑铃飞鸟':['胸'],'上斜哑铃飞鸟':['胸'],'下斜哑铃飞鸟':['胸'],
  '绳索夹胸':['胸'],'绳索飞鸟':['胸'],'俯卧撑':['胸','三头'],'宽距俯卧撑':['胸'],'钻石俯卧撑':['三头','胸'],
  '双杠臂屈伸（胸）':['胸','三头'],'史密斯卧推':['胸','肩前束'],'蝴蝶机夹胸':['胸'],'龙门架夹胸':['胸'],
  '下斜绳索飞鸟':['胸'],'弹力带卧推':['胸'],'悬吊俯卧撑':['胸','核心'],

  '引体向上':['背','二头'],'反握引体向上':['背','二头'],'宽握引体向上':['背'],'中握引体向上':['背','二头'],
  '高位下拉':['背'],'反握高位下拉':['背','二头'],'中立握高位下拉':['背'],
  '杠铃划船':['背','后束'],'坐姿划船':['背'],'T型划船':['背'],'单臂哑铃划船':['背'],'绳索划船':['背'],
  '硬拉':['背','腿','臀'],'直腿硬拉':['臀','腿后侧'],'早安式硬拉':['背','臀'],'绳索直臂下压':['背'],
  '直立划船':['肩','背'],'杠铃耸肩':['斜方肌'],'哑铃耸肩':['斜方肌'],'面拉':['后束','背'],
  '俯身飞鸟':['后束'],'反向飞鸟':['后束'],'史密斯划船':['背'],'悬吊划船':['背'],'背部伸展':['背'],

  '深蹲':['股四','臀','核心'],'前蹲':['股四','核心'],'哈克深蹲':['股四'],'史密斯深蹲':['股四'],
  '相扑深蹲':['腿内侧','股四'],'壶铃深蹲':['股四','臀'],
  '腿举':['股四','臀'],'腿屈伸':['股四'],'腿弯举（坐姿）':['腿后侧'],'腿弯举（俯卧）':['腿后侧'],
  '罗马尼亚硬拉':['腿后侧','臀'],'保加利亚分腿蹲':['股四','臀'],'弓步蹲':['股四','臀'],'行走弓步':['股四','臀'],
  '提踵（坐姿）':['小腿'],'提踵（站姿）':['小腿'],'单腿提踵':['小腿'],
  '臀桥':['臀'],'负重臀桥':['臀'],'单腿臀桥':['臀'],'髋关节伸展':['臀'],
  '腿外展机':['腿内侧'],'腿内收机':['腿内侧'],'侧卧抬腿':['臀'],'消防栓':['臀'],

  '杠铃推举':['肩前束','三头'],'哑铃肩推':['肩前束','三头'],'阿诺德推举':['肩前束'],'史密斯推举':['肩前束'],
  '哑铃侧平举':['肩中束'],'绳索侧平举':['肩中束'],'单臂绳索侧平举':['肩中束'],
  '哑铃前平举':['肩前束'],'绳索前平举':['肩前束'],'杠铃前平举':['肩前束'],
  '绳索面拉':['后束','背'],'杠铃直立划船':['肩','斜方肌'],'哑铃直立划船':['肩'],
  '俯身哑铃飞鸟':['后束'],'绳索后束拉':['后束'],'反向蝴蝶机':['后束'],
  '弹力带肩推':['肩前束'],'哑铃耸肩（斜方肌）':['斜方肌'],

  '杠铃弯举':['二头'],'哑铃弯举':['二头'],'锤式弯举':['二头','前臂'],'绳索弯举':['二头'],
  '上斜哑铃弯举':['二头'],'集中弯举':['二头'],'蜘蛛弯举':['二头'],'反握弯举':['前臂','二头'],
  '对握弯举':['二头'],'弹力带弯举':['二头'],
  '三头绳索下压':['三头'],'绳索过头伸展':['三头'],'仰卧臂屈伸':['三头'],
  '双杠臂屈伸（三头）':['三头'],'哑铃过头臂屈伸':['三头'],'单臂绳索下压':['三头'],
  '窄距卧推':['三头','胸'],'下斜臂屈伸':['三头'],'椅子撑体':['三头'],
  '腕弯举':['前臂'],'反握腕弯举':['前臂'],'握力训练':['前臂'],

  '卷腹':['腹直肌'],'仰卧起坐':['腹直肌'],'反向卷腹':['腹直肌'],'自行车卷腹':['腹直肌','腹斜肌'],'V字起坐':['腹直肌'],
  '平板支撑':['核心'],'侧平板':['腹斜肌'],'侧平板旋转':['腹斜肌'],'RKC平板':['核心'],
  '悬垂举腿':['腹直肌'],'悬垂屈膝举腿':['腹直肌'],'仰卧举腿':['腹直肌'],'直腿上举':['腹直肌'],
  '俄罗斯挺身':['腹斜肌'],'木桩式转体':['腹斜肌'],'绳索卷腹':['腹直肌'],'绳索旋转':['腹斜肌'],
  '山地爬行':['核心'],'滚轮卷腹':['腹直肌'],'药球砸地':['核心'],'死虫式':['核心'],
  '鸟狗式':['核心'],'麦克罗伊卷腹':['腹直肌'],'Pallof推举':['核心'],

  '弹力带臀桥':['臀'],'深蹲（臀向后）':['臀','股四'],'蚌式训练':['臀中肌'],'侧卧蚌式':['臀中肌'],
  '站姿髋外展':['臀中肌'],'绳索臀部后踢':['臀'],'站姿臀部外展':['臀中肌'],'俯卧臀部后踢':['臀'],
  '弹力带侧走':['臀中肌'],'臀冲':['臀'],'反向弓步':['臀','股四'],
};

// 所有肌群列表
const ALL_MUSCLE_GROUPS = [...new Set(Object.values(EXERCISE_MUSCLE_MAP).flat())];

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

    const totalDuration = workouts.reduce((a, w) => a + (w.duration || 0), 0);

    res.json({
      streak,
      longestStreak: user.longestStreak || 0,
      streakShield: user.streakShield || 0,
      achievements,
      totalWorkouts: workouts.length,
      activeDays,
      totalVolume,
      totalCardioCalories,
      totalDuration,
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

// GET /api/workouts/pr — 个人记录（含1RM）
router.get('/pr', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id, type: 'strength' });
    const prMap = {};
    for (const w of workouts) {
      for (const s of w.sets) {
        const vol = s.weight * s.reps;
        if (!prMap[w.exercise] || vol > prMap[w.exercise].volume) {
          prMap[w.exercise] = { exercise: w.exercise, weight: s.weight, reps: s.reps, volume: vol, date: w.date, estimated1RM: calc1RM(s.weight, s.reps) };
        }
        // 同时追踪最佳 1RM
        const rm1 = calc1RM(s.weight, s.reps);
        if (rm1 > 0 && (!prMap[w.exercise].best1RM || rm1 > prMap[w.exercise].best1RM)) {
          prMap[w.exercise].best1RM = rm1;
        }
      }
    }
    res.json(Object.values(prMap).sort((a, b) => b.volume - a.volume).slice(0, 10));
  } catch { res.status(500).send('Server Error'); }
});

// GET /api/workouts/progress/:exercise — 单动作进步曲线（含1RM趋势）
router.get('/progress/:exercise', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id, exercise: req.params.exercise }).sort({ date: 1 });
    res.json(workouts.map(w => {
      const best = w.sets.reduce((b, s) => s.weight > b.weight ? s : b, { weight: 0, reps: 0 });
      const bestRM1 = w.sets.reduce((max, s) => Math.max(max, calc1RM(s.weight, s.reps)), 0);
      return {
        date: w.date,
        bestWeight: best.weight,
        bestReps: best.reps,
        best1RM: bestRM1,
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
    const { date, exercise, type, sets, notes, duration } = req.body;
    const workout = await new Workout({ user: req.user.id, date, exercise, type: type || 'strength', sets, notes, duration: duration || 0 }).save();
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



// ─── 自定义动作 ─────────────────────────────────────────────────────────────────

// GET /api/workouts/custom-exercises
router.get('/custom-exercises', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user?.customExercises || []);
  } catch { res.status(500).send('Server Error'); }
});

// POST /api/workouts/custom-exercises — 添加自定义动作
router.post('/custom-exercises', auth, async (req, res) => {
  const { name, category, type } = req.body;
  if (!name?.trim()) return res.status(400).json({ msg: '动作名称不能为空' });
  try {
    const user = await User.findById(req.user.id);
    // 防重复
    if (user.customExercises.some(e => e.name === name.trim())) {
      return res.status(400).json({ msg: '该动作已存在' });
    }
    user.customExercises.push({ name: name.trim(), category: category || '自定义', type: type || 'strength' });
    await user.save();
    res.json(user.customExercises);
  } catch { res.status(500).send('Server Error'); }
});

// DELETE /api/workouts/custom-exercises/:exerciseId
router.delete('/custom-exercises/:exerciseId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.customExercises = user.customExercises.filter(e => e._id.toString() !== req.params.exerciseId);
    await user.save();
    res.json(user.customExercises);
  } catch { res.status(500).send('Server Error'); }
});

// ─── 用户画像 & 周计划 ────────────────────────────────────────────────────────

// GET /api/workouts/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ profile: user.profile, weeklyPlan: user.weeklyPlan, templates: user.templates, customExercises: user.customExercises || [], reminder: user.reminder, progressPhotos: user.progressPhotos || [] });
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

// ─── 肌群分析 ─────────────────────────────────────────────────────────────────

// GET /api/workouts/muscle-heatmap?period=week|month|all
router.get('/muscle-heatmap', auth, async (req, res) => {
  try {
    const { period } = req.query;
    let filter = { user: req.user.id, type: 'strength' };
    if (period === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      filter.date = { $gte: d };
    } else if (period === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      filter.date = { $gte: d };
    }
    const workouts = await Workout.find(filter);
    const muscleCount = {};
    for (const w of workouts) {
      const muscles = EXERCISE_MUSCLE_MAP[w.exercise] || [];
      const sets = w.sets.filter(s => !s.isWarmup).length || w.sets.length;
      for (const m of muscles) {
        muscleCount[m] = (muscleCount[m] || 0) + sets;
      }
    }
    res.json({ muscles: muscleCount, max: Math.max(...Object.values(muscleCount), 1) });
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// GET /api/workouts/muscle-volume?weeks=4
router.get('/muscle-volume', auth, async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks) || 4;
    const workouts = await Workout.find({ user: req.user.id, type: 'strength' }).sort({ date: -1 });
    const now = new Date();
    const result = {};
    for (const m of ALL_MUSCLE_GROUPS) result[m] = new Array(weeks).fill(0);

    for (const w of workouts) {
      const muscles = EXERCISE_MUSCLE_MAP[w.exercise] || [];
      const d = new Date(w.date);
      const diffWeeks = Math.floor((now - d) / (7 * 86400000));
      if (diffWeeks >= weeks) continue;
      const weekIdx = weeks - 1 - diffWeeks;
      const workingSets = w.sets.filter(s => !s.isWarmup).length || w.sets.length;
      for (const m of muscles) {
        result[m][weekIdx] += workingSets;
      }
    }
    // 只返回有训练记录的肌群
    const filtered = {};
    for (const [m, v] of Object.entries(result)) {
      if (v.some(x => x > 0)) filtered[m] = v;
    }
    // MEV/MRV 参考值 (每周组数)
    const guidelines = {
      '胸': { mev: 8, mrv: 20 }, '背': { mev: 8, mrv: 22 }, '股四': { mev: 6, mrv: 18 },
      '臀': { mev: 4, mrv: 16 }, '肩前束': { mev: 6, mrv: 18 }, '肩中束': { mev: 6, mrv: 22 },
      '后束': { mev: 6, mrv: 18 }, '二头': { mev: 4, mrv: 18 }, '三头': { mev: 4, mrv: 16 },
      '腹直肌': { mev: 4, mrv: 18 }, '腹斜肌': { mev: 4, mrv: 12 }, '核心': { mev: 4, mrv: 16 },
      '腿后侧': { mev: 4, mrv: 14 }, '小腿': { mev: 6, mrv: 16 }, '斜方肌': { mev: 4, mrv: 14 },
      '前臂': { mev: 2, mrv: 12 }, '腿内侧': { mev: 3, mrv: 12 }, '臀中肌': { mev: 3, mrv: 14 },
    };
    res.json({ muscles: filtered, guidelines, weeks });
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// ─── 训练编辑 ─────────────────────────────────────────────────────────────────

// PUT /api/workouts/:id — 编辑训练记录
router.put('/:id', auth, async (req, res) => {
  try {
    const w = await Workout.findById(req.params.id);
    if (!w) return res.status(404).json({ msg: 'Not found' });
    if (w.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
    const { sets, exercise, notes, duration } = req.body;
    if (sets) w.sets = sets;
    if (exercise) w.exercise = exercise;
    if (notes !== undefined) w.notes = notes;
    if (duration !== undefined) w.duration = duration;
    await w.save();
    res.json(w);
  } catch { res.status(500).send('Server Error'); }
});

// PUT /api/workouts/:id/set/:setIndex — 编辑单组数据
router.put('/:id/set/:setIndex', auth, async (req, res) => {
  try {
    const w = await Workout.findById(req.params.id);
    if (!w) return res.status(404).json({ msg: 'Not found' });
    if (w.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Unauthorized' });
    const idx = parseInt(req.params.setIndex);
    if (idx < 0 || idx >= w.sets.length) return res.status(400).json({ msg: 'Invalid set index' });
    const { weight, reps, isWarmup, rpe, setType } = req.body;
    if (weight !== undefined) w.sets[idx].weight = weight;
    if (reps !== undefined) w.sets[idx].reps = reps;
    if (isWarmup !== undefined) w.sets[idx].isWarmup = isWarmup;
    if (rpe !== undefined) w.sets[idx].rpe = rpe;
    if (setType !== undefined) w.sets[idx].setType = setType;
    await w.save();
    res.json(w);
  } catch { res.status(500).send('Server Error'); }
});

// ─── 数据导出 ─────────────────────────────────────────────────────────────────

// GET /api/workouts/export?format=csv|json
router.get('/export', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id }).sort({ date: 1 });
    if (req.query.format === 'csv') {
      const lines = ['日期,动作,类型,组号,重量(kg),次数,热身,RPE,训练时长(秒),备注'];
      for (const w of workouts) {
        w.sets.forEach((s, i) => {
          lines.push(`${new Date(w.date).toISOString().split('T')[0]},${w.exercise},${w.type},${i+1},${s.weight||0},${s.reps||0},${s.isWarmup?'是':'否'},${s.rpe||''},${w.duration||0},${w.notes||''}`);
        });
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=fitness_data.csv');
      res.send('\ufeff' + lines.join('\n'));
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename=fitness_data.json');
      res.json(workouts.map(w => ({
        date: new Date(w.date).toISOString().split('T')[0],
        exercise: w.exercise,
        type: w.type,
        sets: w.sets.map((s, i) => ({ set: i+1, weight: s.weight, reps: s.reps, isWarmup: s.isWarmup, rpe: s.rpe })),
        duration: w.duration,
        notes: w.notes,
      })));
    }
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// ─── 多周训练计划 ─────────────────────────────────────────────────────────────

// GET /api/workouts/training-plans
router.get('/training-plans', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user?.trainingPlans || []);
  } catch { res.status(500).send('Server Error'); }
});

// POST /api/workouts/training-plans — 创建多周计划
router.post('/training-plans', auth, async (req, res) => {
  const { name, weeks, schedule } = req.body;
  if (!name || !weeks || !schedule) return res.status(400).json({ msg: 'Missing fields' });
  try {
    const user = await User.findById(req.user.id);
    user.trainingPlans.push({
      name,
      weeks: parseInt(weeks),
      startDate: new Date(),
      schedule, // [{ week: 0, dayOfWeek: 1, templateId: '...', label: '推日' }, ...]
      isActive: true,
    });
    await user.save();
    res.json(user.trainingPlans);
  } catch { res.status(500).send('Server Error'); }
});

// PUT /api/workouts/training-plans/:planId — 更新计划
router.put('/training-plans/:planId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const plan = user.trainingPlans.id(req.params.planId);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    const { name, weeks, schedule, isActive } = req.body;
    if (name) plan.name = name;
    if (weeks) plan.weeks = parseInt(weeks);
    if (schedule) plan.schedule = schedule;
    if (isActive !== undefined) plan.isActive = isActive;
    await user.save();
    res.json(user.trainingPlans);
  } catch { res.status(500).send('Server Error'); }
});

// DELETE /api/workouts/training-plans/:planId
router.delete('/training-plans/:planId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.trainingPlans = user.trainingPlans.filter(p => p._id.toString() !== req.params.planId);
    await user.save();
    res.json(user.trainingPlans);
  } catch { res.status(500).send('Server Error'); }
});

// GET /api/workouts/training-plans/:planId/week/:weekNum — 获取指定周的训练安排
router.get('/training-plans/:planId/week/:weekNum', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const plan = user.trainingPlans.id(req.params.planId);
    if (!plan) return res.status(404).json({ msg: 'Plan not found' });
    const weekNum = parseInt(req.params.weekNum);
    const weekSchedule = plan.schedule.filter(s => s.week === weekNum);
    // 填充模板信息
    const enriched = weekSchedule.map(s => {
      const tmpl = user.templates.id(s.templateId);
      return { ...s.toObject(), template: tmpl || null };
    });
    res.json({ planName: plan.name, week: weekNum, totalWeeks: plan.weeks, schedule: enriched });
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

// ─── 动作替代建议 ─────────────────────────────────────────────────────────────

// GET /api/workouts/alternatives/:exercise — 获取同肌群替代动作
router.get('/alternatives/:exercise', auth, async (req, res) => {
  try {
    const exerciseName = decodeURIComponent(req.params.exercise);
    const targetMuscles = EXERCISE_MUSCLE_MAP[exerciseName] || [];
    if (!targetMuscles.length) return res.json([]);

    // 找到所有共享至少一个肌群的动作（排除自身）
    const alternatives = [];
    for (const [ex, muscles] of Object.entries(EXERCISE_MUSCLE_MAP)) {
      if (ex === exerciseName) continue;
      const overlap = muscles.filter(m => targetMuscles.includes(m));
      if (overlap.length > 0) {
        const score = overlap.length;
        alternatives.push({ exercise: ex, muscles: overlap, score });
      }
    }
    // 按共享肌群数排序，取前8个
    alternatives.sort((a, b) => b.score - a.score);
    res.json(alternatives.slice(0, 8).map(a => ({ exercise: a.exercise, muscles: a.muscles })));
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// ─── 日历详情 ─────────────────────────────────────────────────────────────────

// GET /api/workouts/day/:date — 获取某天的训练摘要
router.get('/day/:date', auth, async (req, res) => {
  try {
    const dateStr = req.params.date; // YYYY-MM-DD
    const start = new Date(dateStr + 'T00:00:00');
    const end = new Date(start.getTime() + 86400000);
    const workouts = await Workout.find({
      user: req.user.id,
      date: { $gte: start, $lt: end },
    }).sort({ createdAt: 1 });
    if (!workouts.length) return res.json({ date: dateStr, exercises: [], totalVolume: 0, totalDuration: 0 });

    const totalVolume = workouts.filter(w => w.type === 'strength')
      .reduce((a, w) => a + w.sets.reduce((b, s) => b + (s.weight||0) * (s.reps||0), 0), 0);
    const totalDuration = workouts.reduce((a, w) => a + (w.duration || 0), 0);

    res.json({
      date: dateStr,
      exercises: workouts.map(w => ({
        exercise: w.exercise, type: w.type,
        sets: w.sets.length,
        bestSet: w.type === 'strength'
          ? w.sets.reduce((b, s) => (s.weight||0) * (s.reps||0) > (b.weight||0) * (b.reps||0) ? s : b, w.sets[0] || {})
          : null,
      })),
      totalVolume,
      totalDuration,
      exerciseCount: workouts.length,
    });
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// ─── 体态对比照片 ─────────────────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, '..', 'uploads', 'photos');

const ensureUploadsDir = () => {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    if (err.code === 'EEXIST') return;
    console.warn('[workouts] Unable to prepare uploads directory', err.message);
  }
};

ensureUploadsDir();

// POST /api/workouts/photos — 上传体态照片 (base64)
router.post('/photos', auth, async (req, res) => {
  try {
    const { image, date, label } = req.body;
    if (!image || !date) return res.status(400).json({ msg: 'Missing fields' });

    // 解析 base64
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ msg: 'Invalid image format' });
    const ext = matches[1];
    const data = matches[2];
    const filename = `${req.user.id}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    try {
      fs.writeFileSync(filepath, Buffer.from(data, 'base64'));
    } catch (err) {
      console.warn('[workouts] Failed to save progress photo', err.message);
      return res.status(500).json({ msg: 'Unable to save photo' });
    }

    const user = await User.findById(req.user.id);
    const url = `/uploads/photos/${filename}`;
    user.progressPhotos.push({ date, url, label: label || '' });
    user.progressPhotos.sort((a, b) => new Date(b.date) - new Date(a.date));
    // 最多保留50张
    if (user.progressPhotos.length > 50) user.progressPhotos = user.progressPhotos.slice(0, 50);
    await user.save();
    res.json(user.progressPhotos);
  } catch (e) { console.error(e); res.status(500).send('Server Error'); }
});

// GET /api/workouts/photos — 获取照片列表
router.get('/photos', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user?.progressPhotos || []);
  } catch { res.status(500).send('Server Error'); }
});

// DELETE /api/workouts/photos/:photoId — 删除照片
router.delete('/photos/:photoId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const photo = user.progressPhotos.id(req.params.photoId);
    if (photo) {
      // 删除文件
      const filepath = path.join(__dirname, '..', photo.url);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
    user.progressPhotos = user.progressPhotos.filter(p => p._id.toString() !== req.params.photoId);
    await user.save();
    res.json(user.progressPhotos);
  } catch { res.status(500).send('Server Error'); }
});

// ─── 训练提醒设置 ─────────────────────────────────────────────────────────────

// GET /api/workouts/reminder
router.get('/reminder', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user?.reminder || { enabled: false, time: '18:00', days: [] });
  } catch { res.status(500).send('Server Error'); }
});

// PUT /api/workouts/reminder
router.put('/reminder', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { enabled, time, days } = req.body;
    if (!user.reminder) user.reminder = {};
    if (enabled !== undefined) user.reminder.enabled = enabled;
    if (time) user.reminder.time = time;
    if (days) user.reminder.days = days;
    await user.save();
    res.json(user.reminder);
  } catch { res.status(500).send('Server Error'); }
});

module.exports = router;
