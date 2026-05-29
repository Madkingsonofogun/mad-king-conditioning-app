"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clearSession, createSession, login, requireAdmin, requireClient, requireCoach } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { approveMonthlyPlan, generateMonthlyPlan } from "@/lib/plan-generator";
import { assessmentStartingRecommendation, checkInWorkoutAdjustmentNote, clientLevelToPlanLevel, completePackageSession, evaluateDailyCheckIn, evaluateWeeklyCheckIn, reassessmentLevel, reassessmentMonthlyPlanNote, workoutDaysFromPackage } from "@/lib/rules";

function asInt(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value: FormDataEntryValue | null, fallback = "") {
  return String(value ?? fallback).trim();
}

async function saveUploadedImage(file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) return null;

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${safeName}`;
}

async function saveUploadedVideo(file: FormDataEntryValue | null, folder: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("video/")) return null;

  const extension = path.extname(file.name).toLowerCase() || ".mp4";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${safeName}`;
}

export async function loginAction(formData: FormData) {
  const user = await login(asString(formData.get("identifier")), asString(formData.get("password")));
  if (!user) redirect("/login?error=1");
  redirect(user.role === "CLIENT" ? "/client/dashboard" : "/admin/dashboard");
}

export async function signupAction(formData: FormData) {
  const name = asString(formData.get("name"));
  const email = asString(formData.get("email")).toLowerCase();
  const password = asString(formData.get("password"));

  if (!name || !email || password.length < 6) {
    redirect("/signup?error=missing");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/signup?error=exists");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "CLIENT"
    }
  });

  const profile = await prisma.clientProfile.create({
    data: {
      userId: user.id,
      clientCode: `CL-${Date.now().toString().slice(-6)}`,
      clientName: name,
      phone: asString(formData.get("phone")),
      email,
      goal: asString(formData.get("goal"), "General Fitness"),
      sportFocus: asString(formData.get("sportFocus"), "General Fitness"),
      trainingDaysPerWeek: asInt(formData.get("trainingDaysPerWeek"), 3),
      sessionLength: asInt(formData.get("sessionLength"), 60),
      startDate: new Date(),
      status: "Pending",
      notes: "Client self-signup. First assessment needs to be completed by coach before assigning the first plan."
    }
  });

  await prisma.scheduledAssessment.create({
    data: {
      clientId: profile.id,
      scheduledDate: assessmentDateFromForm(formData),
      status: "Client Proposed",
      proposedBy: "Client",
      notes: asString(formData.get("assessmentNotes"), "First assessment requested during client signup.")
    }
  });

  await notifyAdmins({
    title: "New assessment scheduled",
    message: `${name} signed up and requested a first assessment on ${assessmentDateFromForm(formData).toLocaleString()}.`,
    type: "ASSESSMENT_SCHEDULED",
    href: `/admin/clients/${profile.id}/assessments`,
    clientId: profile.id
  });

  await createSession(user);
  redirect("/client/dashboard");
}

async function notifyAdmins(input: { title: string; message: string; type: string; href?: string; clientId?: string }) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      clientId: input.clientId,
      title: input.title,
      message: input.message,
      type: input.type,
      href: input.href
    }))
  });
}

async function notifyAssignedCoachAndClient(clientId: string, input: { title: string; message: string; type: string; coachHref?: string; clientHref?: string }) {
  const client = await prisma.clientProfile.findUnique({ where: { id: clientId } });
  const data = [];
  if (client?.assignedCoachId) data.push({ userId: client.assignedCoachId, clientId, title: input.title, message: input.message, type: input.type, href: input.coachHref });
  if (client?.userId) data.push({ userId: client.userId, clientId, title: input.title, message: input.message, type: input.type, href: input.clientHref });
  if (data.length) await prisma.notification.createMany({ data });
}

function assessmentDateFromForm(formData: FormData) {
  const date = asString(formData.get("assessmentDate"), new Date().toISOString().slice(0, 10));
  const time = asString(formData.get("assessmentTime"), "09:00");
  return new Date(`${date}T${time}:00`);
}

async function requireCoachForClient(clientId: string, session: { userId: string; role: string }) {
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
  if (session.role !== "ADMIN" && client.assignedCoachId && client.assignedCoachId !== session.userId) {
    redirect("/admin/clients");
  }
  return client;
}

export async function createCoachAction(formData: FormData) {
  await requireAdmin();
  const name = asString(formData.get("name"));
  const pin = asString(formData.get("pin"));
  const emailInput = asString(formData.get("email")).toLowerCase();

  if (!name || !/^\d{4,8}$/.test(pin)) {
    redirect("/admin/coaches?error=pin");
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const email = emailInput || `${slug || "coach"}.${Date.now().toString().slice(-5)}@coach.local`;
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { name }] } });
  if (existing) {
    redirect("/admin/coaches?error=exists");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(pin),
      role: "COACH"
    }
  });

  revalidatePath("/admin/coaches");
}

export async function deleteCoachAction(coachId: string) {
  const session = await requireAdmin();
  if (coachId === session.userId) {
    redirect("/admin/coaches?error=self");
  }
  const coach = await prisma.user.findUniqueOrThrow({ where: { id: coachId } });
  if (!["COACH", "ADMIN"].includes(coach.role)) {
    redirect("/admin/coaches?error=role");
  }
  await prisma.user.delete({ where: { id: coachId } });
  revalidatePath("/admin/coaches");
}

export async function updateCoachPasswordAction(coachId: string, formData: FormData) {
  await requireAdmin();
  const pin = asString(formData.get("pin"));
  if (!/^\d{4,8}$/.test(pin)) {
    redirect("/admin/coaches?error=pin");
  }
  const coach = await prisma.user.findUniqueOrThrow({ where: { id: coachId } });
  if (!["ADMIN", "COACH"].includes(coach.role)) {
    redirect("/admin/coaches?error=role");
  }
  await prisma.user.update({
    where: { id: coachId },
    data: { passwordHash: await hashPassword(pin) }
  });
  revalidatePath("/admin/coaches");
  redirect("/admin/coaches?updated=pin");
}

export async function updateCoachProfileImageAction(coachId: string, formData: FormData) {
  await requireAdmin();
  const coach = await prisma.user.findUniqueOrThrow({ where: { id: coachId } });
  if (!["ADMIN", "COACH"].includes(coach.role)) {
    redirect("/admin/coaches?error=role");
  }
  const imageUrl = await saveUploadedImage(formData.get("coachImage"), "coach-images");
  if (!imageUrl) {
    redirect("/admin/coaches?error=image");
  }
  await prisma.user.update({
    where: { id: coachId },
    data: { profileImageUrl: imageUrl }
  });
  revalidatePath("/admin/coaches");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/profile");
}

export async function updateOwnCoachProfileImageAction(formData: FormData) {
  const session = await requireCoach();
  const imageUrl = await saveUploadedImage(formData.get("coachImage"), "coach-images");
  if (!imageUrl) {
    redirect("/admin/dashboard?error=image");
  }
  await prisma.user.update({
    where: { id: session.userId },
    data: { profileImageUrl: imageUrl }
  });
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/coaches");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/profile");
}

export async function logoutAction() {
  clearSession();
  redirect("/login");
}

export async function createClientAction(formData: FormData) {
  await requireAdmin();
  const client = await prisma.clientProfile.create({
    data: {
      clientCode: `CL-${Date.now().toString().slice(-6)}`,
      clientName: asString(formData.get("clientName")),
      phone: asString(formData.get("phone")),
      email: asString(formData.get("email")).toLowerCase(),
      goal: asString(formData.get("goal")),
      sportFocus: asString(formData.get("sportFocus")),
      trainingDaysPerWeek: asInt(formData.get("trainingDaysPerWeek"), 3),
      sessionLength: asInt(formData.get("sessionLength"), 60),
      startDate: new Date(asString(formData.get("startDate"), new Date().toISOString())),
      status: "Active",
      notes: asString(formData.get("notes"))
    }
  });
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  await requireAdmin();
  await prisma.clientProfile.update({
    where: { id: clientId },
    data: {
      clientName: asString(formData.get("clientName")),
      phone: asString(formData.get("phone")),
      email: asString(formData.get("email")).toLowerCase(),
      goal: asString(formData.get("goal")),
      sportFocus: asString(formData.get("sportFocus")),
      trainingDaysPerWeek: asInt(formData.get("trainingDaysPerWeek"), 3),
      sessionLength: asInt(formData.get("sessionLength"), 60),
      status: asString(formData.get("status"), "Active"),
      notes: asString(formData.get("notes"))
    }
  });
  revalidatePath(`/admin/clients/${clientId}`);
  redirect(`/admin/clients/${clientId}`);
}

export async function assignCoachAction(clientId: string, formData: FormData) {
  await requireAdmin();
  const assignedCoachId = asString(formData.get("assignedCoachId")) || null;
  await prisma.clientProfile.update({
    where: { id: clientId },
    data: { assignedCoachId }
  });
  if (assignedCoachId) {
    const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
    await prisma.notification.create({
      data: {
        userId: assignedCoachId,
        clientId,
        title: "Client assigned",
        message: `${client.clientName} has been assigned to you.`,
        type: "CLIENT_ASSIGNED",
        href: `/admin/clients/${clientId}`
      }
    });
  }
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteClientAction(clientId: string) {
  await requireAdmin();
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
  await prisma.$transaction(async (tx) => {
    await tx.clientProfile.delete({ where: { id: clientId } });
    if (client.userId) {
      await tx.user.deleteMany({ where: { id: client.userId, role: "CLIENT" } });
    }
  });
  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

export async function createClientLoginAction(clientId: string, formData: FormData) {
  await requireAdmin();
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
  const user = await prisma.user.upsert({
    where: { email: asString(formData.get("email"), client.email).toLowerCase() },
    update: {
      name: client.clientName,
      passwordHash: await hashPassword(asString(formData.get("password"), "client123")),
      role: "CLIENT"
    },
    create: {
      name: client.clientName,
      email: asString(formData.get("email"), client.email).toLowerCase(),
      passwordHash: await hashPassword(asString(formData.get("password"), "client123")),
      role: "CLIENT"
    }
  });
  await prisma.clientProfile.update({ where: { id: clientId }, data: { userId: user.id } });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function createPackageAction(clientId: string, formData: FormData) {
  await requireAdmin();
  const days = workoutDaysFromPackage(asInt(formData.get("trainingDaysPerWeek"), 3));
  const purchased = asInt(formData.get("sessionsPurchased"), days * 4);
  const used = asInt(formData.get("sessionsUsed"), 0);
  await prisma.package.create({
    data: {
      clientId,
      packageType: asString(formData.get("packageType"), `${days}-day package`),
      trainingDaysPerWeek: days,
      sessionsPurchased: purchased,
      sessionsUsed: used,
      sessionsRemaining: Math.max(0, purchased - used),
      amountPaid: Number(formData.get("amountPaid") || 0),
      paymentStatus: asString(formData.get("paymentStatus"), "Paid"),
      purchaseDate: new Date(asString(formData.get("purchaseDate"), new Date().toISOString())),
      expirationDate: formData.get("expirationDate") ? new Date(asString(formData.get("expirationDate"))) : null,
      status: asString(formData.get("status"), "Active")
    }
  });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function updatePackageAction(clientId: string, packageId: string, formData: FormData) {
  await requireAdmin();
  const days = workoutDaysFromPackage(asInt(formData.get("trainingDaysPerWeek"), 3));
  const purchased = asInt(formData.get("sessionsPurchased"), 0);
  const used = asInt(formData.get("sessionsUsed"), 0);
  await prisma.package.update({
    where: { id: packageId },
    data: {
      packageType: asString(formData.get("packageType")),
      trainingDaysPerWeek: days,
      sessionsPurchased: purchased,
      sessionsUsed: used,
      sessionsRemaining: Math.max(0, purchased - used),
      amountPaid: Number(formData.get("amountPaid") || 0),
      paymentStatus: asString(formData.get("paymentStatus"), "Paid"),
      purchaseDate: new Date(asString(formData.get("purchaseDate"), new Date().toISOString())),
      expirationDate: formData.get("expirationDate") ? new Date(asString(formData.get("expirationDate"))) : null,
      status: asString(formData.get("status"), "Active")
    }
  });
  revalidatePath(`/admin/clients/${clientId}/packages`);
}

export async function deletePackageAction(clientId: string, packageId: string) {
  await requireAdmin();
  await prisma.package.delete({ where: { id: packageId } });
  revalidatePath(`/admin/clients/${clientId}/packages`);
}

export async function createAssessmentAction(clientId: string, formData: FormData) {
  const session = await requireCoach();
  const assignedClient = await requireCoachForClient(clientId, session);
  const lockedAppointment = await prisma.scheduledAssessment.findFirst({
    where: {
      clientId,
      status: "Scheduled",
      OR: [
        { coachId: session.userId },
        session.role === "ADMIN" ? {} : { coachId: null }
      ]
    },
    orderBy: { scheduledDate: "desc" }
  });
  const assessmentType = asString(formData.get("assessmentType"), "Initial");
  const raw = {
    squat: asInt(formData.get("squatScore")),
    hinge: asInt(formData.get("hingeScore")),
    lunge: asInt(formData.get("lungeScore")),
    push: asInt(formData.get("pushUpScore")),
    pull: asInt(formData.get("pullScore")),
    core: asInt(formData.get("coreScore")),
    balance: asInt(formData.get("balanceScore")),
    mobility: asInt(formData.get("mobilityScore")),
    cardio: asInt(formData.get("cardioScore")),
    strength: asInt(formData.get("strengthScore")),
    pain: asInt(formData.get("painLevel"))
  };
  const flags = {
    chestPainDizziness: formData.get("chestPainDizziness") === "Yes",
    recentSurgeryInjury: formData.get("recentSurgeryInjury") === "Yes",
    painDailyTasks: formData.get("painDailyTasks") === "Yes",
    cannotStandFiveMin: formData.get("cannotStandFiveMin") === "Yes",
    fallRisk: formData.get("fallRisk") === "Yes",
    jointLimitation: formData.get("jointLimitation") === "Yes"
  };
  const movementScores = [raw.squat, raw.hinge, raw.lunge, raw.push, raw.pull, raw.core, raw.balance, raw.mobility, raw.cardio, raw.strength];
  const movementAverage = movementScores.reduce((sum, score) => sum + score, 0) / movementScores.length;
  const averageScore = Math.round(movementAverage * 20 * 10) / 10;
  const riskLevel = flags.chestPainDizziness
    ? "Critical"
    : flags.recentSurgeryInjury || flags.painDailyTasks || flags.fallRisk
      ? "High"
      : flags.cannotStandFiveMin || flags.jointLimitation || raw.pain >= 4
        ? "Medium"
        : "Clear";
  const planLevel = riskLevel === "Critical" || riskLevel === "High" || averageScore < 50
    ? "Recovery"
    : averageScore >= 80 && raw.pain <= 1 && riskLevel === "Clear"
      ? "Progression"
      : "Baseline";
  const previousAssessment = await prisma.assessment.findFirst({ where: { clientId }, orderBy: { assessmentDate: "desc" } });
  const latestCheckIn = await prisma.weeklyCheckIn.findFirst({ where: { clientId }, orderBy: { weekStartDate: "desc" } });
  const clientLevel = reassessmentLevel({
    score: averageScore,
    injuryOrSickness: flags.chestPainDizziness || flags.recentSurgeryInjury,
    seriousPain: raw.pain >= 4 || flags.painDailyTasks,
    workoutCompletionPercent: latestCheckIn?.workoutCompletionPercent ?? 75,
    recoveryScore: latestCheckIn ? Math.round((latestCheckIn.energyScore + latestCheckIn.sleepScore) / 2) : 6,
    sorenessScore: latestCheckIn?.sorenessScore ?? 5,
    energyScore: latestCheckIn?.energyScore ?? 6,
    previousLevel: previousAssessment?.clientLevel,
    manualOverride: asString(formData.get("levelOverride"))
  });
  const lowAreas = [
    ["Squat", raw.squat],
    ["Hinge", raw.hinge],
    ["Lunge", raw.lunge],
    ["Push", raw.push],
    ["Pull", raw.pull],
    ["Core", raw.core],
    ["Balance", raw.balance],
    ["Mobility", raw.mobility],
    ["Cardio", raw.cardio],
    ["Strength", raw.strength]
  ].filter(([, score]) => Number(score) <= 2).map(([name]) => name).join(", ");
  const assessment = await prisma.assessment.create({
    data: {
      clientId,
      coachId: lockedAppointment?.coachId ?? (session.role === "ADMIN" ? assignedClient.assignedCoachId : session.userId),
      assessmentDate: new Date(asString(formData.get("assessmentDate"), new Date().toISOString())),
      assessmentType,
      ...flags,
      squatScore: raw.squat * 20,
      hingeScore: raw.hinge * 20,
      lungeScore: raw.lunge * 20,
      pushUpScore: raw.push * 20,
      pullScore: raw.pull * 20,
      coreScore: raw.core * 20,
      balanceScore: raw.balance * 20,
      mobilityScore: raw.mobility * 20,
      cardioScore: raw.cardio * 20,
      strengthScore: raw.strength * 20,
      conditioningScore: raw.cardio * 20,
      painLevel: raw.pain,
      equipmentScore: asInt(formData.get("equipmentScore"), 0),
      averageScore,
      riskLevel,
      planLevel: assessmentType === "Reassessment" ? clientLevelToPlanLevel(clientLevel) : planLevel,
      clientLevel,
      levelOverride: asString(formData.get("levelOverride")) || null,
      movementFocus: lowAreas || "No major movement gaps",
      restrictions: Object.entries(flags).filter(([, value]) => value).map(([key]) => key.replace(/([A-Z])/g, " $1")).join(", "),
      injuryRiskNotes: asString(formData.get("injuryRiskNotes")),
      nextReassessmentDate: formData.get("nextReassessmentDate") ? new Date(asString(formData.get("nextReassessmentDate"))) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      coachNotes: asString(formData.get("coachNotes"))
    }
  });
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: clientId },
    include: { packages: { where: { status: "Active" }, orderBy: { purchaseDate: "desc" }, take: 1 } }
  });
  const recommendation = assessmentStartingRecommendation({
    clientName: client.clientName,
    sportFocus: client.sportFocus,
    goal: client.goal,
    trainingDaysPerWeek: client.packages[0]?.trainingDaysPerWeek ?? client.trainingDaysPerWeek,
    sessionLength: client.sessionLength,
    packageType: client.packages[0]?.packageType,
    planLevel,
    riskLevel,
    averageScore,
    movementFocus: lowAreas || "No major movement gaps"
  });
  await prisma.coachNote.create({
    data: {
      clientId,
      noteDate: new Date(),
      noteType: "Assessment Recommendation",
      note: recommendation,
      visibleToClient: true
    }
  });
  if (assessmentType === "Reassessment") {
    const monthlyNote = reassessmentMonthlyPlanNote(clientLevel);
    const activePlan = await prisma.monthlyPlan.findFirst({ where: { clientId, planStatus: "Active", coachApproved: true } });
    if (activePlan) {
      await prisma.monthlyPlan.update({
        where: { id: activePlan.id },
        data: {
          planLevel: clientLevelToPlanLevel(clientLevel),
          notes: `${activePlan.notes ?? ""}\n${monthlyNote}`.trim()
        }
      });
      await prisma.monthlyPlanItem.updateMany({
        where: { monthlyPlanId: activePlan.id, completed: false },
        data: {
          planLevel: clientLevelToPlanLevel(clientLevel),
          coachNotes: monthlyNote
        }
      });
    }
  }
  if (client.userId) {
    await prisma.notification.create({
      data: {
        userId: client.userId,
        clientId,
        title: "Assessment result ready",
        message: `Your starting workout level is ${assessment.planLevel}.`,
        type: "ASSESSMENT_RESULT",
        href: "/client/dashboard"
      }
    });
  }
  if (lockedAppointment) {
    await prisma.scheduledAssessment.update({
      where: { id: lockedAppointment.id },
      data: { status: "Completed" }
    });
  }
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/dashboard");
  revalidatePath("/client/notes");
}

export async function dailyCheckInAction(formData: FormData) {
  const { profile } = await requireClient();
  const values = {
    feelsGood: formData.get("feelsGood") === "on",
    energyScore: asInt(formData.get("energyScore"), 5),
    sorenessScore: asInt(formData.get("sorenessScore"), 5),
    injuredOrSick: formData.get("injuredOrSick") === "on",
    painArea: asString(formData.get("painArea")) || null
  };
  const result = evaluateDailyCheckIn(values);
  await prisma.dailyCheckIn.create({
    data: {
      clientId: profile.id,
      ...values,
      adjustment: result.adjustment,
      adjustmentNote: result.note
    }
  });
  revalidatePath("/client/dashboard");
  revalidatePath("/client/workouts");
}

export async function scheduleAssessmentAction(clientId: string, formData: FormData) {
  const session = await requireCoach();
  await requireCoachForClient(clientId, session);
  const scheduledDate = assessmentDateFromForm(formData);
  const selectedCoachId = session.role === "ADMIN" ? asString(formData.get("coachId"), session.userId) : session.userId;
  await prisma.scheduledAssessment.create({
    data: {
      clientId,
      coachId: selectedCoachId,
      scheduledDate,
      status: "Coach Proposed",
      proposedBy: "Coach",
      notes: asString(formData.get("assessmentNotes"))
    }
  });
  await notifyAssignedCoachAndClient(clientId, {
    title: "Assessment time proposed",
    message: `Your coach proposed ${scheduledDate.toLocaleString()}. Please accept, decline, or offer another time.`,
    type: "ASSESSMENT_SCHEDULED",
    coachHref: `/admin/clients/${clientId}/assessments`,
    clientHref: "/client/assessments"
  });
  revalidatePath(`/admin/clients/${clientId}/assessments`);
  revalidatePath("/client/assessments");
}

export async function cancelScheduledAssessmentAction(clientId: string, appointmentId: string) {
  const session = await requireCoach();
  await requireCoachForClient(clientId, session);
  await prisma.scheduledAssessment.update({
    where: { id: appointmentId },
    data: { status: "Canceled" }
  });
  await notifyAssignedCoachAndClient(clientId, {
    title: "Assessment canceled",
    message: "An assessment appointment was canceled.",
    type: "ASSESSMENT_CANCELED",
    coachHref: `/admin/clients/${clientId}/assessments`,
    clientHref: "/client/dashboard"
  });
  revalidatePath(`/admin/clients/${clientId}/assessments`);
}

export async function acceptAssessmentAction(appointmentId: string) {
  const { profile } = await requireClient();
  const appointment = await prisma.scheduledAssessment.findFirstOrThrow({ where: { id: appointmentId, clientId: profile.id } });
  await prisma.scheduledAssessment.update({
    where: { id: appointment.id },
    data: { status: "Scheduled", lockedAt: new Date(), responseNotes: "Client accepted this assessment time." }
  });
  await notifyAssignedCoachAndClient(profile.id, {
    title: "Assessment accepted",
    message: `${profile.clientName} accepted ${appointment.scheduledDate.toLocaleString()}. The date is locked on both schedules.`,
    type: "ASSESSMENT_ACCEPTED",
    coachHref: `/admin/clients/${profile.id}/assessments`,
    clientHref: "/client/assessments"
  });
  revalidatePath("/client/assessments");
  revalidatePath("/client/dashboard");
  revalidatePath(`/admin/clients/${profile.id}/assessments`);
}

export async function declineAssessmentAction(appointmentId: string, formData: FormData) {
  const { profile } = await requireClient();
  const appointment = await prisma.scheduledAssessment.findFirstOrThrow({ where: { id: appointmentId, clientId: profile.id } });
  await prisma.scheduledAssessment.update({
    where: { id: appointment.id },
    data: { status: "Declined", responseNotes: asString(formData.get("responseNotes"), "Client declined this assessment time.") }
  });
  await notifyAssignedCoachAndClient(profile.id, {
    title: "Assessment declined",
    message: `${profile.clientName} declined ${appointment.scheduledDate.toLocaleString()}. Open chat or offer another date.`,
    type: "ASSESSMENT_DECLINED",
    coachHref: `/admin/clients/${profile.id}/assessments`,
    clientHref: "/client/assessments"
  });
  revalidatePath("/client/assessments");
  revalidatePath(`/admin/clients/${profile.id}/assessments`);
}

export async function proposeAlternateAssessmentAction(appointmentId: string, formData: FormData) {
  const { profile } = await requireClient();
  const appointment = await prisma.scheduledAssessment.findFirstOrThrow({ where: { id: appointmentId, clientId: profile.id } });
  const scheduledDate = assessmentDateFromForm(formData);
  await prisma.scheduledAssessment.update({
    where: { id: appointment.id },
    data: {
      scheduledDate,
      status: "Client Proposed",
      proposedBy: "Client",
      lockedAt: null,
      responseNotes: asString(formData.get("responseNotes"), "Client offered an alternate assessment time.")
    }
  });
  await notifyAssignedCoachAndClient(profile.id, {
    title: "Client proposed another assessment time",
    message: `${profile.clientName} proposed ${scheduledDate.toLocaleString()}. Accept it or offer another date.`,
    type: "ASSESSMENT_COUNTER",
    coachHref: `/admin/clients/${profile.id}/assessments`,
    clientHref: "/client/assessments"
  });
  revalidatePath("/client/assessments");
  revalidatePath(`/admin/clients/${profile.id}/assessments`);
}

export async function acceptClientProposedAssessmentAction(clientId: string, appointmentId: string) {
  const session = await requireCoach();
  await requireCoachForClient(clientId, session);
  const appointment = await prisma.scheduledAssessment.findFirstOrThrow({ where: { id: appointmentId, clientId } });
  await prisma.scheduledAssessment.update({
    where: { id: appointment.id },
    data: { status: "Scheduled", coachId: appointment.coachId ?? session.userId, lockedAt: new Date(), responseNotes: "Coach accepted this assessment time." }
  });
  await notifyAssignedCoachAndClient(clientId, {
    title: "Assessment locked in",
    message: `Your assessment is locked for ${appointment.scheduledDate.toLocaleString()}.`,
    type: "ASSESSMENT_ACCEPTED",
    coachHref: `/admin/clients/${clientId}/assessments`,
    clientHref: "/client/assessments"
  });
  revalidatePath(`/admin/clients/${clientId}/assessments`);
  revalidatePath("/client/assessments");
  revalidatePath("/client/dashboard");
}

export async function offerAnotherAssessmentAction(clientId: string, appointmentId: string, formData: FormData) {
  const session = await requireCoach();
  await requireCoachForClient(clientId, session);
  const scheduledDate = assessmentDateFromForm(formData);
  const selectedCoachId = session.role === "ADMIN" ? asString(formData.get("coachId"), session.userId) : session.userId;
  await prisma.scheduledAssessment.update({
    where: { id: appointmentId },
    data: {
      coachId: selectedCoachId,
      scheduledDate,
      status: "Coach Proposed",
      proposedBy: "Coach",
      lockedAt: null,
      responseNotes: null,
      notes: asString(formData.get("assessmentNotes"), "Coach offered another assessment time.")
    }
  });
  await notifyAssignedCoachAndClient(clientId, {
    title: "New assessment time proposed",
    message: `Your coach proposed ${scheduledDate.toLocaleString()}. Please accept, decline, or offer another time.`,
    type: "ASSESSMENT_SCHEDULED",
    coachHref: `/admin/clients/${clientId}/assessments`,
    clientHref: "/client/assessments"
  });
  revalidatePath(`/admin/clients/${clientId}/assessments`);
  revalidatePath("/client/assessments");
}

export async function sendCoachChatMessageAction(clientId: string, formData: FormData) {
  const session = await requireCoach();
  const message = asString(formData.get("message"));
  if (!message) return;
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
  if (session.role !== "ADMIN" && client.assignedCoachId && client.assignedCoachId !== session.userId) {
    redirect("/admin/clients");
  }
  await prisma.chatMessage.create({
    data: { clientId, senderId: session.userId, message }
  });
  if (client.userId) {
    await prisma.notification.create({
      data: {
        userId: client.userId,
        clientId,
        title: "New message from coach",
        message,
        type: "CHAT",
        href: "/client/chat"
      }
    });
  }
  revalidatePath(`/admin/clients/${clientId}/chat`);
}

export async function sendClientChatMessageAction(formData: FormData) {
  const { session, profile } = await requireClient();
  const message = asString(formData.get("message"));
  if (!message) return;
  if (!profile.assignedCoachId) {
    redirect("/client/chat?error=no-coach");
  }
  await prisma.chatMessage.create({
    data: { clientId: profile.id, senderId: session.userId, message }
  });
  await prisma.notification.create({
    data: {
      userId: profile.assignedCoachId,
      clientId: profile.id,
      title: "New client message",
      message,
      type: "CHAT",
      href: `/admin/clients/${profile.id}/chat`
    }
  });
  revalidatePath("/client/chat");
}

export async function updateClientProfileImageAction(formData: FormData) {
  const { profile } = await requireClient();
  const imageUrl = await saveUploadedImage(formData.get("profileImage"), "profile-images");
  if (!imageUrl) {
    redirect("/client/profile?error=image");
  }
  await prisma.clientProfile.update({
    where: { id: profile.id },
    data: { profileImageUrl: imageUrl }
  });
  revalidatePath("/client/profile");
  revalidatePath(`/admin/clients/${profile.id}`);
}

export async function updateClientProfileImageByCoachAction(clientId: string, formData: FormData) {
  const session = await requireCoach();
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
  if (session.role !== "ADMIN" && client.assignedCoachId && client.assignedCoachId !== session.userId) {
    redirect("/admin/clients");
  }
  const imageUrl = await saveUploadedImage(formData.get("profileImage"), "profile-images");
  if (!imageUrl) {
    redirect(`/admin/clients/${clientId}?error=image`);
  }
  await prisma.clientProfile.update({
    where: { id: clientId },
    data: { profileImageUrl: imageUrl }
  });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/profile");
}

export async function addProgressImageAction(formData: FormData) {
  const { profile } = await requireClient();
  const imageUrl = await saveUploadedImage(formData.get("progressImage"), "progress-images");
  if (!imageUrl) {
    redirect("/client/profile?error=image");
  }
  await prisma.progressImage.create({
    data: {
      clientId: profile.id,
      imageUrl,
      caption: asString(formData.get("caption")),
      imageDate: formData.get("imageDate") ? new Date(asString(formData.get("imageDate"))) : new Date()
    }
  });
  revalidatePath("/client/profile");
  revalidatePath(`/admin/clients/${profile.id}`);
}

export async function addProgressImageByCoachAction(clientId: string, formData: FormData) {
  const session = await requireCoach();
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
  if (session.role !== "ADMIN" && client.assignedCoachId && client.assignedCoachId !== session.userId) {
    redirect("/admin/clients");
  }
  const imageUrl = await saveUploadedImage(formData.get("progressImage"), "progress-images");
  if (!imageUrl) {
    redirect(`/admin/clients/${clientId}?error=image`);
  }
  await prisma.progressImage.create({
    data: {
      clientId,
      imageUrl,
      caption: asString(formData.get("caption")),
      imageDate: formData.get("imageDate") ? new Date(asString(formData.get("imageDate"))) : new Date()
    }
  });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/client/profile");
}

export async function createCheckInAction(clientId: string, formData: FormData) {
  await requireCoach();
  await saveCheckIn(clientId, formData, "coach");
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function clientCheckInAction(formData: FormData) {
  const { profile } = await requireClient();
  await saveCheckIn(profile.id, formData, "client");
  revalidatePath("/client/check-in");
  redirect("/client/dashboard");
}

async function saveCheckIn(clientId: string, formData: FormData, source: "coach" | "client") {
  const values = {
    energyScore: asInt(formData.get("energyScore")),
    painScore: asInt(formData.get("painScore")),
    sorenessScore: asInt(formData.get("sorenessScore")),
    sleepScore: asInt(formData.get("sleepScore")),
    stressScore: asInt(formData.get("stressScore")),
    workoutCompletionPercent: asInt(formData.get("workoutCompletionPercent")),
    performanceScore: asInt(formData.get("performanceScore"), 0)
  };
  const result = evaluateWeeklyCheckIn(values);
  await prisma.weeklyCheckIn.create({
    data: {
      clientId,
      weekStartDate: new Date(asString(formData.get("weekStartDate"), new Date().toISOString())),
      ...values,
      performanceScore: values.performanceScore || null,
      coachNotes: source === "coach" ? asString(formData.get("coachNotes")) : "Submitted by client",
      ...result
    }
  });
  if (source === "client") {
    const note = checkInWorkoutAdjustmentNote(result.planAdjustment);
    await notifyAssignedCoachAndClient(clientId, {
      title: "Check-in reviewed",
      message: `Workout adjustment: ${result.planAdjustment}. ${note}`,
      type: "CHECK_IN_ADJUSTMENT",
      coachHref: `/admin/clients/${clientId}/check-ins`,
      clientHref: "/client/workouts"
    });
  }
}

export async function createNoteAction(clientId: string, formData: FormData) {
  await requireCoach();
  await prisma.coachNote.create({
    data: {
      clientId,
      noteDate: new Date(asString(formData.get("noteDate"), new Date().toISOString())),
      noteType: asString(formData.get("noteType"), "Coach Note"),
      note: asString(formData.get("note")),
      visibleToClient: formData.get("visibleToClient") === "on"
    }
  });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function generatePlanAction(clientId: string, formData: FormData) {
  await requireCoach();
  const plan = await generateMonthlyPlan(clientId, asInt(formData.get("month"), new Date().getMonth() + 1), asInt(formData.get("year"), new Date().getFullYear()));
  redirect(`/admin/clients/${clientId}/monthly-plans/${plan.id}`);
}

export async function adoptAssessmentSuggestionAction(clientId: string) {
  await requireCoach();
  const now = new Date();
  const plan = await generateMonthlyPlan(clientId, now.getMonth() + 1, now.getFullYear());
  redirect(`/admin/clients/${clientId}/monthly-plans/${plan.id}`);
}

export async function approvePlanAction(clientId: string, planId: string) {
  await requireCoach();
  await approveMonthlyPlan(planId);
  revalidatePath(`/admin/clients/${clientId}/monthly-plans/${planId}`);
}

export async function archivePlanAction(clientId: string, planId: string) {
  await requireCoach();
  await prisma.monthlyPlan.update({ where: { id: planId }, data: { planStatus: "Archived" } });
  revalidatePath(`/admin/clients/${clientId}/monthly-plans/${planId}`);
}

export async function updatePlanItemAction(clientId: string, planId: string, itemId: string, formData: FormData) {
  await requireCoach();
  await prisma.monthlyPlanItem.update({
    where: { id: itemId },
    data: {
      exerciseName: asString(formData.get("exerciseName")),
      sets: asString(formData.get("sets")),
      reps: asString(formData.get("reps")),
      time: asString(formData.get("time")),
      rest: asString(formData.get("rest")),
      weight: asString(formData.get("weight")),
      coachNotes: asString(formData.get("coachNotes"))
    }
  });
  revalidatePath(`/admin/clients/${clientId}/monthly-plans/${planId}`);
}

export async function addPlanItemAction(clientId: string, planId: string, formData: FormData) {
  await requireCoach();
  const plan = await prisma.monthlyPlan.findFirstOrThrow({ where: { id: planId, clientId } });
  const client = await prisma.clientProfile.findUniqueOrThrow({ where: { id: clientId } });
  await prisma.monthlyPlanItem.create({
    data: {
      monthlyPlanId: plan.id,
      clientId,
      week: asInt(formData.get("week"), 1),
      day: asInt(formData.get("day"), 1),
      sessionLength: client.sessionLength,
      sportFocus: client.sportFocus,
      goal: client.goal,
      planLevel: plan.planLevel,
      sessionPart: asString(formData.get("sessionPart"), "Conditioning"),
      exerciseName: asString(formData.get("exerciseName")),
      sets: asString(formData.get("sets")),
      reps: asString(formData.get("reps")),
      time: asString(formData.get("time")),
      rest: asString(formData.get("rest")),
      weight: asString(formData.get("weight")),
      coachNotes: asString(formData.get("coachNotes"))
    }
  });
  revalidatePath(`/admin/clients/${clientId}/monthly-plans/${planId}`);
}

export async function deletePlanItemAction(clientId: string, planId: string, itemId: string) {
  await requireCoach();
  await prisma.monthlyPlanItem.delete({ where: { id: itemId } });
  revalidatePath(`/admin/clients/${clientId}/monthly-plans/${planId}`);
}

export async function markWorkoutCompleteAction(itemId: string) {
  const { profile } = await requireClient();
  const item = await prisma.monthlyPlanItem.findFirstOrThrow({ where: { id: itemId, clientId: profile.id } });
  await prisma.monthlyPlanItem.update({
    where: { id: item.id },
    data: { completed: true, completedDate: new Date() }
  });
  await prisma.workoutSession.create({
    data: {
      clientId: profile.id,
      monthlyPlanId: item.monthlyPlanId,
      date: new Date(),
      week: item.week,
      day: item.day,
      workoutType: `${item.sportFocus} ${item.planLevel}`,
      completed: true
    }
  });
  const pkg = await prisma.package.findFirst({ where: { clientId: profile.id, status: "Active" }, orderBy: { purchaseDate: "desc" } });
  if (pkg) {
    await prisma.package.update({ where: { id: pkg.id }, data: completePackageSession(pkg) });
  }
  revalidatePath("/client/workouts");
}

export async function createExerciseAction(formData: FormData) {
  await requireAdmin();
  const uploadedVideoUrl = await saveUploadedVideo(formData.get("videoFile"), "exercise-videos");
  if (uploadedVideoUrl) formData.set("videoUrl", uploadedVideoUrl);
  await prisma.exercise.create({
    data: exerciseDataFromForm(formData)
  });
  revalidatePath("/admin/exercise-library");
}

export async function updateExerciseAction(exerciseId: string, formData: FormData) {
  await requireAdmin();
  const uploadedVideoUrl = await saveUploadedVideo(formData.get("videoFile"), "exercise-videos");
  if (uploadedVideoUrl) formData.set("videoUrl", uploadedVideoUrl);
  await prisma.exercise.update({
    where: { id: exerciseId },
    data: exerciseDataFromForm(formData)
  });
  revalidatePath("/admin/exercise-library");
}

export async function deleteExerciseAction(exerciseId: string) {
  await requireAdmin();
  await prisma.exercise.delete({ where: { id: exerciseId } });
  revalidatePath("/admin/exercise-library");
}

function exerciseDataFromForm(formData: FormData) {
  const existingVideoUrl = asString(formData.get("existingVideoUrl"));
  const pastedVideoUrl = asString(formData.get("videoUrl"));
  return {
    exerciseName: asString(formData.get("exerciseName")),
    category: asString(formData.get("category"), "Conditioning"),
    sportFocus: asString(formData.get("sportFocus"), "General Fitness"),
    goal: asString(formData.get("goal"), "Conditioning"),
    difficulty: asString(formData.get("difficulty"), "Medium"),
    planLevel: asString(formData.get("planLevel"), "Baseline"),
    sessionPart: asString(formData.get("sessionPart"), "Conditioning"),
    equipment: asString(formData.get("equipment")),
    bodyArea: asString(formData.get("bodyArea")),
    lowImpact: formData.get("lowImpact") === "on",
    sets: asString(formData.get("sets")),
    reps: asString(formData.get("reps")),
    time: asString(formData.get("time")),
    rest: asString(formData.get("rest")),
    description: asString(formData.get("description")),
    videoUrl: pastedVideoUrl || existingVideoUrl,
    progression: asString(formData.get("progression")),
    regression: asString(formData.get("regression")),
    coachingNotes: asString(formData.get("coachingNotes"))
  };
}

export async function createPlanTemplateAction(formData: FormData) {
  await requireAdmin();
  await prisma.planTemplate.create({
    data: {
      templateName: asString(formData.get("templateName")),
      sportFocus: asString(formData.get("sportFocus"), "General Fitness"),
      goal: asString(formData.get("goal"), "Conditioning"),
      planLevel: asString(formData.get("planLevel"), "Baseline"),
      trainingDaysPerWeek: workoutDaysFromPackage(asInt(formData.get("trainingDaysPerWeek"), 3)),
      sessionLength: asInt(formData.get("sessionLength"), 60),
      week: asInt(formData.get("week"), 1),
      day: asInt(formData.get("day"), 1),
      sessionPart: asString(formData.get("sessionPart"), "Conditioning"),
      exerciseName: asString(formData.get("exerciseName")),
      sets: asString(formData.get("sets")),
      reps: asString(formData.get("reps")),
      time: asString(formData.get("time")),
      rest: asString(formData.get("rest")),
      coachingNotes: asString(formData.get("coachingNotes"))
    }
  });
  revalidatePath("/admin/plan-templates");
}

export async function deletePlanTemplateGroupAction(templateName: string, sportFocus: string, goal: string, planLevel: string, trainingDaysPerWeek: number, sessionLength: number) {
  await requireAdmin();
  await prisma.planTemplate.deleteMany({
    where: { templateName, sportFocus, goal, planLevel, trainingDaysPerWeek, sessionLength }
  });
  revalidatePath("/admin/plan-templates");
}
