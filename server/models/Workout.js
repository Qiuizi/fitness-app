const mongoose = require('mongoose');

const WorkoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  exercise: { type: String, required: true },
  // 'strength' | 'cardio' — 明确区分训练类型，不再依赖关键词判断
  type: { type: String, enum: ['strength', 'cardio'], default: 'strength' },
  sets: [{
    weight: Number,  // 力量: kg；有氧: 时长(分钟)
    reps: Number,    // 力量: 次数；有氧: 卡路里
    isWarmup: { type: Boolean, default: false },  // 是否热身组
    rpe: { type: Number, min: 1, max: 10 },       // RPE 自觉疲劳度评分 (1-10)
    setType: { type: String, enum: ['normal', 'superset', 'dropset'], default: 'normal' },  // 组类型
  }],
  notes: String,
  duration: { type: Number, default: 0 },  // 该动作完成用时(秒)
}, { timestamps: true });

module.exports = mongoose.model('Workout', WorkoutSchema);
