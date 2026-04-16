/**
 * AI 路由 — 基于 OpenRouter API（免费，支持多种模型）
 * 模型：Qwen/Qwen2.5-72B-Instruct（免费额度充足）
 * 文档：https://openrouter.ai/docs
 *
 * 若未配置 OPENROUTER_API_KEY，返回降级的本地建议（不报错）
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const Workout = require('../models/Workout');
const User    = require('../models/User');
const router  = express.Router();

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct:free';

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

// ─── OpenRouter 调用封装 ────────────────────────────────────────────────────
const callAI = async (messages, temperature = 0.7) => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null; // 未配置key，降级处理

  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://fittrack.app',
      'X-Title': 'FitTrack',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    console.error('OpenRouter API error:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
};

// ─── 卡路里估算工具（MET 法 + 食物类比） ──────────────────────────────────────

// MET (Metabolic Equivalent of Task) 值
// 来源：美国运动医学会（ACSM）标准数据
const MET_TABLE = {
  // 高强度有氧
  '跑步': 11.0, '快跑': 14.0, '跳绳': 12.0,
  '游泳': 8.0, '爬楼梯': 9.0, 'HIIT': 11.0,
  '波比跳': 11.5, '战绳': 12.5, '跳箱': 11.0,
  
  // 中等强度有氧
  '动感单车': 8.5, '划船机': 7.0, '椭圆机': 5.0,
  '快走': 5.5, '登山机': 8.5,
  
  // 低强度有氧
  '散步': 3.5, '瑜伽': 3.0, '拉伸': 2.5,
  
  // 力量训练（基于肌群和复合程度）
  '硬拉': 6.0, '深蹲': 5.5, '前蹲': 5.8,
  '杠铃卧推': 4.5, '哑铃卧推': 4.0, '上斜卧推': 4.5,
  '引体向上': 5.5, '高位下拉': 4.0, '杠铃划船': 4.5,
  '杠铃推举': 4.5, '哑铃肩推': 3.8,
  '杠铃弯举': 3.5, '哑铃弯举': 3.2, '锤式弯举': 3.2,
  '三头绳索下压': 3.5, '仰卧臂屈伸': 3.5,
  '腿举': 5.0, '腿屈伸': 3.5, '腿弯举': 3.8,
  '罗马尼亚硬拉': 5.5, '臀桥': 3.0,
  '卷腹': 3.5, '平板支撑': 4.0, '悬垂举腿': 4.5,
  
  // 自重训练
  '俯卧撑': 4.5, '钻石俯卧撑': 5.0, '双杠臂屈伸': 5.5,
  '自重深蹲': 4.0, '弓步蹲': 4.5, '保加利亚分腿蹲': 4.8,
  
  'default_strength': 4.0,
  'default_cardio': 6.0,
};

// 食物卡路里类比（中国常见食物，更直观）
const FOOD_EQUIVALENTS = [
  { calories: 30,  equivalent: '≈ 1个茶叶蛋' },
  { calories: 50,  equivalent: '≈ 1个小笼包' },
  { calories: 80,  equivalent: '≈ 1根油条' },
  { calories: 100, equivalent: '≈ 1杯豆浆（无糖）' },
  { calories: 120, equivalent: '≈ 1个肉包' },
  { calories: 150, equivalent: '≈ 1碗稀饭' },
  { calories: 180, equivalent: '≈ 1碗米饭（150g）' },
  { calories: 200, equivalent: '≈ 1个烧饼' },
  { calories: 220, equivalent: '≈ 1碗汤面' },
  { calories: 250, equivalent: '≈ 1个鸡腿（带皮）' },
  { calories: 280, equivalent: '≈ 1碗炒饭' },
  { calories: 300, equivalent: '≈ 1份凉皮' },
  { calories: 350, equivalent: '≈ 1个肉夹馍' },
  { calories: 400, equivalent: '≈ 1碗牛肉拉面' },
  { calories: 450, equivalent: '≈ 1份炒米粉' },
  { calories: 500, equivalent: '≈ 1份蛋炒饭' },
  { calories: 550, equivalent: '≈ 1个巨无霸套餐' },
  { calories: 600, equivalent: '≈ 1份披萨（3片）' },
  { calories: 700, equivalent: '≈ 1份盖浇饭' },
  { calories: 800, equivalent: '≈ 1份烤鸭套餐' },
  { calories: 1000, equivalent: '≈ 一天基础代谢的1/3' },
];

/**
 * 查找最接近的食物类比
 */
const getFoodEquivalent = (calories) => {
  if (calories <= 0) return '';
  
  // 找到最接近的食物
  let closest = FOOD_EQUIVALENTS[0];
  let minDiff = Math.abs(calories - closest.calories);
  
  for (const food of FOOD_EQUIVALENTS) {
    const diff = Math.abs(calories - food.calories);
    if (diff < minDiff) {
      minDiff = diff;
      closest = food;
    }
  }
  
  // 如果差距小于30%，直接返回
  if (minDiff / closest.calories < 0.3) {
    return closest.equivalent;
  }
  
  // 差距较大时，用倍数描述
  if (calories <= 180) {
    const count = (calories / 180).toFixed(1);
    return `≈ ${count}碗米饭`;
  } else if (calories <= 300) {
    const count = (calories / 250).toFixed(1);
    return `≈ ${count}个鸡腿`;
  } else if (calories <= 500) {
    const count = (calories / 180).toFixed(1);
    return `≈ ${count}碗米饭`;
  } else {
    const count = (calories / 600).toFixed(1);
    return `≈ ${count}份披萨`;
  }
};

/**
 * 计算卡路里消耗
 * 公式：Calories = MET × 体重(kg) × 时间(小时)
 * 
 * 对于力量训练：
 * - 每组实际运动约 30-45秒
 * - 组间休息 60-120秒
 * - 每组总计约 2-2.5分钟
 */
const estimateCalories = (exercise, type, sets, weightKg = 70) => {
  // 获取 MET 值
  const met = MET_TABLE[exercise] || MET_TABLE.default_strength;
  
  let calories = 0;
  
  if (type === 'cardio') {
    // 有氧运动：weight 字段存储时长（分钟）
    const mins = sets.reduce((a, s) => a + (s.weight || 0), 0);
    if (mins > 0) {
      calories = met * weightKg * (mins / 60);
    }
  } else {
    // 力量训练：按组数和每组时间估算
    const totalSets = sets.length;
    if (totalSets > 0) {
      // 每组约 2.5 分钟（含休息）
      const timeHours = (totalSets * 2.5) / 60;
      
      // 根据重量调整 MET 值（负重量越大，能量消耗越高）
      const avgWeight = sets.reduce((a, s) => a + (s.weight || 0), 0) / totalSets;
      const weightMultiplier = 1 + (avgWeight / 100) * 0.3; // 每增加10kg，MET提升3%
      
      calories = met * weightKg * timeHours * Math.min(weightMultiplier, 1.5);
    }
  }
  
  return Math.round(calories);
};

/**
 * 详细计算每个动作的卡路里并返回详细信息
 */
const calculateDetailedCalories = (exercise, type, sets, weightKg = 70) => {
  const met = MET_TABLE[exercise] || (type === 'cardio' ? MET_TABLE.default_cardio : MET_TABLE.default_strength);
  
  let duration = 0;
  let description = '';
  
  if (type === 'cardio') {
    duration = sets.reduce((a, s) => a + (s.weight || 0), 0);
    description = `${duration}分钟`;
  } else {
    duration = sets.length * 2.5; // 分钟
    description = `${sets.length}组`;
  }
  
  const calories = Math.round(met * weightKg * (duration / 60));
  const foodEquivalent = getFoodEquivalent(calories);
  
  return {
    exercise,
    type,
    sets: sets.length,
    duration: Math.round(duration),
    durationUnit: type === 'cardio' ? '分钟' : '组',
    met,
    calories,
    foodEquivalent,
    description,
  };
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

    const aiReply = await callAI([
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

    const aiPlan = await callAI([
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
// POST /api/ai/calories — 计算本次训练卡路里消耗（带食物类比）
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/calories', auth, async (req, res) => {
  try {
    const { exercises } = req.body; // [{ exercise, type, sets }]
    const user = await User.findById(req.user.id);

    // 获取用户最新体重，如果没有记录则使用默认参考值
    const userWeight = user?.bodyWeightLog?.length
      ? [...user.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight
      : null;
    
    // 如果没有用户体重，使用标准参考体重（基于用户profile估算）
    let bodyWeight = userWeight;
    if (!bodyWeight && user?.profile) {
      // 根据性别和身高估算
      if (user.profile.heightCm && user.profile.gender) {
        if (user.profile.gender === 'male') {
          bodyWeight = user.profile.heightCm - 105; // 男性参考公式
        } else {
          bodyWeight = user.profile.heightCm - 110; // 女性参考公式
        }
      }
    }
    bodyWeight = bodyWeight || 70; // 最终默认值

    // 计算每个动作的详细卡路里
    const results = (exercises || []).map(ex => {
      const detail = calculateDetailedCalories(
        ex.exercise, 
        ex.type, 
        ex.sets || [], 
        bodyWeight
      );
      return detail;
    });

    const total = results.reduce((a, r) => a + r.calories, 0);
    const totalFoodEquivalent = getFoodEquivalent(total);

    res.json({ 
      results, 
      total, 
      totalFoodEquivalent,
      bodyWeight,
      hasUserWeight: !!userWeight,
      summary: {
        mainGain: results.filter(r => r.type === 'strength').reduce((a, r) => a + r.calories, 0),
        cardioBurn: results.filter(r => r.type === 'cardio').reduce((a, r) => a + r.calories, 0),
      },
    });
  } catch (e) {
    console.error('Calories error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ai/status — 检查 AI 是否可用
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/status', auth, (req, res) => {
  res.json({ aiEnabled: !!process.env.OPENROUTER_API_KEY });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ai/plateaus — 检测平台期
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/plateaus', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(90); // 最近90天
    
    if (workouts.length < 8) {
      return res.json({ plateaus: [], message: '数据不足，需要更多训练记录' });
    }
    
    // 按动作分组，分析每个动作的进步情况
    const exerciseProgress = {};
    workouts.forEach(w => {
      if (w.type !== 'strength' || !w.sets?.length) return;
      const maxWeight = Math.max(...w.sets.map(s => s.weight || 0));
      if (!exerciseProgress[w.exercise]) {
        exerciseProgress[w.exercise] = [];
      }
      exerciseProgress[w.exercise].push({
        date: new Date(w.date),
        weight: maxWeight,
      });
    });
    
    // 检测平台期
    const plateaus = [];
    Object.entries(exerciseProgress).forEach(([exercise, records]) => {
      if (records.length < 4) return; // 需要至少4次记录
      
      // 按日期排序
      records.sort((a, b) => a.date - b.date);
      
      // 检查最近几周是否有进步
      const recentWeeks = 6;
      const now = new Date();
      const recentRecords = records.filter(r => 
        (now - r.date) / (1000 * 60 * 60 * 24) < recentWeeks * 7
      );
      
      if (recentRecords.length < 3) return;
      
      const firstWeight = recentRecords[0].weight;
      const lastWeight = recentRecords[recentRecords.length - 1].weight;
      const improvement = ((lastWeight - firstWeight) / firstWeight) * 100;
      
      if (improvement < 2) { // 进步小于2%视为平台期
        const suggestions = [
          '降低重量，增加次数，专注肌肉感受',
          '改变训练顺序，尝试先做这个动作',
          '增加辅助动作，改善薄弱环节',
          '适当休息，让身体恢复',
          '尝试递减组或强迫次数',
        ];
        
        plateaus.push({
          exercise,
          weeksStagnant: recentWeeks,
          currentWeight: lastWeight,
          suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
          targetWeight: lastWeight + 2.5,
        });
      }
    });
    
    res.json({ plateaus, count: plateaus.length });
  } catch (e) {
    console.error('Plateau detection error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ai/predict — 预测进步
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/predict', auth, async (req, res) => {
  try {
    const { targetExercise, targetWeight } = req.body;
    
    const workouts = await Workout.find({ 
      user: req.user.id,
      exercise: targetExercise,
      type: 'strength',
    })
      .sort({ date: -1 })
      .limit(30);
    
    if (workouts.length < 4) {
      return res.json({ 
        prediction: null, 
        message: '数据不足，需要更多训练记录来预测',
      });
    }
    
    // 提取每次训练的最大重量
    const weights = workouts
      .map(w => Math.max(...(w.sets?.map(s => s.weight || 0) || [0])))
      .reverse(); // 从旧到新
    
    // 简单线性回归预测
    const n = weights.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += weights[i];
      sumXY += i * weights[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 预测达到目标重量的周数
    const currentWeight = weights[weights.length - 1];
    const weeklyProgress = slope;
    
    if (weeklyProgress <= 0) {
      return res.json({
        prediction: null,
        currentWeight,
        weeklyProgress: 0,
        message: '目前没有进步趋势，建议先突破平台期',
      });
    }
    
    const weightNeeded = targetWeight - currentWeight;
    const weeksNeeded = Math.ceil(weightNeeded / weeklyProgress);
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + weeksNeeded * 7);
    
    res.json({
      prediction: {
        targetExercise,
        targetWeight,
        currentWeight,
        weeklyProgress: Math.round(weeklyProgress * 10) / 10,
        weeksNeeded: Math.max(1, weeksNeeded),
        predictedDate: predictedDate.toLocaleDateString('zh-CN'),
        confidence: weeklyProgress > 1 ? 'high' : weeklyProgress > 0.5 ? 'medium' : 'low',
      },
    });
  } catch (e) {
    console.error('Prediction error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/ai/insights — 综合智能洞察
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/insights', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(60);
    
    const user = await User.findById(req.user.id);
    const bodyWeight = user?.bodyWeightLog?.length
      ? [...user.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.weight
      : null;
    
    // 分析训练频率
    const last30Days = workouts.filter(w => 
      (Date.now() - new Date(w.date)) / (1000 * 60 * 60 * 24) < 30
    );
    const workoutDays = new Set(last30Days.map(w => toDateStr(w.date))).size;
    const frequencyScore = workoutDays / 30; // 0-1
    
    // 分析训练量趋势
    const weeklyVolume = {};
    workouts.forEach(w => {
      const week = getWeekNumber(new Date(w.date));
      if (!weeklyVolume[week]) weeklyVolume[week] = 0;
      const vol = w.sets?.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0) || 0;
      weeklyVolume[week] += vol;
    });
    
    const weeks = Object.keys(weeklyVolume).sort().slice(-4);
    const volumeTrend = weeks.length >= 2 
      ? (weeklyVolume[weeks[weeks.length-1]] - weeklyVolume[weeks[0]]) / weeklyVolume[weeks[0]] * 100
      : 0;
    
    // 生成洞察
    const insights = [];
    
    if (frequencyScore > 0.6) {
      insights.push({ type: 'success', text: `本月训练 ${workoutDays} 天，超越 80% 用户！`, icon: '🔥' });
    } else if (frequencyScore < 0.3) {
      insights.push({ type: 'warning', text: '本月训练较少，建议保持每周3次以上的习惯', icon: '💪' });
    }
    
    if (volumeTrend > 10) {
      insights.push({ type: 'success', text: `训练量较上月提升 ${Math.round(volumeTrend)}%，进步明显！`, icon: '📈' });
    } else if (volumeTrend < -20) {
      insights.push({ type: 'warning', text: '训练量有所下降，注意保持训练强度', icon: '⚠️' });
    }
    
    if (bodyWeight) {
      const strength = workouts.filter(w => w.type === 'strength').length;
      const ratio = strength / Math.max(1, last30Days.length);
      if (ratio > 0.7) {
        insights.push({ type: 'info', text: `你主要以力量训练为主，配合有氧会更佳`, icon: '💪' });
      }
    }
    
    // 随机激励
    const motiviations = [
      '每一次训练都是更好的自己',
      '坚持就是胜利，你已经比上周更强',
      '健身是唯一付出就一定有回报的事',
      '今天流的汗是明天的肌肉',
    ];
    insights.push({ type: 'motivation', text: motiviations[Math.floor(Math.random() * motiviations.length)], icon: '⭐' });
    
    res.json({ insights, stats: { workoutDays, volumeTrend, frequencyScore: Math.round(frequencyScore * 100) } });
  } catch (e) {
    console.error('Insights error:', e);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// 辅助函数：获取周数
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

module.exports = router;
