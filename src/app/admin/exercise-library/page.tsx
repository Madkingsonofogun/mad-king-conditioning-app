import { prisma } from "@/lib/prisma";
import { PlanLevelBadge } from "@/components/Badges";
import { createExerciseAction, deleteExerciseAction, updateExerciseAction } from "@/app/actions";
import type { Exercise } from "@prisma/client";
import { requireCoach } from "@/lib/auth";

const categories = ["Warm-Up", "Mobility", "Boxing Skill", "Kickboxing Skill", "BJJ Skill", "Strength", "Core", "Conditioning", "Finisher", "Cooldown", "Recovery"];
const sports = ["Boxing", "Kickboxing", "BJJ", "Fight Conditioning", "General Fitness", "Strength", "Weight Loss"];
const levels = ["Recovery", "Baseline", "Progression"];
const difficulties = ["Easy", "Medium", "Hard"];
const parts = ["Warm-Up", "Mobility", "Skill", "Strength", "Core", "Conditioning", "Finisher", "Cooldown", "Recovery"];

export default async function ExerciseLibrary({ searchParams }: { searchParams: { q?: string; level?: string } }) {
  const session = await requireCoach();
  const isAdmin = session.role === "ADMIN";
  const q = searchParams.q?.trim();
  const exercises = await prisma.exercise.findMany({
    where: {
      AND: [
        q ? { OR: [{ exerciseName: { contains: q } }, { category: { contains: q } }, { sportFocus: { contains: q } }] } : {},
        searchParams.level ? { planLevel: searchParams.level } : {}
      ]
    },
    orderBy: [{ sportFocus: "asc" }, { planLevel: "asc" }, { sessionPart: "asc" }]
  });
  return (
    <main className="container stack">
      <h1>Exercise Library</h1>
      <form className="card split">
        <input name="q" placeholder="Search exercises" defaultValue={q} />
        <select name="level" defaultValue={searchParams.level ?? ""}><option value="">All Levels</option><option>Recovery</option><option>Baseline</option><option>Progression</option></select>
        <button className="button" type="submit">Filter</button>
      </form>
      {isAdmin ? (
        <section className="card stack">
          <h2>Add Exercise</h2>
          <ExerciseFields action={createExerciseAction} />
        </section>
      ) : null}
      <section className="stack">
        {exercises.map((e) => (
          <form className="card form" key={e.id} action={updateExerciseAction.bind(null, e.id)}>
            <div className="split">
              <h2>{e.exerciseName}</h2>
              <PlanLevelBadge level={e.planLevel} />
            </div>
            {e.description ? <p>{e.description}</p> : null}
            {e.videoUrl ? <a className="button" href={e.videoUrl} target="_blank" rel="noreferrer">Open Demo Video</a> : null}
            {isAdmin ? (
              <>
                <ExerciseInputs exercise={e} />
                <div className="split">
                  <button className="button primary" type="submit">Save Exercise</button>
                  <button className="button" formAction={deleteExerciseAction.bind(null, e.id)}>Delete Exercise</button>
                </div>
              </>
            ) : (
              <div className="grid">
                <div><strong>Work</strong><p>{e.sets} sets {e.reps || e.time} • Rest {e.rest}</p></div>
                <div><strong>Regression</strong><p>{e.regression}</p></div>
                <div><strong>Progression</strong><p>{e.progression}</p></div>
                <div><strong>Coaching Notes</strong><p>{e.coachingNotes}</p></div>
              </div>
            )}
          </form>
        ))}
      </section>
    </main>
  );
}

function ExerciseFields({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form className="form" action={action}>
      <ExerciseInputs />
      <button className="button primary" type="submit">Create Exercise</button>
    </form>
  );
}

function ExerciseInputs({ exercise }: { exercise?: Exercise }) {
  return (
    <>
      <div className="grid">
        <label className="field"><span>Name</span><input name="exerciseName" required defaultValue={exercise?.exerciseName ?? ""} /></label>
        <label className="field"><span>Category</span><Select name="category" options={categories} value={exercise?.category} /></label>
        <label className="field"><span>Sport Focus</span><Select name="sportFocus" options={sports} value={exercise?.sportFocus} /></label>
        <label className="field"><span>Goal</span><input name="goal" defaultValue={exercise?.goal ?? "Conditioning"} /></label>
        <label className="field"><span>Difficulty</span><Select name="difficulty" options={difficulties} value={exercise?.difficulty} /></label>
        <label className="field"><span>Plan Level</span><Select name="planLevel" options={levels} value={exercise?.planLevel} /></label>
        <label className="field"><span>Session Part</span><Select name="sessionPart" options={parts} value={exercise?.sessionPart} /></label>
        <label className="field"><span>Equipment</span><input name="equipment" defaultValue={exercise?.equipment ?? ""} /></label>
        <label className="field"><span>Body Area</span><input name="bodyArea" defaultValue={exercise?.bodyArea ?? ""} /></label>
        <label className="field"><span>Sets</span><input name="sets" defaultValue={exercise?.sets ?? ""} /></label>
        <label className="field"><span>Reps</span><input name="reps" defaultValue={exercise?.reps ?? ""} /></label>
        <label className="field"><span>Time</span><input name="time" defaultValue={exercise?.time ?? ""} /></label>
        <label className="field"><span>Rest</span><input name="rest" defaultValue={exercise?.rest ?? ""} /></label>
      </div>
      <label className="split"><input style={{ width: 20 }} name="lowImpact" type="checkbox" defaultChecked={exercise?.lowImpact ?? false} /> Low impact</label>
      <label className="field"><span>Detailed Description / How To Do It</span><textarea name="description" defaultValue={exercise?.description ?? ""} placeholder="Setup, movement steps, breathing, pace, and safety cues." /></label>
      <input name="existingVideoUrl" type="hidden" defaultValue={exercise?.videoUrl ?? ""} />
      <label className="field"><span>Demo Video Link</span><input name="videoUrl" defaultValue={exercise?.videoUrl ?? ""} placeholder="Paste YouTube, Vimeo, or uploaded video URL" /></label>
      <label className="field"><span>Upload Demo Video</span><input name="videoFile" type="file" accept="video/*" /></label>
      <label className="field"><span>Progression</span><textarea name="progression" defaultValue={exercise?.progression ?? ""} /></label>
      <label className="field"><span>Regression</span><textarea name="regression" defaultValue={exercise?.regression ?? ""} /></label>
      <label className="field"><span>Coaching Notes</span><textarea name="coachingNotes" defaultValue={exercise?.coachingNotes ?? ""} /></label>
    </>
  );
}

function Select({ name, options, value }: { name: string; options: string[]; value?: string }) {
  return (
    <select name={name} defaultValue={value ?? options[0]}>
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}
