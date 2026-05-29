import { addDays, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { choosePlanLevel, workoutDaysFromPackage } from "@/lib/rules";

export async function generateMonthlyPlan(clientId: string, month: number, year: number) {
  const client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    include: {
      assessments: { orderBy: { assessmentDate: "desc" }, take: 1 },
      weeklyCheckIns: { orderBy: { weekStartDate: "desc" }, take: 4 },
      packages: { where: { status: "Active" }, orderBy: { purchaseDate: "desc" }, take: 1 },
      monthlyPlans: { orderBy: { generatedDate: "desc" }, take: 1 }
    }
  });

  if (!client) throw new Error("Client not found.");
  const pkg = client.packages[0];
  const trainingDaysPerWeek = workoutDaysFromPackage(pkg?.trainingDaysPerWeek ?? client.trainingDaysPerWeek);
  const sessionLength = client.sessionLength;
  const previousPlan = client.monthlyPlans[0];
  const latestAssessment = client.assessments[0];
  const planLevel = choosePlanLevel({
    latestAssessmentLevel: latestAssessment?.planLevel,
    previousPlanLevel: previousPlan?.planLevel,
    checkIns: client.weeklyCheckIns
  });

  const templates = await findTemplates({
    sportFocus: client.sportFocus,
    goal: client.goal,
    planLevel,
    trainingDaysPerWeek,
    sessionLength
  });

  if (templates.length === 0) {
    throw new Error(
      `Missing template for ${client.sportFocus}, ${client.goal}, ${planLevel}, ${trainingDaysPerWeek} days, ${sessionLength} minutes.`
    );
  }

  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  return prisma.$transaction(async (tx) => {
    const plan = await tx.monthlyPlan.create({
      data: {
        clientId,
        month,
        year,
        planLevel,
        planStatus: "Draft",
        generatedFromAssessmentId: latestAssessment?.id,
        generatedFromCheckInIds: JSON.stringify(client.weeklyCheckIns.map((checkIn) => checkIn.id)),
        notes: `Generated from latest assessment and ${client.weeklyCheckIns.length} recent check-ins.`
      }
    });

    await tx.monthlyPlanItem.createMany({
      data: templates.map((template) => ({
        monthlyPlanId: plan.id,
        clientId,
        week: template.week,
        day: template.day,
        sessionDate: addDays(monthStart, (template.week - 1) * 7 + (template.day - 1) * Math.max(1, Math.floor(7 / trainingDaysPerWeek))),
        sessionLength,
        sportFocus: client.sportFocus,
        goal: client.goal,
        planLevel,
        sessionPart: template.sessionPart,
        exerciseId: template.exerciseId,
        exerciseName: template.exerciseName,
        sets: template.sets,
        reps: template.reps,
        time: template.time,
        rest: template.rest,
        coachNotes: template.coachingNotes
      }))
    });

    return tx.monthlyPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { items: { orderBy: [{ week: "asc" }, { day: "asc" }, { sessionPart: "asc" }] } }
    });
  });
}

async function findTemplates(input: {
  sportFocus: string;
  goal: string;
  planLevel: string;
  trainingDaysPerWeek: number;
  sessionLength: number;
}) {
  const attempts = [
    {
      sportFocus: input.sportFocus,
      goal: input.goal,
      planLevel: input.planLevel,
      trainingDaysPerWeek: input.trainingDaysPerWeek,
      sessionLength: input.sessionLength
    },
    {
      sportFocus: input.sportFocus,
      planLevel: input.planLevel,
      trainingDaysPerWeek: input.trainingDaysPerWeek,
      sessionLength: input.sessionLength
    },
    {
      sportFocus: "General Fitness",
      planLevel: input.planLevel,
      trainingDaysPerWeek: input.trainingDaysPerWeek,
      sessionLength: input.sessionLength
    },
    {
      sportFocus: "General Fitness",
      planLevel: "Baseline",
      trainingDaysPerWeek: input.trainingDaysPerWeek,
      sessionLength: input.sessionLength
    }
  ];

  for (const where of attempts) {
    const templates = await prisma.planTemplate.findMany({
      where,
      orderBy: [{ week: "asc" }, { day: "asc" }, { sessionPart: "asc" }]
    });
    if (templates.length > 0) return templates;
  }

  return [];
}

export async function approveMonthlyPlan(planId: string) {
  const plan = await prisma.monthlyPlan.findUniqueOrThrow({ where: { id: planId } });
  return prisma.$transaction(async (tx) => {
    await tx.monthlyPlan.updateMany({
      where: { clientId: plan.clientId, planStatus: "Active", id: { not: plan.id } },
      data: { planStatus: "Completed" }
    });
    return tx.monthlyPlan.update({
      where: { id: planId },
      data: { planStatus: "Active", coachApproved: true, coachApprovedDate: new Date() }
    });
  });
}

