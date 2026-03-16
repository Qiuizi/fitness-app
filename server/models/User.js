const mongoose = require('mongoose');

// 体重记录
const BodyWeightEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  weight: { type: Number, required: true },
}, { _id: false });

// 训练模板中的单个动作
const TemplateExerciseSchema = new mongoose.Schema({
  exercise: { type: String, required: true },
  type: { type: String, enum: ['strength', 'cardio'], default: 'strength' },
  sets: [{ weight: Number, reps: Number }],
}, { _id: false });

// 训练模板（用户自定义的"今天练这些"）
const WorkoutTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },       // 如"胸背日"、"腿日"
  exercises: [TemplateExerciseSchema],
  lastUsed: { type: Date },
  useCount: { type: Number, default: 0 },
}, { timestamps: true });

// 周训练计划的某一天
const PlanDaySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true },  // 0=周日, 1=周一 ... 6=周六
  templateId: { type: mongoose.Schema.Types.ObjectId },
  label: { type: String },                      // 如"推 (Chest/Shoulder/Tri)"
  isRestDay: { type: Boolean, default: false },
}, { _id: false });

const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // 身体数据
  bodyWeightLog: { type: [BodyWeightEntrySchema], default: [] },

  // 训练模板
  templates: { type: [WorkoutTemplateSchema], default: [] },

  // 周训练计划
  weeklyPlan: { type: [PlanDaySchema], default: [] },

  // 用户身体数据与偏好
  profile: {
    goal:            { type: String, enum: ['muscle', 'fat_loss', 'strength', 'general'], default: 'general' },
    weeklyFrequency: { type: Number, default: 3 },
    level:           { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    heightCm:        { type: Number },   // 身高 cm
    gender:          { type: String, enum: ['male', 'female', 'other'] },
    age:             { type: Number },   // 年龄
  },

  // streak 保护：每月免死金牌次数（剩余可用次数）
  streakShield: { type: Number, default: 1 },
  streakShieldResetMonth: { type: Number },          // 上次重置的月份

  // 历史最长 streak（不会因断卡归零）
  longestStreak: { type: Number, default: 0 },

  // 成就
  achievements: { type: [String], default: [] },
}, { timestamps: true });

// 密码加密中间件
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 验证密码方法
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
