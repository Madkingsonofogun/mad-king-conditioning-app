import { requireCoach } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCoach();
  return (
    <div className="shell app-frame">
      <TopNav role={session.role === "ADMIN" ? "admin" : "coach"} />
      <div className="content-frame">{children}</div>
    </div>
  );
}
