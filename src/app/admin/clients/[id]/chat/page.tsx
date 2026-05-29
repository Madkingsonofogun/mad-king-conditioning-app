import { sendCoachChatMessageAction } from "@/app/actions";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CoachClientChatPage({ params }: { params: { id: string } }) {
  const session = await requireCoach();
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      assignedCoach: true,
      chatMessages: { include: { sender: true }, orderBy: { createdAt: "asc" } }
    }
  });

  if (session.role !== "ADMIN" && client.assignedCoachId && client.assignedCoachId !== session.userId) {
    return (
      <main className="container">
        <section className="card">
          <h1>Client Chat</h1>
          <p>This client is assigned to another coach.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>{client.clientName} Chat</h1>
          <p>Assigned coach: {client.assignedCoach?.name ?? "No coach assigned"}</p>
        </div>
      </div>
      <section className="card stack">
        {client.chatMessages.length ? client.chatMessages.map((message) => (
          <div className="card compact" key={message.id}>
            <strong>{message.sender.name}</strong>
            <p>{message.message}</p>
            <span className="muted">{message.createdAt.toLocaleString()}</span>
          </div>
        )) : <p>No messages yet.</p>}
      </section>
      <form className="card form" action={sendCoachChatMessageAction.bind(null, client.id)}>
        <label className="field">
          <span>Message</span>
          <textarea name="message" required placeholder="Message this client" />
        </label>
        <button className="button primary" type="submit">Send Message</button>
      </form>
    </main>
  );
}

