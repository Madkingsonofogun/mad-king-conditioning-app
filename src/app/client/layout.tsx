import { requireClient } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireClient();
  return (
    <div className="shell">
      <TopNav role="client" />
      {children}
    </div>
  );
}
