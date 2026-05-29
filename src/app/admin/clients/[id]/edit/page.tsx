import { prisma } from "@/lib/prisma";
import { updateClientAction } from "@/app/actions";
import { ClientForm } from "@/components/forms";
import { requireAdmin } from "@/lib/auth";

export default async function EditClient({ params }: { params: { id: string } }) {
  await requireAdmin();
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: params.id } });
  return (
    <main className="container stack">
      <h1>Edit {client.clientName}</h1>
      <ClientForm client={client} action={updateClientAction.bind(null, client.id)} />
    </main>
  );
}
