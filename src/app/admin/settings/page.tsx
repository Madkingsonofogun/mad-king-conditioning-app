import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function SettingsPage() {
  await requireAdmin();
  return (
    <main className="container stack">
      <h1>Settings</h1>
      <section className="card split">
        <strong>Coach logins are admin-managed.</strong>
        <Link className="button primary" href="/admin/coaches">Manage Coaches</Link>
      </section>
      <section className="grid">
        {["Boxing", "Kickboxing", "BJJ", "Fight Conditioning", "General Fitness", "Strength", "Weight Loss"].map((value) => <div className="card" key={value}><h2>{value}</h2><p>Available as sport focus or goal targeting in client profiles, exercises, and templates.</p></div>)}
      </section>
    </main>
  );
}
