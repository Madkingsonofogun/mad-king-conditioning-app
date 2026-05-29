import { sendClientChatMessageAction } from "@/app/actions";
import { requireClient } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientChatPage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile } = await requireClient();
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: profile.id },
    include: {
      assignedCoach: true,
      chatMessages: { include: { sender: true }, orderBy: { createdAt: "asc" } }
    }
  });

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Coach Chat</h1>
          <p>{client.assignedCoach ? `Your coach: ${client.assignedCoach.name}` : "A coach has not been assigned yet."}</p>
        </div>
      </div>
      {searchParams.error === "no-coach" ? <p className="label draft">A coach must be assigned before chat can start.</p> : null}
      <section className="card stack">
        {client.chatMessages.length ? client.chatMessages.map((message) => (
          <div className="card compact" key={message.id}>
            <strong>{message.sender.name}</strong>
            <p>{message.message}</p>
            <span className="muted">{message.createdAt.toLocaleString()}</span>
          </div>
        )) : <p>No messages yet.</p>}
      </section>
      <form className="card form" action={sendClientChatMessageAction}>
        <label className="field">
          <span>Message</span>
          <textarea name="message" required placeholder="Message your coach" disabled={!client.assignedCoach} />
        </label>
        <button className="button primary" type="submit" disabled={!client.assignedCoach}>Send Message</button>
      </form>
    </main>
  );
}
