import { icsCalendar } from "@/lib/calendar";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireCoach();
  const item = await prisma.monthlyPlanItem.findUniqueOrThrow({
    where: { id: params.id },
    include: { client: true }
  });
  if (session.role !== "ADMIN" && item.client.assignedCoachId && item.client.assignedCoachId !== session.userId) {
    return new Response("Not allowed", { status: 403 });
  }
  if (!item.sessionDate) {
    return new Response("No session date", { status: 404 });
  }

  const body = icsCalendar({
    title: `${item.sportFocus} Coaching - ${item.client.clientName}`,
    details: `${item.sessionPart}: ${item.exerciseName}`,
    start: item.sessionDate,
    minutes: item.sessionLength || 60
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="coaching-${item.client.clientCode}.ics"`
    }
  });
}
