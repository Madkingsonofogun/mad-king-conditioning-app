import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PlanLevelBadge } from "@/components/Badges";
import { requireCoach } from "@/lib/auth";

export default async function ClientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await requireCoach();
  const isAdmin = session.role === "ADMIN";
  const q = searchParams.q?.trim();
  const clients = await prisma.clientProfile.findMany({
    where: q
      ? {
          OR: [
            { clientName: { contains: q } },
            { sportFocus: { contains: q } },
            { goal: { contains: q } },
            { email: { contains: q } }
          ]
        }
      : undefined,
    include: { assessments: { orderBy: { assessmentDate: "desc" }, take: 1 }, packages: { where: { status: "Active" }, take: 1 } },
    orderBy: { clientName: "asc" }
  });

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Clients</h1>
          <p>Search, filter, and open the selected client. Each page is keyed by client ID.</p>
        </div>
        {isAdmin ? <Link className="button primary" href="/admin/clients/new">New Client</Link> : null}
      </div>
      <form className="card split">
        <input name="q" placeholder="Search by name, sport, goal, or email" defaultValue={q} />
        <button className="button" type="submit">Search</button>
      </form>
      <section className="grid">
        {clients.map((client) => (
          <Link className="card stack" href={`/admin/clients/${client.id}`} key={client.id}>
            <div className="split">
              <h2>{client.clientName}</h2>
              {client.assessments[0] ? <PlanLevelBadge level={client.assessments[0].planLevel} /> : null}
            </div>
            <p>{client.sportFocus} • {client.goal}</p>
            <div className="split">
              <span className="label">{client.trainingDaysPerWeek} days/week</span>
              <span className="label">{client.sessionLength} min</span>
              <span className="label">{client.packages[0]?.sessionsRemaining ?? 0} sessions left</span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
