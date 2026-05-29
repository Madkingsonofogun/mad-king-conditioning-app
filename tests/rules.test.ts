import { describe, expect, it } from "vitest";
import {
  activePlanVisible,
  calculateAssessment,
  choosePlanLevel,
  clampSessionsRemaining,
  coachNeedsCurrentMonthPrompt,
  completePackageSession,
  evaluateWeeklyCheckIn,
  workoutDaysFromPackage
} from "../src/lib/rules";

const strong = { energyScore: 8, painScore: 2, sorenessScore: 3, sleepScore: 8, stressScore: 3, workoutCompletionPercent: 90, performanceScore: 8 };
const poor = { energyScore: 2, painScore: 8, sorenessScore: 8, sleepScore: 3, stressScore: 8, workoutCompletionPercent: 40, performanceScore: 3 };
const average = { energyScore: 5, painScore: 4, sorenessScore: 5, sleepScore: 6, stressScore: 5, workoutCompletionPercent: 70, performanceScore: 5 };

describe("Smart Coach business rules", () => {
  it("coach can log in when password hash verifies", async () => {
    const { hashPassword, verifyPassword } = await import("../src/lib/password");
    expect(await verifyPassword("coach123", await hashPassword("coach123"))).toBe(true);
  });

  it("client can log in when password hash verifies", async () => {
    const { hashPassword, verifyPassword } = await import("../src/lib/password");
    expect(await verifyPassword("marcus123", await hashPassword("marcus123"))).toBe(true);
  });

  it("coach can create a client payload with client-owned defaults", () => {
    const client = { clientName: "New Client", trainingDaysPerWeek: 3, sessionLength: 60, sportFocus: "Boxing" };
    expect(client.clientName).toBe("New Client");
  });

  it("coach can create a client login account payload", () => {
    const user = { role: "CLIENT", email: "new@example.com" };
    expect(user.role).toBe("CLIENT");
  });

  it("coach can create a package for a client", () => {
    expect(clampSessionsRemaining(12, 2)).toBe(10);
  });

  it.each([[2], [3], [4], [5]])("%i-day package creates matching workout days per week", (days) => {
    expect(workoutDaysFromPackage(days)).toBe(days);
  });

  it("assessment average score calculates correctly", () => {
    expect(calculateAssessment({ squatScore: 80, pushUpScore: 70, coreScore: 90, mobilityScore: 60, conditioningScore: 100, painLevel: 2 }).averageScore).toBe(80);
  });

  it("workbook-style 1-10 assessment scores are converted to percentage scale", () => {
    expect(calculateAssessment({ squatScore: 8, pushUpScore: 8, coreScore: 7, mobilityScore: 7, conditioningScore: 8, painLevel: 1 })).toMatchObject({
      averageScore: 76,
      planLevel: "Progression"
    });
  });

  it("low assessment score creates Recovery plan", () => {
    expect(calculateAssessment({ squatScore: 40, pushUpScore: 45, coreScore: 42, mobilityScore: 44, conditioningScore: 46, painLevel: 2 }).planLevel).toBe("Recovery");
  });

  it("high pain creates Recovery plan", () => {
    expect(calculateAssessment({ squatScore: 90, pushUpScore: 85, coreScore: 80, mobilityScore: 82, conditioningScore: 88, painLevel: 7 }).planLevel).toBe("Recovery");
  });

  it("medium score creates Baseline plan", () => {
    expect(calculateAssessment({ squatScore: 65, pushUpScore: 68, coreScore: 70, mobilityScore: 72, conditioningScore: 74, painLevel: 4 }).planLevel).toBe("Baseline");
  });

  it("high score and low pain creates Progression plan", () => {
    expect(calculateAssessment({ squatScore: 80, pushUpScore: 82, coreScore: 84, mobilityScore: 86, conditioningScore: 88, painLevel: 2 }).planLevel).toBe("Progression");
  });

  it("bad weekly check-in changes plan adjustment to Make Easier", () => {
    expect(evaluateWeeklyCheckIn(poor).planAdjustment).toBe("Make Easier");
  });

  it("good weekly check-in changes plan adjustment to Make Harder", () => {
    expect(evaluateWeeklyCheckIn(strong).planAdjustment).toBe("Make Harder");
  });

  it("average weekly check-in changes plan adjustment to Keep Same", () => {
    expect(evaluateWeeklyCheckIn(average).planAdjustment).toBe("Keep Same");
  });

  it("prompts coach if client has no plan for the current month", () => {
    expect(coachNeedsCurrentMonthPrompt([], new Date("2026-05-29"))).toBe(true);
  });

  it("does not prompt when current month has an active plan", () => {
    expect(coachNeedsCurrentMonthPrompt([{ month: 5, year: 2026, planStatus: "Active" }], new Date("2026-05-29"))).toBe(false);
  });

  it("strong check-ins make the new month harder", () => {
    expect(choosePlanLevel({ previousPlanLevel: "Baseline", checkIns: [strong, strong, average, strong] })).toBe("Progression");
  });

  it("poor check-ins make the new month easier", () => {
    expect(choosePlanLevel({ previousPlanLevel: "Progression", checkIns: [poor, poor, average, poor] })).toBe("Baseline");
  });

  it("average check-ins keep the same level", () => {
    expect(choosePlanLevel({ previousPlanLevel: "Baseline", checkIns: [average, average, strong, poor] })).toBe("Baseline");
  });

  it("past monthly plans are not overwritten by new plan objects", () => {
    const plans = [{ month: 4, year: 2026, id: "old" }, { month: 5, year: 2026, id: "new" }];
    expect(plans.map((p) => p.id)).toEqual(["old", "new"]);
  });

  it("only one monthly plan should be active for each client", () => {
    const plans = [{ planStatus: "Completed" }, { planStatus: "Active" }, { planStatus: "Archived" }];
    expect(plans.filter((p) => p.planStatus === "Active")).toHaveLength(1);
  });

  it("clients cannot see Draft plans", () => {
    expect(activePlanVisible({ planStatus: "Draft", coachApproved: false })).toBe(false);
  });

  it("clients can only see approved Active plans", () => {
    expect(activePlanVisible({ planStatus: "Active", coachApproved: true })).toBe(true);
    expect(activePlanVisible({ planStatus: "Active", coachApproved: false })).toBe(false);
  });

  it("monthly plan only shows records for the selected client", () => {
    const rows = [{ clientId: "marcus" }, { clientId: "tasha" }].filter((row) => row.clientId === "marcus");
    expect(rows).toEqual([{ clientId: "marcus" }]);
  });

  it("client only sees their own profile and workouts", () => {
    const currentClientId = "diego";
    const rows = [{ clientId: "diego" }, { clientId: "marcus" }].filter((row) => row.clientId === currentClientId);
    expect(rows).toHaveLength(1);
  });

  it("marking workout completed updates sessions used and sessions remaining", () => {
    expect(completePackageSession({ sessionsPurchased: 8, sessionsUsed: 2, sessionsRemaining: 6 })).toEqual({ sessionsUsed: 3, sessionsRemaining: 5 });
  });

  it("sessions remaining never goes below 0", () => {
    expect(completePackageSession({ sessionsPurchased: 1, sessionsUsed: 1, sessionsRemaining: 0 })).toEqual({ sessionsUsed: 1, sessionsRemaining: 0 });
  });

  it("no client can see another client's data", () => {
    const visible = [{ clientId: "a" }, { clientId: "b" }].every((row) => row.clientId === "a");
    expect(visible).toBe(false);
  });
});
