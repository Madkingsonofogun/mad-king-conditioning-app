import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";
import { hashPassword } from "../src/lib/password";
import { calculateAssessment, evaluateWeeklyCheckIn } from "../src/lib/rules";

const prisma = new PrismaClient();
const levels = ["Recovery", "Baseline", "Progression"];
const sports = ["Boxing", "Kickboxing", "Fight Conditioning", "General Fitness", "Strength"];
const partsByLength: Record<number, string[]> = {
  30: ["Warm-Up", "Mobility", "Strength", "Conditioning", "Cooldown"],
  45: ["Warm-Up", "Skill", "Strength", "Core", "Conditioning", "Cooldown"],
  60: ["Warm-Up", "Skill", "Strength", "Core", "Conditioning", "Finisher", "Cooldown"]
};

async function main() {
  await prisma.workoutSession.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.progressImage.deleteMany();
  await prisma.dailyCheckIn.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.monthlyPlanItem.deleteMany();
  await prisma.monthlyPlan.deleteMany();
  await prisma.coachNote.deleteMany();
  await prisma.weeklyCheckIn.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.scheduledAssessment.deleteMany();
  await prisma.package.deleteMany();
  await prisma.planTemplate.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@madking.local",
      passwordHash: await hashPassword("1234"),
      role: "ADMIN"
    }
  });

  const coach = await prisma.user.create({
    data: {
      name: "Coach Mike",
      email: "coach.mike@madking.local",
      passwordHash: await hashPassword("2468"),
      role: "COACH"
    }
  });

  const exercises = await seedExercises();
  await seedTemplates(exercises);

  const clients = await Promise.all([
    seedClient(coach.id, "CL-001", "Marcus Johnson", "marcus@example.com", "555-0101", "marcus123", "Boxing", "Conditioning", 3, 60, "3-day package", 12, 1, [88, 86, 82, 80, 90, 2], [8, 2, 3, 8, 3, 92, 8], "Likes bag rounds and competition-style timers."),
    seedClient(coach.id, "CL-002", "Tasha Reed", "tasha@example.com", "555-0102", "tasha123", "Kickboxing", "Strength and Conditioning", 4, 60, "4-day package", 16, 1, [76, 72, 78, 74, 80, 3], [7, 3, 4, 7, 4, 85, 7], "Check knee response after jump rope days."),
    seedClient(coach.id, "CL-003", "Diego Santos", "diego@example.com", "555-0103", "diego123", "Fight Conditioning", "Strength", 2, 30, "2-day package", 8, 0, [42, 48, 44, 46, 40, 7], [4, 7, 6, 5, 6, 45, 4], "Keep recovery plan until pain drops below 5.")
  ]);

  for (const client of clients) {
    await seedMonthlyHistory(client.id, client.sportFocus, client.goal, client.trainingDaysPerWeek, client.sessionLength);
  }

  console.log("Seeded Smart Coach database.");
}

async function seedClient(assignedCoachId: string, code: string, name: string, email: string, phone: string, password: string, sportFocus: string, goal: string, days: number, sessionLength: number, packageType: string, purchased: number, used: number, assessment: [number, number, number, number, number, number], checkIn: [number, number, number, number, number, number, number], note: string) {
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "CLIENT" } });
  const client = await prisma.clientProfile.create({
    data: { userId: user.id, assignedCoachId, clientCode: code, clientName: name, phone, email, goal, sportFocus, trainingDaysPerWeek: days, sessionLength, startDate: new Date("2026-05-01"), notes: `Imported from smart coach workbook seed for ${name}.` }
  });
  await prisma.package.create({
    data: { clientId: client.id, packageType, trainingDaysPerWeek: days, sessionsPurchased: purchased, sessionsUsed: used, sessionsRemaining: Math.max(0, purchased - used), amountPaid: days * 200, paymentStatus: "Paid", purchaseDate: new Date("2026-05-01"), expirationDate: new Date("2026-06-30"), status: "Active" }
  });
  const [squatScore, pushUpScore, coreScore, mobilityScore, conditioningScore, painLevel] = assessment;
  await prisma.assessment.create({
    data: { clientId: client.id, assessmentDate: new Date("2026-05-01"), squatScore, pushUpScore, coreScore, mobilityScore, conditioningScore, painLevel, injuryRiskNotes: painLevel >= 7 ? "Pain level requires lower impact training." : "No major limitations.", ...calculateAssessment({ squatScore, pushUpScore, coreScore, mobilityScore, conditioningScore, painLevel }), nextReassessmentDate: new Date("2026-06-01"), coachNotes: "Baseline assessment imported from workbook seed." }
  });
  const [energyScore, painScore, sorenessScore, sleepScore, stressScore, workoutCompletionPercent, performanceScore] = checkIn;
  await prisma.weeklyCheckIn.create({
    data: { clientId: client.id, weekStartDate: new Date("2026-05-11"), energyScore, painScore, sorenessScore, sleepScore, stressScore, workoutCompletionPercent, performanceScore, coachNotes: "Seed check-in based on workbook data.", ...evaluateWeeklyCheckIn({ energyScore, painScore, sorenessScore, sleepScore, stressScore, workoutCompletionPercent, performanceScore }) }
  });
  await prisma.coachNote.createMany({
    data: [
      { clientId: client.id, noteDate: new Date("2026-05-04"), noteType: "Session Note", note, visibleToClient: true },
      { clientId: client.id, noteDate: new Date("2026-05-05"), noteType: "Private Coach Note", note: "Internal coaching cue hidden from the client.", visibleToClient: false }
    ]
  });
  return client;
}

async function seedExercises() {
  const data = sports.flatMap((sportFocus) =>
    levels.flatMap((planLevel) => {
      const difficulty = planLevel === "Recovery" ? "Easy" : planLevel === "Baseline" ? "Medium" : "Hard";
      return [
        exercise(`${sportFocus} Joint Prep`, "Warm-Up", sportFocus, "Conditioning", difficulty, planLevel, "Warm-Up", "2", "", "5 min", "30 sec", true),
        exercise(`${sportFocus} Mobility Flow`, "Mobility", sportFocus, "Return to Training", difficulty, planLevel, "Mobility", "2", "", "6 min", "30 sec", true),
        exercise(`${sportFocus} Skill Rounds`, sportFocus.includes("Kick") ? "Kickboxing Skill" : sportFocus.includes("Box") ? "Boxing Skill" : "Conditioning", sportFocus, "Conditioning", difficulty, planLevel, "Skill", "3", "2 min", "", "60 sec", planLevel === "Recovery"),
        exercise(`${sportFocus} Strength Circuit`, "Strength", sportFocus, "Strength", difficulty, planLevel, "Strength", "3", "8", "", "75 sec", planLevel === "Recovery"),
        exercise(`${sportFocus} Core Series`, "Core", sportFocus, "Strength and Conditioning", difficulty, planLevel, "Core", "3", "12", "", "45 sec", planLevel === "Recovery"),
        exercise(`${sportFocus} Conditioning Intervals`, "Conditioning", sportFocus, "Conditioning", difficulty, planLevel, "Conditioning", "4", "", "45 sec", planLevel === "Progression" ? "30 sec" : "60 sec", planLevel === "Recovery"),
        exercise(`${sportFocus} Finisher`, "Finisher", sportFocus, "Weight Loss", difficulty, planLevel, "Finisher", "3", "", "60 sec", "45 sec", planLevel === "Recovery"),
        exercise(`${sportFocus} Cooldown Breathing`, "Cooldown", sportFocus, "Recovery", "Easy", planLevel, "Cooldown", "1", "", "5 min", "", true)
      ];
    })
  );
  return prisma.exercise.createManyAndReturn({ data });
}

function exercise(exerciseName: string, category: string, sportFocus: string, goal: string, difficulty: string, planLevel: string, sessionPart: string, sets: string, reps: string, time: string, rest: string, lowImpact: boolean) {
  return { exerciseName, category, sportFocus, goal, difficulty, planLevel, sessionPart, equipment: "Bodyweight, gloves, bag, mat, dumbbells", bodyArea: category === "Core" ? "Core" : category === "Strength" ? "Full Body" : "Total Body", lowImpact, sets, reps, time, rest, description: describeExercise(exerciseName, category, sportFocus, planLevel, sessionPart), progression: "Add one round, use harder variation, or shorten rest.", regression: "Lower impact, remove a round, or extend rest.", coachingNotes: "Keep technique clean and adjust intensity to recovery." };
}

function describeExercise(exerciseName: string, category: string, sportFocus: string, planLevel: string, sessionPart: string) {
  const intensity = planLevel === "Recovery" ? "Keep the pace easy and controlled." : planLevel === "Baseline" ? "Work at a steady training pace with clean form." : "Work with sharper intent while keeping technique crisp.";
  if (sessionPart === "Warm-Up") return `Start tall with relaxed shoulders and light footwork. Move through ${exerciseName} gradually, increasing range of motion each minute. Keep breathing steady, stay loose, and finish feeling warm rather than tired. ${intensity}`;
  if (sessionPart === "Mobility") return `Move slowly through the full comfortable range. Pause briefly where you feel stiffness, breathe out, and avoid forcing painful positions. Keep ribs down, hips controlled, and transitions smooth. ${intensity}`;
  if (sessionPart === "Skill") return `Set your stance first, hands high, chin tucked, and eyes forward. Perform each ${sportFocus} skill rep with balance before speed. Reset your feet after each combination, breathe on strikes or movement, and keep defense tight between reps. ${intensity}`;
  if (sessionPart === "Strength") return `Brace your core before each rep, keep joints stacked, and move with control on the lowering phase. Drive through the floor on the working phase, stop before form breaks, and rest long enough to repeat quality reps. ${intensity}`;
  if (sessionPart === "Core") return `Set your ribs down, squeeze glutes lightly, and keep your lower back from arching. Move slowly, breathe through the effort, and stop the set if you feel the work shift out of your core. ${intensity}`;
  if (sessionPart === "Conditioning") return `Work in clear intervals. Start each round with good posture, keep your breathing rhythmic, and maintain repeatable output instead of sprinting too early. Recover during the rest period so the next round stays sharp. ${intensity}`;
  if (sessionPart === "Finisher") return `Treat this as the final push without losing mechanics. Keep movements simple, stay balanced, and choose a pace you can hold through the last interval. Reduce impact immediately if pain or sloppy form shows up. ${intensity}`;
  if (sessionPart === "Cooldown") return `Bring your heart rate down with slow nasal breathing and relaxed posture. Move gently, stretch only to mild tension, and use the final minute to check pain, fatigue, and recovery notes.`;
  return `Perform ${exerciseName} with controlled form, steady breathing, and attention to pain-free movement. ${intensity}`;
}

async function seedTemplates(exercises: Awaited<ReturnType<typeof seedExercises>>) {
  const combos = [
    ...[2, 3, 4, 5].flatMap((days) => [30, 45, 60].flatMap((length) => levels.map((level) => ({ days, length, level, sport: "General Fitness", goal: "Conditioning" })))),
    ...levels.map((level) => ({ days: 3, length: 60, level, sport: "Boxing", goal: "Conditioning" })),
    ...levels.map((level) => ({ days: 4, length: 60, level, sport: "Kickboxing", goal: "Strength and Conditioning" })),
    ...levels.map((level) => ({ days: 2, length: 30, level, sport: "Fight Conditioning", goal: "Strength" }))
  ];
  for (const combo of combos) {
    for (let week = 1; week <= 4; week++) {
      for (let day = 1; day <= combo.days; day++) {
        for (const part of partsByLength[combo.length]) {
          const match = exercises.find((e) => e.sportFocus === combo.sport && e.planLevel === combo.level && e.sessionPart === part) ?? exercises.find((e) => e.sportFocus === "General Fitness" && e.planLevel === combo.level && e.sessionPart === part)!;
          await prisma.planTemplate.create({ data: { templateName: `${combo.days}-day ${combo.level} ${combo.length}-minute ${combo.sport}`, sportFocus: combo.sport, goal: combo.goal, planLevel: combo.level, trainingDaysPerWeek: combo.days, sessionLength: combo.length, week, day, sessionPart: part, exerciseId: match.id, exerciseName: match.exerciseName, sets: match.sets, reps: match.reps, time: match.time, rest: match.rest, coachingNotes: match.coachingNotes } });
        }
      }
    }
  }
}

async function seedMonthlyHistory(clientId: string, sportFocus: string, goal: string, days: number, sessionLength: number) {
  const assessment = await prisma.assessment.findFirstOrThrow({ where: { clientId }, orderBy: { assessmentDate: "desc" } });
  const checkIns = await prisma.weeklyCheckIn.findMany({ where: { clientId }, take: 4 });
  const plan = await prisma.monthlyPlan.create({ data: { clientId, month: 5, year: 2026, planLevel: assessment.planLevel, planStatus: "Active", generatedFromAssessmentId: assessment.id, generatedFromCheckInIds: JSON.stringify(checkIns.map((c) => c.id)), coachApproved: true, coachApprovedDate: new Date("2026-05-02"), notes: "Approved seed plan." } });
  const templates = await prisma.planTemplate.findMany({ where: { sportFocus, goal, planLevel: assessment.planLevel, trainingDaysPerWeek: days, sessionLength }, orderBy: [{ week: "asc" }, { day: "asc" }, { sessionPart: "asc" }] });
  const fallback = templates.length ? templates : await prisma.planTemplate.findMany({ where: { sportFocus: "General Fitness", planLevel: assessment.planLevel, trainingDaysPerWeek: days, sessionLength }, orderBy: [{ week: "asc" }, { day: "asc" }, { sessionPart: "asc" }] });
  await prisma.monthlyPlanItem.createMany({ data: fallback.map((template) => ({ monthlyPlanId: plan.id, clientId, week: template.week, day: template.day, sessionDate: addDays(new Date("2026-05-01"), (template.week - 1) * 7 + template.day - 1), sessionLength, sportFocus, goal, planLevel: assessment.planLevel, sessionPart: template.sessionPart, exerciseId: template.exerciseId, exerciseName: template.exerciseName, sets: template.sets, reps: template.reps, time: template.time, rest: template.rest, coachNotes: template.coachingNotes })) });
  await prisma.monthlyPlan.create({ data: { clientId, month: 4, year: 2026, planLevel: "Baseline", planStatus: "Archived", coachApproved: true, coachApprovedDate: new Date("2026-04-02"), notes: "Archived historical plan retained for history." } });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
