export type PlanLevel = "Recovery" | "Baseline" | "Progression";
export type PlanAdjustment = "Make Easier" | "Keep Same" | "Make Harder";
export type ClientLevel = "Recovery" | "Beginner" | "Intermediate" | "Pro";

export function calculateAssessment(input: {
  squatScore: number;
  pushUpScore: number;
  coreScore: number;
  mobilityScore: number;
  conditioningScore: number;
  painLevel: number;
}) {
  const rawAverage =
    (input.squatScore +
      input.pushUpScore +
      input.coreScore +
      input.mobilityScore +
      input.conditioningScore) /
    5;
  const averageScore = rawAverage <= 10 ? rawAverage * 10 : rawAverage;

  if (averageScore < 50 || input.painLevel >= 7) {
    return { averageScore, riskLevel: "High", planLevel: "Recovery" as PlanLevel };
  }

  if (averageScore >= 75 && input.painLevel <= 3) {
    return { averageScore, riskLevel: "Low", planLevel: "Progression" as PlanLevel };
  }

  return { averageScore, riskLevel: "Medium", planLevel: "Baseline" as PlanLevel };
}

export function evaluateWeeklyCheckIn(input: {
  energyScore: number;
  painScore: number;
  sorenessScore?: number;
  sleepScore: number;
  stressScore?: number;
  workoutCompletionPercent: number;
  performanceScore?: number | null;
}) {
  if (input.painScore >= 7 || input.energyScore <= 3 || input.sleepScore <= 3) {
    return { checkInResult: "Poor Recovery", planAdjustment: "Make Easier" as PlanAdjustment };
  }

  if (
    input.energyScore >= 7 &&
    input.painScore <= 3 &&
    input.workoutCompletionPercent >= 80
  ) {
    return { checkInResult: "Strong Week", planAdjustment: "Make Harder" as PlanAdjustment };
  }

  return { checkInResult: "Normal", planAdjustment: "Keep Same" as PlanAdjustment };
}

export function clampSessionsRemaining(purchased: number, used: number) {
  return Math.max(0, purchased - used);
}

export function completePackageSession(pkg: {
  sessionsPurchased: number;
  sessionsUsed: number;
  sessionsRemaining: number;
}) {
  const nextUsed = pkg.sessionsRemaining > 0 ? pkg.sessionsUsed + 1 : pkg.sessionsUsed;
  return {
    sessionsUsed: nextUsed,
    sessionsRemaining: clampSessionsRemaining(pkg.sessionsPurchased, nextUsed)
  };
}

export function workoutDaysFromPackage(trainingDaysPerWeek: number) {
  return Math.min(5, Math.max(2, trainingDaysPerWeek));
}

export function choosePlanLevel(args: {
  latestAssessmentLevel?: string | null;
  previousPlanLevel?: string | null;
  checkIns: Array<{
    energyScore: number;
    painScore: number;
    sorenessScore: number;
    sleepScore: number;
    stressScore: number;
    workoutCompletionPercent: number;
    performanceScore?: number | null;
  }>;
}): PlanLevel {
  const current = normalizePlanLevel(args.previousPlanLevel || args.latestAssessmentLevel || "Baseline");
  if (args.checkIns.length === 0) return current;

  const strong = args.checkIns.filter(
    (c) =>
      c.energyScore >= 7 &&
      c.painScore <= 3 &&
      c.sleepScore >= 7 &&
      c.sorenessScore <= 4 &&
      c.stressScore <= 4 &&
      c.workoutCompletionPercent >= 80 &&
      (c.performanceScore ?? 7) >= 7
  ).length;

  const poor = args.checkIns.filter(
    (c) =>
      c.painScore >= 7 ||
      c.energyScore <= 3 ||
      c.sleepScore <= 3 ||
      c.sorenessScore >= 8 ||
      c.stressScore >= 8 ||
      c.workoutCompletionPercent < 50
  ).length;

  if (poor >= Math.ceil(args.checkIns.length / 2)) return easier(current);
  if (strong >= Math.ceil(args.checkIns.length / 2)) return harder(current);
  return current;
}

export function harder(level: PlanLevel): PlanLevel {
  if (level === "Recovery") return "Baseline";
  if (level === "Baseline") return "Progression";
  return "Progression";
}

export function easier(level: PlanLevel): PlanLevel {
  if (level === "Progression") return "Baseline";
  if (level === "Baseline") return "Recovery";
  return "Recovery";
}

export function normalizePlanLevel(value: string): PlanLevel {
  if (value === "Recovery" || value === "Progression") return value;
  return "Baseline";
}

export function activePlanVisible(plan: { planStatus: string; coachApproved: boolean }) {
  return plan.planStatus === "Active" && plan.coachApproved;
}

export function coachNeedsCurrentMonthPrompt(plans: Array<{ month: number; year: number; planStatus: string }>, date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return !plans.some((plan) => plan.month === month && plan.year === year && plan.planStatus === "Active");
}

export function assessmentStartingRecommendation(input: {
  clientName: string;
  sportFocus: string;
  goal: string;
  trainingDaysPerWeek: number;
  sessionLength: number;
  packageType?: string | null;
  planLevel: string;
  riskLevel: string;
  averageScore: number;
  movementFocus?: string | null;
}) {
  const safety =
    input.planLevel === "Recovery"
      ? "Start with lower impact work, mobility, technique, and controlled conditioning before increasing volume."
      : input.planLevel === "Progression"
        ? "Start with a progression plan and allow the coach to push volume or intensity when check-ins stay strong."
        : "Start with a baseline plan focused on clean movement, skill quality, strength basics, and steady conditioning.";

  return `${input.clientName} should start at ${input.planLevel} level for ${input.sportFocus} / ${input.goal}. ` +
    `Use ${input.trainingDaysPerWeek} training days per week, ${input.sessionLength}-minute sessions, from ${input.packageType ?? "the active package"}. ` +
    `Assessment average: ${input.averageScore.toFixed(1)}, risk: ${input.riskLevel}. ` +
    `${input.movementFocus ? `Movement focus: ${input.movementFocus}. ` : ""}${safety}`;
}

export function checkInWorkoutAdjustmentNote(adjustment: PlanAdjustment) {
  if (adjustment === "Make Easier") {
    return "Check-in flagged poor recovery. Make upcoming workouts less intense: lower volume, lower impact, longer rest, more mobility/recovery work, and stop before pain increases.";
  }
  if (adjustment === "Make Harder") {
    return "Check-in was strong. Coach may make upcoming workouts harder: add controlled volume, harder exercise options, more rounds, or slightly shorter rest while keeping form sharp.";
  }
  return "Check-in was normal. Keep upcoming workouts at the same level and make only small exercise rotations if needed.";
}

export function evaluateDailyCheckIn(input: {
  feelsGood: boolean;
  energyScore: number;
  sorenessScore: number;
  injuredOrSick: boolean;
  painArea?: string | null;
}) {
  if (input.injuredOrSick) {
    return {
      adjustment: "Recovery",
      note: "Switch today's workout to recovery: mobility, breathing, stretching, low-impact movement, and stop anything that increases symptoms."
    };
  }

  if (input.painArea) {
    return {
      adjustment: "Pain Area Swap",
      note: `Avoid exercises that stress ${input.painArea}. Use safer low-impact alternatives and keep all movement pain-free today.`
    };
  }

  if (input.sorenessScore >= 7) {
    return {
      adjustment: "Lighter Alternatives",
      note: "Use lighter or lower-impact alternatives today. Reduce load, choose simpler movements, and increase rest."
    };
  }

  if (input.energyScore <= 4) {
    return {
      adjustment: "Reduce Intensity",
      note: "Reduce today's intensity or volume: fewer rounds, lighter weight, slower pace, and longer rest."
    };
  }

  return {
    adjustment: input.feelsGood ? "As Planned" : "Keep Same",
    note: "Keep today's workout as planned. Focus on clean form and good pacing."
  };
}

export function levelFromScore(score: number): ClientLevel {
  if (score <= 39) return "Recovery";
  if (score <= 59) return "Beginner";
  if (score <= 79) return "Intermediate";
  return "Pro";
}

export function clientLevelToPlanLevel(level: string): PlanLevel {
  if (level === "Recovery") return "Recovery";
  if (level === "Pro") return "Progression";
  return "Baseline";
}

const levelOrder: ClientLevel[] = ["Recovery", "Beginner", "Intermediate", "Pro"];

export function reassessmentLevel(input: {
  score: number;
  injuryOrSickness: boolean;
  seriousPain: boolean;
  workoutCompletionPercent: number;
  recoveryScore: number;
  sorenessScore: number;
  energyScore: number;
  previousLevel?: string | null;
  manualOverride?: string | null;
}) {
  if (input.manualOverride && levelOrder.includes(input.manualOverride as ClientLevel)) {
    return input.manualOverride as ClientLevel;
  }

  if (input.injuryOrSickness || input.seriousPain) return "Recovery" as ClientLevel;

  let level = levelFromScore(input.score);
  const poor = input.workoutCompletionPercent < 50 || input.recoveryScore <= 3 || input.sorenessScore >= 8;
  const strong = input.workoutCompletionPercent >= 80 && input.recoveryScore >= 7 && input.energyScore >= 7 && input.sorenessScore <= 4;

  if (poor) level = levelOrder[Math.max(0, levelOrder.indexOf(level) - 1)];
  if (strong) level = levelOrder[Math.min(levelOrder.length - 1, levelOrder.indexOf(level) + 1)];

  if (input.previousLevel && levelOrder.includes(input.previousLevel as ClientLevel)) {
    const previousIndex = levelOrder.indexOf(input.previousLevel as ClientLevel);
    const nextIndex = levelOrder.indexOf(level);
    if (nextIndex > previousIndex + 1) return levelOrder[previousIndex + 1];
  }

  return level;
}

export function reassessmentMonthlyPlanNote(level: ClientLevel) {
  if (level === "Recovery") return "Reassessment moved client to Recovery. Update monthly plan with recovery work, mobility, stretching, low-impact movements, safer alternatives, and less intensity.";
  if (level === "Beginner") return "Reassessment moved client to Beginner. Update monthly plan with simpler exercises, basic movement patterns, lower intensity, more rest, and clear instructions.";
  if (level === "Intermediate") return "Reassessment moved client to Intermediate. Update monthly plan with moderate workouts, steady progressions, balanced strength, and conditioning.";
  return "Reassessment moved client to Pro. Update monthly plan with harder progressions, higher intensity, more volume, and more challenging conditioning while progressing safely.";
}
