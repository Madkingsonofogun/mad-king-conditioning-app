-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "clientCode" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "sportFocus" TEXT NOT NULL,
    "trainingDaysPerWeek" INTEGER NOT NULL,
    "sessionLength" INTEGER NOT NULL,
    "startDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "trainingDaysPerWeek" INTEGER NOT NULL,
    "sessionsPurchased" INTEGER NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsRemaining" INTEGER NOT NULL,
    "amountPaid" REAL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'Paid',
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Package_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "assessmentDate" DATETIME NOT NULL,
    "squatScore" INTEGER NOT NULL,
    "pushUpScore" INTEGER NOT NULL,
    "coreScore" INTEGER NOT NULL,
    "mobilityScore" INTEGER NOT NULL,
    "conditioningScore" INTEGER NOT NULL,
    "painLevel" INTEGER NOT NULL,
    "injuryRiskNotes" TEXT,
    "averageScore" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "planLevel" TEXT NOT NULL,
    "nextReassessmentDate" DATETIME,
    "coachNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Assessment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "energyScore" INTEGER NOT NULL,
    "painScore" INTEGER NOT NULL,
    "sorenessScore" INTEGER NOT NULL,
    "sleepScore" INTEGER NOT NULL,
    "stressScore" INTEGER NOT NULL,
    "workoutCompletionPercent" INTEGER NOT NULL,
    "performanceScore" INTEGER,
    "coachNotes" TEXT,
    "checkInResult" TEXT NOT NULL,
    "planAdjustment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyCheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sportFocus" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "planLevel" TEXT NOT NULL,
    "sessionPart" TEXT NOT NULL,
    "equipment" TEXT,
    "bodyArea" TEXT,
    "lowImpact" BOOLEAN NOT NULL DEFAULT false,
    "sets" TEXT,
    "reps" TEXT,
    "time" TEXT,
    "rest" TEXT,
    "progression" TEXT,
    "regression" TEXT,
    "coachingNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlanTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateName" TEXT NOT NULL,
    "sportFocus" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "planLevel" TEXT NOT NULL,
    "trainingDaysPerWeek" INTEGER NOT NULL,
    "sessionLength" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "sessionPart" TEXT NOT NULL,
    "exerciseId" TEXT,
    "exerciseName" TEXT NOT NULL,
    "sets" TEXT,
    "reps" TEXT,
    "time" TEXT,
    "rest" TEXT,
    "coachingNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlanTemplate_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "planLevel" TEXT NOT NULL,
    "planStatus" TEXT NOT NULL DEFAULT 'Draft',
    "generatedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedFromAssessmentId" TEXT,
    "generatedFromCheckInIds" TEXT,
    "coachApproved" BOOLEAN NOT NULL DEFAULT false,
    "coachApprovedDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyPlan_generatedFromAssessmentId_fkey" FOREIGN KEY ("generatedFromAssessmentId") REFERENCES "Assessment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyPlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monthlyPlanId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "sessionDate" DATETIME,
    "sessionLength" INTEGER NOT NULL,
    "sportFocus" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "planLevel" TEXT NOT NULL,
    "sessionPart" TEXT NOT NULL,
    "exerciseId" TEXT,
    "exerciseName" TEXT NOT NULL,
    "sets" TEXT,
    "reps" TEXT,
    "time" TEXT,
    "rest" TEXT,
    "coachNotes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonthlyPlanItem_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "MonthlyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyPlanItem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MonthlyPlanItem_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "monthlyPlanId" TEXT,
    "date" DATETIME NOT NULL,
    "week" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "workoutType" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "performanceScore" INTEGER,
    "painAfterWorkout" INTEGER,
    "coachNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutSession_monthlyPlanId_fkey" FOREIGN KEY ("monthlyPlanId") REFERENCES "MonthlyPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "noteDate" DATETIME NOT NULL,
    "noteType" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_clientCode_key" ON "ClientProfile"("clientCode");

