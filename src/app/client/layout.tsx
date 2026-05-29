import { requireClient } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  await requireClient();
  return (
    <div className="shell app-frame">
      <TopNav role="client" />
      <div className="content-frame">{children}</div>
    </div>
  );
}
