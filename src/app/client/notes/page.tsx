import { requireClient } from "@/lib/auth";
import { getClientVisibleNotes } from "@/lib/data-access";

export default async function ClientNotesPage() {
  const { profile } = await requireClient();
  const notes = await getClientVisibleNotes(profile.id);
  return (
    <main className="container stack">
      <h1>Coach Notes</h1>
      <section className="grid">{notes.map((note) => <div className="card stack" key={note.id}><div className="split"><strong>{note.noteType}</strong><span className="muted">{note.noteDate.toLocaleDateString()}</span></div><p>{note.note}</p></div>)}</section>
    </main>
  );
}
