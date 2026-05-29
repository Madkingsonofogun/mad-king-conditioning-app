import { markWorkoutCompleteAction } from "@/app/actions";

type WorkoutItem = {
  id: string;
  sessionPart: string;
  exerciseName: string;
  dailyAdjustmentNote?: string | null;
  dailyAlternativeName?: string | null;
  sets: string | null;
  reps: string | null;
  time: string | null;
  rest: string | null;
  weight?: string | null;
  coachNotes: string | null;
  completed: boolean;
  exercise?: {
    description: string | null;
    equipment: string | null;
    videoUrl?: string | null;
    progression: string | null;
    regression: string | null;
    coachingNotes: string | null;
  } | null;
};

export function WorkoutDetailCard({ item, allowComplete = true }: { item: WorkoutItem; allowComplete?: boolean }) {
  const work = [
    item.sets ? `${item.sets} rounds/sets` : null,
    item.reps ? `${item.reps} reps` : null,
    item.time ? `${item.time}` : null,
    item.weight ? `Weight/load: ${item.weight}` : null,
    item.rest ? `Rest: ${item.rest}` : null
  ].filter(Boolean);

  return (
    <article className="workout-card stack">
      <div className="split">
        <span className="label">{item.sessionPart}</span>
        {item.completed ? <span className="label active">Completed</span> : null}
      </div>
      <h3>{item.exerciseName}</h3>
      {item.dailyAdjustmentNote ? <p className="label draft">{item.dailyAdjustmentNote}</p> : null}
      {item.dailyAlternativeName ? <p><strong>Today&apos;s safer option:</strong> {item.dailyAlternativeName}</p> : null}
      {item.exercise?.videoUrl ? (
        item.exercise.videoUrl.startsWith("/uploads/") ? (
          <video className="exercise-video" src={item.exercise.videoUrl} controls preload="metadata" />
        ) : (
          <a className="button warn" href={item.exercise.videoUrl} target="_blank" rel="noreferrer">Watch Demo Video</a>
        )
      ) : null}
      <div className="workout-prescription">
        {work.length ? work.map((part) => <span className="label" key={part}>{part}</span>) : <span className="label">Follow coach notes</span>}
      </div>
      {item.exercise?.equipment ? <p><strong>Equipment:</strong> {item.exercise.equipment}</p> : null}
      {item.exercise?.description ? <p><strong>How to do it:</strong> {item.exercise.description}</p> : null}
      {item.coachNotes ? <p><strong>Coach notes:</strong> {item.coachNotes}</p> : null}
      <div className="grid">
        {item.exercise?.regression ? <div><strong>Make it easier</strong><p>{item.exercise.regression}</p></div> : null}
        {item.exercise?.progression ? <div><strong>Make it harder</strong><p>{item.exercise.progression}</p></div> : null}
      </div>
      {item.exercise?.coachingNotes ? <p><strong>Safety cues:</strong> {item.exercise.coachingNotes}</p> : null}
      {allowComplete && !item.completed ? (
        <form action={markWorkoutCompleteAction.bind(null, item.id)}>
          <button className="button primary" type="submit">Mark Completed</button>
        </form>
      ) : null}
    </article>
  );
}
