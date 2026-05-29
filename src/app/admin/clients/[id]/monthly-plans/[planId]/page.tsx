import { prisma } from "@/lib/prisma";
import { addPlanItemAction, approvePlanAction, archivePlanAction, deletePlanItemAction, updatePlanItemAction } from "@/app/actions";
import { PlanLevelBadge, StatusBadge } from "@/components/Badges";

export default async function PlanDetail({ params }: { params: { id: string; planId: string } }) {
  const plan = await prisma.monthlyPlan.findFirstOrThrow({
    where: { id: params.planId, clientId: params.id },
    include: { client: true, items: { orderBy: [{ week: "asc" }, { day: "asc" }, { sessionPart: "asc" }] } }
  });
  return (
    <main className="container stack">
      <div className="page-title">
        <div><h1>{plan.client.clientName} Plan {plan.month}/{plan.year}</h1><div className="split"><PlanLevelBadge level={plan.planLevel} /><StatusBadge status={plan.planStatus} /></div></div>
        <div className="split">
          <form action={approvePlanAction.bind(null, params.id, plan.id)}><button className="button primary" type="submit">Approve Plan</button></form>
          <form action={archivePlanAction.bind(null, params.id, plan.id)}><button className="button" type="submit">Archive</button></form>
        </div>
      </div>
      <section className="card stack">
        <h2>Add Plan Item</h2>
        <form className="grid" action={addPlanItemAction.bind(null, params.id, plan.id)}>
          <input name="week" type="number" min="1" defaultValue="1" placeholder="Week" />
          <input name="day" type="number" min="1" defaultValue="1" placeholder="Day" />
          <input name="sessionPart" placeholder="Session Part" />
          <input name="exerciseName" placeholder="Exercise" />
          <input name="sets" placeholder="Sets" />
          <input name="reps" placeholder="Reps" />
          <input name="time" placeholder="Time" />
          <input name="rest" placeholder="Rest" />
          <input name="weight" placeholder="Weight / Load" />
          <input name="coachNotes" placeholder="Coach Notes" />
          <button className="button primary" type="submit">Add</button>
        </form>
      </section>
      <section className="stack">
        {plan.items.map((item) => (
          <form className="card form" key={item.id} action={updatePlanItemAction.bind(null, params.id, plan.id, item.id)}>
            <div className="split"><strong>Week {item.week}, Day {item.day}</strong><span className="label">{item.sessionPart}</span>{item.completed ? <span className="label active">Completed</span> : null}</div>
            <div className="grid">
              <input name="exerciseName" defaultValue={item.exerciseName} />
              <input name="sets" defaultValue={item.sets ?? ""} placeholder="Sets" />
              <input name="reps" defaultValue={item.reps ?? ""} placeholder="Reps" />
              <input name="time" defaultValue={item.time ?? ""} placeholder="Time" />
              <input name="rest" defaultValue={item.rest ?? ""} placeholder="Rest" />
              <input name="weight" defaultValue={item.weight ?? ""} placeholder="Weight / Load" />
              <input name="coachNotes" defaultValue={item.coachNotes ?? ""} placeholder="Coach Notes" />
            </div>
            <div className="split">
              <button className="button primary" type="submit">Save Item</button>
              <button className="button" formAction={deletePlanItemAction.bind(null, params.id, plan.id, item.id)}>Delete</button>
            </div>
          </form>
        ))}
      </section>
    </main>
  );
}
