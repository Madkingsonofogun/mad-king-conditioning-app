import { requireClient } from "@/lib/auth";
import { getClientVisibleMonthlyPlan } from "@/lib/data-access";
import { PlanLevelBadge } from "@/components/Badges";
import { WorkoutDetailCard } from "@/components/WorkoutDetailCard";
import { prisma } from "@/lib/prisma";

export default async function WorkoutsPage() {
  const { profile } = await requireClient();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const [plan, dailyCheckIn] = await Promise.all([
    getClientVisibleMonthlyPlan(profile.id),
    prisma.dailyCheckIn.findFirst({ where: { clientId: profile.id, checkInDate: { gte: dayStart, lt: dayEnd } }, orderBy: { createdAt: "desc" } })
  ]);
  const alternatives = dailyCheckIn && dailyCheckIn.adjustment !== "As Planned"
    ? await prisma.exercise.findMany({
        where: {
          lowImpact: true,
          planLevel: "Recovery",
          ...(dailyCheckIn.painArea ? { NOT: { bodyArea: { contains: dailyCheckIn.painArea } } } : {})
        },
        take: 30
      })
    : [];

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Workout Guide</h1>
          <p>Use these instructions to train safely when your coach is not with you.</p>
        </div>
      </div>
      {!plan ? <section className="card"><p>No approved active monthly plan yet.</p></section> : (
        <>
          <div className="split"><PlanLevelBadge level={plan.planLevel} /><span className="label">{plan.month}/{plan.year}</span></div>
          {[1, 2, 3, 4, 5].map((day) => {
            const items = plan.items.filter((item) => item.day === day);
            if (!items.length) return null;
            return (
              <section className="card stack" key={day}>
                <h2>Day {day}</h2>
                {dailyCheckIn && day === 1 ? <p className="label draft">Today&apos;s check-in: {dailyCheckIn.adjustment}. {dailyCheckIn.adjustmentNote}</p> : null}
                {items.map((item, index) => <WorkoutDetailCard item={{ ...item, dailyAdjustmentNote: day === 1 ? dailyCheckIn?.adjustmentNote ?? null : null, dailyAlternativeName: day === 1 ? alternatives[index]?.exerciseName ?? null : null }} key={item.id} />)}
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
