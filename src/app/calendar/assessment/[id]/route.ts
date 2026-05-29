import { icsCalendar } from "@/lib/calendar";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireUser();
  const appointment = await prisma.scheduledAssessment.findUniqueOrThrow({
    where: { id: params.id },
    include: { client: { include: { assignedCoach: true } } }
  });

  const isClient = session.role === "CLIENT" && appointment.client.userId === session.userId;
  const isCoach = ["ADMIN", "COACH"].includes(session.role) && (session.role === "ADMIN" || appointment.client.assignedCoachId === session.userId || !appointment.client.assignedCoachId);
  if (!isClient && !isCoach) {
    return new Response("Not allowed", { status: 403 });
  }

  const body = icsCalendar({
    title: `Assessment - ${appointment.client.clientName}`,
    details: appointment.notes ?? "Mad King Conditioning assessment",
    start: appointment.scheduledDate,
    minutes: appointment.client.sessionLength || 60
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="assessment-${appointment.client.clientCode}.ics"`
    }
  });
}
