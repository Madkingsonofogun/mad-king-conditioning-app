import { prisma } from "@/lib/prisma";
import { activePlanVisible } from "@/lib/rules";

export async function getClientOwnedProfile(userId: string) {
  return prisma.clientProfile.findUnique({ where: { userId } });
}

export async function getClientVisibleMonthlyPlan(clientId: string) {
  const plan = await prisma.monthlyPlan.findFirst({
    where: { clientId, planStatus: "Active", coachApproved: true },
    include: { items: { include: { exercise: true }, orderBy: [{ week: "asc" }, { day: "asc" }, { sessionPart: "asc" }] } },
    orderBy: { coachApprovedDate: "desc" }
  });
  return plan && activePlanVisible(plan) ? plan : null;
}

export async function getClientVisibleNotes(clientId: string) {
  return prisma.coachNote.findMany({
    where: { clientId, visibleToClient: true },
    orderBy: { noteDate: "desc" }
  });
}

export async function getActivePackage(clientId: string) {
  return prisma.package.findFirst({
    where: { clientId, status: "Active" },
    orderBy: { purchaseDate: "desc" }
  });
}
