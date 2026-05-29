import { prisma } from "@/lib/prisma";
import { createNoteAction } from "@/app/actions";
import { NoteForm } from "@/components/forms";

export default async function NotesPage({ params }: { params: { id: string } }) {
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: params.id }, include: { coachNotes: { orderBy: { noteDate: "desc" } } } });
  return (
    <main className="container stack">
      <h1>{client.clientName} Coach Notes</h1>
      <NoteForm action={createNoteAction.bind(null, client.id)} />
      <section className="grid">{client.coachNotes.map((n) => <div className="card stack" key={n.id}><div className="split"><strong>{n.noteType}</strong><span className={n.visibleToClient ? "label active" : "label draft"}>{n.visibleToClient ? "Client Visible" : "Private"}</span></div><p>{n.note}</p><span className="muted">{n.noteDate.toLocaleDateString()}</span></div>)}</section>
    </main>
  );
}
