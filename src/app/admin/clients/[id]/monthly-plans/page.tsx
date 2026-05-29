import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PlanLevelBadge, StatusBadge } from "@/components/Badges";

export default async function MonthlyPlansPage({ params }: { params: { id: string } }) {
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: params.id }, include: { monthlyPlans: { orderBy: [{ year: "desc" }, { month: "desc" }] } } });
  return (
    <main className="container stack">
      <div className="page-title"><h1>{client.clientName} Monthly Plans</h1><Link className="button primary" href={`/admin/clients/${client.id}/monthly-plans/new`}>Generate New Month Plan</Link></div>
      <section className="grid">
        {client.monthlyPlans.map((plan) => (
          <Link className="card stack" key={plan.id} href={`/admin/clients/${client.id}/monthly-plans/${plan.id}`}>
            <div className="split"><h2>{plan.month}/{plan.year}</h2><StatusBadge status={plan.planStatus} /></div>
            <PlanLevelBadge level={plan.planLevel} />
            <p>{plan.coachApproved ? "Approved and client-visible if active." : "Draft is hidden from client."}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

