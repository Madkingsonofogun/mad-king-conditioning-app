import { requireClient } from "@/lib/auth";
import { getClientVisibleMonthlyPlan } from "@/lib/data-access";
import { PlanLevelBadge, StatusBadge } from "@/components/Badges";

export default async function ClientMonthlyPlan() {
  const { profile } = await requireClient();
  const plan = await getClientVisibleMonthlyPlan(profile.id);
  return (
    <main className="container stack">
      <h1>Monthly Plan</h1>
      {!plan ? <section className="card"><p>No approved active plan yet.</p></section> : <section className="card stack"><div className="split"><PlanLevelBadge level={plan.planLevel} /><StatusBadge status={plan.planStatus} /></div><div className="table-wrap"><table><thead><tr><th>Week</th><th>Day</th><th>Part</th><th>Exercise</th><th>Work</th><th>Rest</th><th>Notes</th></tr></thead><tbody>{plan.items.map((item) => <tr key={item.id}><td>{item.week}</td><td>{item.day}</td><td>{item.sessionPart}</td><td>{item.exerciseName}</td><td>{item.sets} x {item.reps || item.time}</td><td>{item.rest}</td><td>{item.coachNotes}</td></tr>)}</tbody></table></div></section>}
    </main>
  );
}

