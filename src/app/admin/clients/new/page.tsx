import { ClientForm } from "@/components/forms";
import { createClientAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";

export default async function NewClientPage() {
  await requireAdmin();
  return (
    <main className="container">
      <div className="page-title">
        <h1>New Client</h1>
      </div>
      <ClientForm action={createClientAction} />
    </main>
  );
}
