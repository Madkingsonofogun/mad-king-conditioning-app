import { prisma } from "@/lib/prisma";
import { PlanLevelBadge } from "@/components/Badges";
import { createPlanTemplateAction, deletePlanTemplateGroupAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";

const sports = ["Boxing", "Kickboxing", "BJJ", "Fight Conditioning", "General Fitness", "Strength", "Weight Loss"];
const levels = ["Recovery", "Baseline", "Progression"];
const parts = ["Warm-Up", "Mobility", "Skill", "Strength", "Core", "Conditioning", "Finisher", "Cooldown", "Recovery"];

export default async function PlanTemplates() {
  await requireAdmin();
  const templates = await prisma.planTemplate.groupBy({
    by: ["templateName", "sportFocus", "goal", "planLevel", "trainingDaysPerWeek", "sessionLength"],
    _count: true,
    orderBy: [{ trainingDaysPerWeek: "asc" }, { planLevel: "asc" }]
  });
  return (
    <main className="container stack">
      <h1>Plan Templates</h1>
      <section className="card stack">
        <h2>Add Template Row</h2>
        <form className="form" action={createPlanTemplateAction}>
          <div className="grid">
            <label className="field"><span>Template Name</span><input name="templateName" required placeholder="3-day Baseline Boxing" /></label>
            <label className="field"><span>Sport Focus</span><Select name="sportFocus" options={sports} /></label>
            <label className="field"><span>Goal</span><input name="goal" defaultValue="Conditioning" /></label>
            <label className="field"><span>Plan Level</span><Select name="planLevel" options={levels} /></label>
            <label className="field"><span>Training Days</span><Select name="trainingDaysPerWeek" options={["2", "3", "4", "5"]} /></label>
            <label className="field"><span>Session Length</span><Select name="sessionLength" options={["30", "45", "60"]} /></label>
            <label className="field"><span>Week</span><input name="week" type="number" min="1" defaultValue="1" /></label>
            <label className="field"><span>Day</span><input name="day" type="number" min="1" defaultValue="1" /></label>
            <label className="field"><span>Session Part</span><Select name="sessionPart" options={parts} /></label>
            <label className="field"><span>Exercise</span><input name="exerciseName" required /></label>
            <label className="field"><span>Sets</span><input name="sets" /></label>
            <label className="field"><span>Reps</span><input name="reps" /></label>
            <label className="field"><span>Time</span><input name="time" /></label>
            <label className="field"><span>Rest</span><input name="rest" /></label>
          </div>
          <label className="field"><span>Coaching Notes</span><textarea name="coachingNotes" /></label>
          <button className="button primary" type="submit">Create Template Row</button>
        </form>
      </section>
      <section className="grid">
        {templates.map((t) => (
          <div className="card stack" key={`${t.templateName}-${t.planLevel}-${t.trainingDaysPerWeek}-${t.sessionLength}`}>
            <div className="split"><h2>{t.templateName}</h2><PlanLevelBadge level={t.planLevel} /></div>
            <p>{t.sportFocus} • {t.goal}</p>
            <div className="split"><span className="label">{t.trainingDaysPerWeek} days</span><span className="label">{t.sessionLength} min</span><span className="label">{t._count} blocks</span></div>
            <form action={deletePlanTemplateGroupAction.bind(null, t.templateName, t.sportFocus, t.goal, t.planLevel, t.trainingDaysPerWeek, t.sessionLength)}>
              <button className="button" type="submit">Delete Template</button>
            </form>
          </div>
        ))}
      </section>
    </main>
  );
}

function Select({ name, options }: { name: string; options: string[] }) {
  return (
    <select name={name}>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}
