import { prisma } from "@/lib/prisma";
import { generatePlanAction } from "@/app/actions";
import { AdjustmentBadge, PlanLevelBadge } from "@/components/Badges";
import { choosePlanLevel } from "@/lib/rules";

export default async function GeneratePlanPage({ params }: { params: { id: string } }) {
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      assessments: { orderBy: { assessmentDate: "desc" }, take: 1 },
      weeklyCheckIns: { orderBy: { weekStartDate: "desc" }, take: 4 },
      packages: { where: { status: "Active" }, take: 1 }
    }
  });
  const now = new Date();
  const recommendedLevel = choosePlanLevel({
    latestAssessmentLevel: client.assessments[0]?.planLevel,
    previousPlanLevel: null,
    checkIns: client.weeklyCheckIns
  });
  return (
    <main className="container stack">
      <h1>Generate New Month Plan</h1>
      <section className="grid">
        <div className="card stack"><h2>Client</h2><p>{client.clientName}</p><span className="label">{client.trainingDaysPerWeek} days/week</span><span className="label">{client.sessionLength} min</span><span className="label">{client.sportFocus}</span><span className="label">{client.goal}</span></div>
        <div className="card stack"><h2>Latest Assessment</h2>{client.assessments[0] ? <><div className="metric">{client.assessments[0].averageScore.toFixed(1)}</div><PlanLevelBadge level={client.assessments[0].planLevel} /></> : <p>No assessment yet.</p>}</div>
        <div className="card stack"><h2>Last 4 Check-Ins</h2>{client.weeklyCheckIns.map((c) => <div className="split" key={c.id}><span>{c.weekStartDate.toLocaleDateString()}</span><AdjustmentBadge adjustment={c.planAdjustment} /></div>)}</div>
        <div className="card stack"><h2>Smart Coach Recommendation</h2><PlanLevelBadge level={recommendedLevel} /><p>The new month starts from the latest assessment, then recent check-ins can move it easier, harder, or keep it steady.</p></div>
      </section>
      <form className="card form" action={generatePlanAction.bind(null, client.id)}>
        <div className="grid">
          <label className="field"><span>Month</span><input name="month" type="number" min="1" max="12" defaultValue={now.getMonth() + 1} /></label>
          <label className="field"><span>Year</span><input name="year" type="number" min="2024" defaultValue={now.getFullYear()} /></label>
        </div>
        <button className="button primary" type="submit">Generate New Month Plan</button>
      </form>
    </main>
  );
}
