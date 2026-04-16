// Epley 1RM formula. reps=1 → returns weight. reps>12 becomes unreliable.
const epley = (weight, reps) => {
  if (!weight || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 20) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

// Best working set from a sets array (highest e1RM among non-warmup strength sets).
const bestSet = (sets = []) => {
  const candidates = sets.filter(s => !s.isWarmup && s.weight > 0 && s.reps > 0);
  if (!candidates.length) return null;
  let best = candidates[0];
  let bestE = epley(best.weight, best.reps);
  for (const s of candidates) {
    const e = epley(s.weight, s.reps);
    if (e > bestE) { best = s; bestE = e; }
  }
  return { ...best.toObject?.() || best, e1rm: bestE };
};

module.exports = { epley, bestSet };
