import { prisma } from "@/lib/prisma";

export default async function SessionsPage({ params }: { params: { id: string } }) {
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: params.id }, include: { workoutSessions: { orderBy: { date: "desc" } } } });
  return (
    <main className="container stack">
      <h1>{client.clientName} Sessions</h1>
      <section className="card table-wrap"><table><thead><tr><th>Date</th><th>Workout</th><th>Completed</th><th>Performance</th><th>Pain</th><th>Notes</th></tr></thead><tbody>
        {client.workoutSessions.map((s) => <tr key={s.id}><td>{s.date.toLocaleDateString()}</td><td>{s.workoutType}</td><td>{s.completed ? "Yes" : "No"}</td><td>{s.performanceScore}</td><td>{s.painAfterWorkout}</td><td>{s.coachNotes}</td></tr>)}
      </tbody></table></section>
    </main>
  );
}

