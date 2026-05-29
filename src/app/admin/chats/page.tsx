import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminChatsPage() {
  await requireAdmin();
  const clients = await prisma.clientProfile.findMany({
    include: {
      assignedCoach: true,
      chatMessages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { clientName: "asc" }
  });
  const conversations = clients.filter((client) => client.chatMessages.length > 0);
  const totalMessages = conversations.reduce((sum, client) => sum + client.chatMessages.length, 0);

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>All Coach Chats</h1>
          <p>Admin can review every coach-client conversation across the app.</p>
        </div>
        <Link className="button" href="/admin/clients">Open Clients</Link>
      </div>

      <section className="grid">
        <div className="card">
          <h3>Conversations</h3>
          <div className="metric">{conversations.length}</div>
        </div>
        <div className="card">
          <h3>Total Messages</h3>
          <div className="metric">{totalMessages}</div>
        </div>
        <div className="card">
          <h3>Assigned Coaches</h3>
          <div className="metric">{clients.filter((client) => client.assignedCoachId).length}</div>
        </div>
      </section>

      <section className="stack">
        {conversations.length ? conversations.map((client) => {
          const latestMessage = client.chatMessages[client.chatMessages.length - 1];
          return (
            <article className="card stack" key={client.id}>
              <div className="page-title">
                <div>
                  <h2>{client.clientName}</h2>
                  <p>Coach: {client.assignedCoach?.name ?? "No coach assigned"}</p>
                </div>
                <Link className="button primary" href={`/admin/clients/${client.id}/chat`}>
                  Open Full Chat
                </Link>
              </div>
              <div className="chat-preview">
                {client.chatMessages.slice(-4).map((message) => (
                  <div className="chat-bubble" key={message.id}>
                    <div className="split">
                      <strong>{message.sender.name}</strong>
                      <span className="muted">{message.createdAt.toLocaleString()}</span>
                    </div>
                    <p>{message.message}</p>
                  </div>
                ))}
              </div>
              <p className="muted">
                Latest message: {latestMessage.createdAt.toLocaleString()}
              </p>
            </article>
          );
        }) : (
          <section className="card">
            <h2>No chats yet</h2>
            <p>Client and coach messages will appear here as soon as conversations start.</p>
          </section>
        )}
      </section>
    </main>
  );
}
