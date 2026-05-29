import { requireCoach } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCoach();
  return (
    <div className="shell">
      <TopNav role={session.role === "ADMIN" ? "admin" : "coach"} />
      {children}
    </div>
  );
}
