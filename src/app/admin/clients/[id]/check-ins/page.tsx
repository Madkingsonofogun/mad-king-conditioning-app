import { prisma } from "@/lib/prisma";
import { createCheckInAction } from "@/app/actions";
import { AdjustmentBadge } from "@/components/Badges";
import { CheckInForm } from "@/components/forms";

export default async function CheckInsPage({ params }: { params: { id: string } }) {
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      weeklyCheckIns: { orderBy: { weekStartDate: "desc" } },
      dailyCheckIns: { orderBy: { checkInDate: "desc" }, take: 30 }
    }
  });
  return (
    <main className="container stack">
      <h1>{client.clientName} Check-Ins</h1>
      <CheckInForm coach action={createCheckInAction.bind(null, client.id)} />
      <section className="card">
        <h2>Weekly History</h2>
        <div className="table-wrap"><table><thead><tr><th>Week</th><th>Energy</th><th>Pain</th><th>Completion</th><th>Result</th><th>Adjustment</th></tr></thead><tbody>
          {client.weeklyCheckIns.map((c) => <tr key={c.id}><td>{c.weekStartDate.toLocaleDateString()}</td><td>{c.energyScore}</td><td>{c.painScore}</td><td>{c.workoutCompletionPercent}%</td><td>{c.checkInResult}</td><td><AdjustmentBadge adjustment={c.planAdjustment} /></td></tr>)}
        </tbody></table></div>
      </section>
      <section className="card">
        <h2>Daily Check-In History</h2>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Energy</th><th>Soreness</th><th>Pain Area</th><th>Adjustment</th><th>Note</th></tr></thead><tbody>
          {client.dailyCheckIns.map((c) => <tr key={c.id}><td>{c.checkInDate.toLocaleDateString()}</td><td>{c.energyScore}</td><td>{c.sorenessScore}</td><td>{c.painArea}</td><td>{c.adjustment}</td><td>{c.adjustmentNote}</td></tr>)}
        </tbody></table></div>
      </section>
    </main>
  );
}
