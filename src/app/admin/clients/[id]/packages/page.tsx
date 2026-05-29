import { prisma } from "@/lib/prisma";
import { createPackageAction, deletePackageAction, updatePackageAction } from "@/app/actions";
import { PackageForm } from "@/components/forms";
import { StatusBadge } from "@/components/Badges";
import { requireAdmin } from "@/lib/auth";

export default async function PackagesPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: params.id }, include: { packages: { orderBy: { purchaseDate: "desc" } } } });
  return (
    <main className="container stack">
      <h1>{client.clientName} Packages</h1>
      <PackageForm action={createPackageAction.bind(null, client.id)} />
      <section className="stack">
        {client.packages.map((p) => (
          <form className="card form" key={p.id} action={updatePackageAction.bind(null, client.id, p.id)}>
            <div className="split">
              <h2>{p.packageType}</h2>
              <StatusBadge status={p.status} />
              <span className="label">${p.amountPaid ?? 0}</span>
            </div>
            <div className="grid">
              <label className="field"><span>Package Type</span><input name="packageType" defaultValue={p.packageType} /></label>
              <label className="field"><span>Training Days</span><select name="trainingDaysPerWeek" defaultValue={p.trainingDaysPerWeek}>{["2", "3", "4", "5"].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label className="field"><span>Sessions Purchased</span><input name="sessionsPurchased" type="number" defaultValue={p.sessionsPurchased} /></label>
              <label className="field"><span>Sessions Used</span><input name="sessionsUsed" type="number" defaultValue={p.sessionsUsed} /></label>
              <label className="field"><span>Price / Amount Paid</span><input name="amountPaid" type="number" step="0.01" defaultValue={p.amountPaid ?? 0} /></label>
              <label className="field"><span>Payment Status</span><select name="paymentStatus" defaultValue={p.paymentStatus}>{["Paid", "Partial", "Unpaid"].map((v) => <option key={v}>{v}</option>)}</select></label>
              <label className="field"><span>Purchase Date</span><input name="purchaseDate" type="date" defaultValue={p.purchaseDate.toISOString().slice(0, 10)} /></label>
              <label className="field"><span>Expiration Date</span><input name="expirationDate" type="date" defaultValue={p.expirationDate?.toISOString().slice(0, 10) ?? ""} /></label>
              <label className="field"><span>Status</span><select name="status" defaultValue={p.status}>{["Active", "Completed", "Expired", "Paused"].map((v) => <option key={v}>{v}</option>)}</select></label>
            </div>
            <div className="split">
              <span className="label">{p.sessionsRemaining} sessions remaining</span>
              <button className="button primary" type="submit">Save Package</button>
              <button className="button" formAction={deletePackageAction.bind(null, client.id, p.id)}>Delete Package</button>
            </div>
          </form>
        ))}
      </section>
    </main>
  );
}
