import type { ClientProfile } from "@prisma/client";

const sportFocusOptions = ["Boxing", "Kickboxing", "BJJ", "Fight Conditioning", "General Fitness", "Strength", "Weight Loss"];
const goalOptions = ["Conditioning", "Strength and Conditioning", "Strength", "Weight Loss", "General Fitness", "Return to Training"];

export function ClientForm({
  client,
  action
}: {
  client?: ClientProfile;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form className="card form" action={action}>
      <div className="grid">
        <label className="field"><span>Name</span><input name="clientName" required defaultValue={client?.clientName} /></label>
        <label className="field"><span>Email</span><input name="email" type="email" required defaultValue={client?.email} /></label>
        <label className="field"><span>Phone</span><input name="phone" defaultValue={client?.phone ?? ""} /></label>
        <label className="field"><span>Start Date</span><input name="startDate" type="date" defaultValue={client?.startDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10)} /></label>
        <label className="field"><span>Goal</span><Select name="goal" options={goalOptions} value={client?.goal} /></label>
        <label className="field"><span>Sport Focus</span><Select name="sportFocus" options={sportFocusOptions} value={client?.sportFocus} /></label>
        <label className="field"><span>Training Days</span><Select name="trainingDaysPerWeek" options={["2", "3", "4", "5"]} value={String(client?.trainingDaysPerWeek ?? 3)} /></label>
        <label className="field"><span>Session Length</span><Select name="sessionLength" options={["30", "45", "60"]} value={String(client?.sessionLength ?? 60)} /></label>
        {client ? <label className="field"><span>Status</span><Select name="status" options={["Active", "Paused", "Archived"]} value={client.status} /></label> : null}
      </div>
      <label className="field"><span>Notes</span><textarea name="notes" defaultValue={client?.notes ?? ""} /></label>
      <button className="button primary" type="submit">Save Client</button>
    </form>
  );
}

export function Select({ name, options, value }: { name: string; options: string[]; value?: string }) {
  return (
    <select name={name} defaultValue={value ?? options[0]}>
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );
}

export function AssessmentForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form className="card form" action={action}>
      <h2>Coach Assessment</h2>
      <p>Use the workbook scoring: 0 cannot perform, 1 major difficulty, 2 safe but limited, 3 solid baseline, 4 good control, 5 excellent.</p>
      <div className="grid">
        <label className="field"><span>Date</span><input name="assessmentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label className="field"><span>Assessment Type</span><Select name="assessmentType" options={["Initial", "Reassessment"]} /></label>
        <label className="field"><span>Manual Level Override</span><Select name="levelOverride" options={["", "Recovery", "Beginner", "Intermediate", "Pro"]} /></label>
      </div>
      <h3>Safety Clearance</h3>
      <div className="grid">
        <YesNo name="chestPainDizziness" label="Chest pain, dizziness, fainting, or breathing issue?" />
        <YesNo name="recentSurgeryInjury" label="Recent surgery, major injury, or medical restriction?" />
        <YesNo name="painDailyTasks" label="Pain with walking, sitting, standing, or daily tasks?" />
        <YesNo name="cannotStandFiveMin" label="Cannot stand longer than 5 minutes?" />
        <YesNo name="fallRisk" label="Fall risk, severe balance issue, or needs help moving?" />
        <YesNo name="jointLimitation" label="Current joint limitation?" />
      </div>
      <h3>Movement Scores</h3>
      <div className="grid">
        {[
          ["squatScore", "Squat / Sit-to-Stand"],
          ["hingeScore", "Hip Hinge"],
          ["lungeScore", "Lunge / Split Stance"],
          ["pushUpScore", "Push"],
          ["pullScore", "Pull"],
          ["coreScore", "Core Brace"],
          ["balanceScore", "Balance"],
          ["mobilityScore", "Mobility"],
          ["cardioScore", "Cardio / March Test"],
          ["strengthScore", "Strength Basics"],
          ["painLevel", "Pain Level During Movement"]
        ].map(([name, label]) => (
          <label className="field" key={name}><span>{label}</span><input name={name} type="number" min="0" max="5" required /></label>
        ))}
        <label className="field"><span>Equipment Score</span><input name="equipmentScore" type="number" min="0" max="6" defaultValue="0" /></label>
      </div>
      <label className="field"><span>Injury Risk Notes</span><textarea name="injuryRiskNotes" /></label>
      <label className="field"><span>Coach Notes</span><textarea name="coachNotes" /></label>
      <button className="button primary" type="submit">Save Assessment</button>
    </form>
  );
}

function YesNo({ name, label }: { name: string; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select name={name} options={["No", "Yes"]} />
    </label>
  );
}

export function CheckInForm({ action, coach = false }: { action: (formData: FormData) => void | Promise<void>; coach?: boolean }) {
  return (
    <form className="card form" action={action}>
      <h2>Weekly Check-In</h2>
      <div className="grid">
        <label className="field"><span>Week Start</span><input name="weekStartDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        {["energyScore", "painScore", "sorenessScore", "sleepScore", "stressScore", "performanceScore"].map((name) => (
          <label className="field" key={name}><span>{labelize(name)}</span><input name={name} type="number" min="0" max="10" required={name !== "performanceScore"} /></label>
        ))}
        <label className="field"><span>Workout Completion %</span><input name="workoutCompletionPercent" type="number" min="0" max="100" required /></label>
      </div>
      {coach ? <label className="field"><span>Coach Notes</span><textarea name="coachNotes" /></label> : null}
      <button className="button primary" type="submit">Submit Check-In</button>
    </form>
  );
}

export function PackageForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form className="card form" action={action}>
      <h2>Add Package</h2>
      <div className="grid">
        <label className="field"><span>Package Type</span><input name="packageType" defaultValue="Monthly" /></label>
        <label className="field"><span>Training Days</span><Select name="trainingDaysPerWeek" options={["2", "3", "4", "5"]} /></label>
        <label className="field"><span>Sessions Purchased</span><input name="sessionsPurchased" type="number" defaultValue="12" /></label>
        <label className="field"><span>Sessions Used</span><input name="sessionsUsed" type="number" defaultValue="0" /></label>
        <label className="field"><span>Amount Paid</span><input name="amountPaid" type="number" step="0.01" defaultValue="0" /></label>
        <label className="field"><span>Payment Status</span><Select name="paymentStatus" options={["Paid", "Partial", "Unpaid"]} /></label>
        <label className="field"><span>Purchase Date</span><input name="purchaseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label className="field"><span>Status</span><Select name="status" options={["Active", "Completed", "Expired"]} /></label>
      </div>
      <button className="button primary" type="submit">Save Package</button>
    </form>
  );
}

export function NoteForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form className="card form" action={action}>
      <h2>Add Coach Note</h2>
      <div className="grid">
        <label className="field"><span>Date</span><input name="noteDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
        <label className="field"><span>Type</span><input name="noteType" defaultValue="Coach Note" /></label>
      </div>
      <label className="field"><span>Note</span><textarea name="note" required /></label>
      <label className="split"><input style={{ width: 20 }} name="visibleToClient" type="checkbox" /> Visible to client</label>
      <button className="button primary" type="submit">Save Note</button>
    </form>
  );
}

function labelize(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}
