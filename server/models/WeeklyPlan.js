const mongoose = require('mongoose');

const WeeklyPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  goal: { type: String, enum: ['strength', 'hypertrophy', 'maintain'], required: true },
  availableDays: [{ type: Number, min: 0, max: 6 }],
  weekOfCycle: { type: Number, default: 1, min: 1, max: 4 },
  isActive: { type: Boolean, default: true },
  days: [{
    day: Number,
    dayLabel: String,
    type: String,
    exercises: [{
      exercise: String,
      muscles: [String],
      role: String,
      label: String,
      sets: Number,
      reps: Number,
      weight: Number,
      reason: String,
      rule: String,
    }],
  }],
}, { timestamps: true });

WeeklyPlanSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('WeeklyPlan', WeeklyPlanSchema);
