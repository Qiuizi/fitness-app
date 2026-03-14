/**
 * AI 路由 — 基于 Groq API（免费，兼容 OpenAI 格式）
 * 模型：llama-3.3-70b-versatile（免费额度：30 RPM / 14400 RPD）
 * 申请免费 Key：https://console.groq.com/keys
 *
 * 若未配置 GROQ_API_KEY，返回降级的本地建议（不报错）
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const Workout = require('../models/Workout');
const User    = require('../models/User');
const router  = express.Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

// ─── Auth ────────────────────────────────────────────────────────────────────
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

// ─── Groq 调用封装 ────────────────────────────────────────────────────────────
const callGroq = async (messages, temperature = 0.7) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null; // 未配置key，降级处理

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    console.error('Groq API error:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
};

// ─── 卡路里估算工具（MET 法） ──────────────────────────────────────────────────
const MET_TABLE = {
  // 有氧
  '跑步': 9.8, '椭圆机': 5.0, '动感单车': 8.5, '划船机': 7.0,
  '跳绳': 12.3, '游泳': 7.0, '爬楼梯': 9.0,
  // 力量（MET值较低，以组数×时间估算）
  '深蹲': 5.0, '硬拉': 6.0, '杠铃卧推': 3.5, '引体向上': 5.0,
  '高位下拉': 3.0, '杠铃划船': 3.5, '腿举': 4.0,
  'default_strength': 3.5,
  'default_cardio': 6.0,
};

/**
 * 力量训练卡路里估算
 * 公式：每组 ≈ 40秒紧张 + 90秒休息 = ~2.2分钟
 * 卡路里 = MET × 体重(kg) × 时间(小时)
 */
const estimateCalories = (exercise, type, sets, weightKg = 70) => {
  const met = MET_TABLE[exercise] || (type === 'cardio' ? MET_TABLE.default_cardio : MET_TABLE.default_strength);

  if (type === 'cardio') {
    // 有氧：weight字段存时长(分钟)
    const mins = sets.reduce((a, s) => a + (s.weight || 0), 0);
    return Math.round(met * weightKg * (mins / 60));
  } else {
    // 力量：按组数估算时间
    const totalSets = sets.length;
    const timeHours = (totalSets * 2.2) / 60; // 每组约2.2分钟（含休息）
    return Math.round(met * weightKg * timeHours);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ai/coach — AI 训练教练（核心功能）
// 根据用户历史数据 + 当前状态，给出个性化建议
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/coach', auth, async (req, res) => {
  try {
    const { question } = req.body; // 用户的具体问题（可选）
    const [workouts, user] = await Promise.all([
      Workout.find({ user: req.user.id }).sort({ date: -1 }).limit(30),
      User.findById(req.user.id),
    ]);

    // 构建用户训练摘要
    const totalWorkouts = workouts.length;
    const recentExercises = [...new Set(workouts.slice(0, 10).map(w => w.exercise))].slice(0, 6);
    const totalVolume = workouts
      .filter(w => w.type === 'strength')
      .reduce((a, w) => a + w.sets.reduce((b, s) => b + s.weight * s.reps, 0), 0);

    const profileInfo = user?.profile ? [
      user.profile.heightCm ? `身高${user.profile.heightCm}cm` : '',
      user.profile.age      ? `${user.profile.age}岁` : '',
      user.profile.gender   ? (user.profile.gender === 'male' ? '男' : user.profile.gender === 'female' ? '女' : '') : '',
      user.profile.goal     ? ({ muscle: '增肌', fat_loss: '减脂', strength: '增力', general: '综合健身' }[user.profile.goal]) : '',
      user.profile.level    ? ({ beginner: '新手', intermediate: '有基础', advanced: '进阶' }[user.profile.level]) : '',
    ].filter(Boolean).join('，') : '未设置';

    const latestBodyWeight = user?.bodyWeightLog?.length
      ? [...user.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight
      : null;

    const systemPrompt = `你是一位专业的私人健身教练，精通力量训练、运动营养和健身规划。
用中文回答，简洁专业，每次回复控制在200字以内。
用户信息：${profileInfo}${latestBodyWeight ? `，当前体重${latestBodyWeight}kg` : ''}
训练数据：共完成${totalWorkouts}次训练，总力量训练量${Math.round(totalVolume/1000)}吨
近期训练动作：${recentExercises.join('、') || '暂无记录'}
请根据以上信息给出针对性建议，不要泛泛而谈。`;

    const userMessage = question || '根据我的训练数据，给我最重要的一条建议。';

    const aiReply = await callGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage },
    ]);

    if (!aiReply) {
      // 降级：本地规则建议
      const fallback = totalWorkouts === 0
        ? '从基础三大项开始：深蹲、卧推、硬拉。每个动作3组×8次，每周3次，坚持12周你会看到明显变化。'
        : totalWorkouts < 10
        ? '训练初期最重要的是建立动作模式。专注于感受目标肌肉发力，而不是追求重量，技术打好基础才能长期进步。'
        : `你已经完成了${totalWorkouts}次训练，保持得很好。建议每6-8周调整一次训练计划，避免平台期。`;
      return res.json({ reply: fallback, fromAI: false });
    }

    res.json({ reply: aiReply, fromAI: true });
  } catch (e) {
    console.error('AI coach error:', e);
    res.status(500).json({ msg: 'AI服务暂时不可用', reply: '抱歉，AI教练暂时不可用，请稍后再试。', fromAI: false });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ai/plan — AI 生成个性化训练计划
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/plan', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const workouts = await Workout.find({ user: req.user.id }).sort({ date: -1 }).limit(20);

    const profile = user?.profile || {};
    const goal = { muscle: '增肌', fat_loss: '减脂', strength: '增力', general: '综合健身' }[profile.goal] || '综合健身';
    const level = { beginner: '新手（训练不足6个月）', intermediate: '有基础（6个月-2年）', advanced: '进阶（2年以上）' }[profile.level] || '新手';
    const freq = profile.weeklyFrequency || 3;
    const weight = user?.bodyWeightLog?.length
      ? [...user.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight
      : null;

    const recentExercises = [...new Set(workouts.slice(0, 15).map(w => w.exercise))];

    const prompt = `请为以下用户生成一份详细的${freq}天/周训练计划：

用户信息：
- 目标：${goal}
- 水平：${level}
- 每周训练：${freq}天
${weight ? `- 体重：${weight}kg` : ''}
${profile.heightCm ? `- 身高：${profile.heightCm}cm` : ''}
${profile.age ? `- 年龄：${profile.age}岁` : ''}
${profile.gender ? `- 性别：${profile.gender === 'male' ? '男' : '女'}` : ''}
近期训练过的动作：${recentExercises.join('、') || '暂无'}

要求：
1. 按天列出训练动作（如：周一-胸部，周三-背部...）
2. 每个动作注明组数×次数和建议重量范围
3. 包含热身和冷身建议
4. 语言简洁，适合直接按照执行
5. 计划要符合该水平用户的能力，不要过难或过简单`;

    const aiPlan = await callGroq([
      { role: 'system', content: '你是专业健身教练，请用中文生成结构清晰的训练计划。' },
      { role: 'user',   content: prompt },
    ], 0.5);

    const fallbackPlan = freq <= 3
      ? `**全身训练计划（每周${freq}天）**\n\n每次训练：\n- 深蹲 4组×8次\n- 杠铃卧推 4组×8次\n- 杠铃划船 4组×8次\n- 哑铃肩推 3组×10次\n- 平板支撑 3组×30秒\n\n休息90秒/组，渐进超负荷：每周尝试增加2.5kg或1-2次。`
      : `**上下肢分化计划（每周${freq}天）**\n\n上肢日：杠铃卧推、引体向上、哑铃飞鸟、杠铃划船\n下肢日：深蹲、罗马尼亚硬拉、腿举、提踵\n\n每个动作4组×8-12次，休息90秒。`;

    res.json({ plan: aiPlan || fallbackPlan, fromAI: !!aiPlan });
  } catch (e) {
    console.error('AI plan error:', e);
    res.status(500).json({ msg: 'AI服务暂时不可用' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ai/calories — 计算本次训练卡路里消耗
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/calories', auth, async (req, res) => {
  try {
    const { exercises } = req.body; // [{ exercise, type, sets }]
    const user = await User.findById(req.user.id);

    const bodyWeight = user?.bodyWeightLog?.length
      ? [...user.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0].weight
      : 70; // 默认70kg

    const results = (exercises || []).map(ex => ({
      exercise: ex.exercise,
      calories: estimateCalories(ex.exercise, ex.type, ex.sets || [], bodyWeight),
    }));

    const total = results.reduce((a, r) => a + r.calories, 0);
    res.json({ results, total, bodyWeight });
  } catch (e) {
    console.error('Calories error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ai/status — 检查 AI 是否可用
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/status', auth, (req, res) => {
  res.json({ aiEnabled: !!process.env.GROQ_API_KEY });
});

module.exports = router;
