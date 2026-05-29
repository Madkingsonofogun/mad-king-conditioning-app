# Mad King Conditioning

Web-friendly coaching app for boxing, kickboxing, fight conditioning, and personal training.

## What Is Included

- Next.js app with coach/admin and client areas
- Responsive desktop, tablet, and mobile dashboard shell
- PWA install support with manifest, service worker, and Mad King icon
- Prisma data model backed by SQLite
- Email/password authentication with hashed passwords
- Role-based route protection for ADMIN/COACH/CLIENT
- Client data isolation by `clientId`
- Package tracking with sessions used and remaining
- Assessment and weekly check-in logic
- Monthly plan generation from templates and exercise library
- Draft, Active, Completed, and Archived monthly plan statuses
- Coach-visible and private notes
- Seed data for Marcus Johnson, Tasha Reed, and Diego Santos
- Business-rule test suite

## Install Dependencies

```bash
npm install
```

On this Windows workspace, using a project-local cache also works:

```bash
npm install --cache ./.npm-cache
```

## Environment Variables

Copy `.env.example` to `.env` and set:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
```

## Database Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

If Prisma reports that the SQLite file does not exist on Windows, create it first through Prisma and then sync:

```bash
npx prisma db push
```

Seed the database:

```bash
npm run prisma:seed
```

## Start Locally

```bash
npm run dev
```

Open:

[http://localhost:3000](http://localhost:3000)

On Windows, you can also double-click `RUN APP - DOUBLE CLICK.bat` and keep that window open while using the app.

## Deploy To Vercel

Push the repo to GitHub, then create a Vercel project from that GitHub repo.

Use these settings:

- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave blank

Set environment variables in Vercel:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="replace-with-a-long-random-secret"
```

For production with real shared data, replace SQLite with a hosted PostgreSQL database and set `DATABASE_URL` to the PostgreSQL connection string. The Prisma schema is organized so the datasource can be changed later.

Dynamic admin and client routes use runtime rendering because they depend on the logged-in user and live client data.

## Install As App

After deploying over HTTPS, open the site on a phone or desktop browser and choose **Add to Home Screen** or **Install App**. The app includes a web manifest, service worker, app icon, and standalone display mode.

## Test Login Credentials

Coach:

- Coach name: `Coach Mike`
- PIN: `2468`

Admin:

- PIN only: `1234`
- Leave the coach name/client email field blank.

Clients:

- Marcus Johnson: `marcus@example.com` / `marcus123`
- Tasha Reed: `tasha@example.com` / `tasha123`
- Diego Santos: `diego@example.com` / `diego123`

## Run Tests

```bash
npm test
```

Current suite covers 32 checks for login hashing, package day logic, assessment levels, weekly check-in adjustments, monthly plan visibility, active-plan rules, session remaining updates, and client data isolation.

## Monthly Plan Generator

The coach opens a client and clicks **Generate New Month Plan**.

The generator reviews:

- Latest assessment
- Previous 4 weekly check-ins
- Pain, energy, sleep, soreness, stress, completion, and performance
- Active package training days
- Session length
- Client goal and sport focus

It chooses the next plan level:

- Strong recent check-ins progress the plan
- Poor recent check-ins make it easier
- Average recent check-ins keep the same level

It then finds templates in this order:

1. Exact sport focus, goal, plan level, training days, and session length
2. Same sport focus and plan level
3. General Fitness with same plan level
4. Baseline General Fitness

Generated plans are saved as `Draft`. The client cannot see them until the coach approves the plan. Approving a plan makes it `Active` and marks any previous active plan for that client as `Completed`.

## Add New Plan Templates

Add rows through Prisma Studio, a seed update, or an admin extension using the `PlanTemplate` model.

Each template row should include:

- `sportFocus`
- `goal`
- `planLevel`
- `trainingDaysPerWeek`
- `sessionLength`
- `week`
- `day`
- `sessionPart`
- Exercise details

Use the same `templateName` across all rows that belong to one plan.

## Add New Exercises

Add exercises to the `Exercise` model with:

- Category
- Sport focus
- Goal
- Difficulty
- Plan level
- Session part
- Sets, reps, time, rest
- Progression/regression notes

The exercise library page supports searching and filtering by plan level.

## Key Routes

Coach:

- `/admin/dashboard`
- `/admin/clients`
- `/admin/clients/new`
- `/admin/clients/[id]`
- `/admin/clients/[id]/assessments`
- `/admin/clients/[id]/check-ins`
- `/admin/clients/[id]/monthly-plans`
- `/admin/clients/[id]/monthly-plans/new`
- `/admin/clients/[id]/monthly-plans/[planId]`
- `/admin/clients/[id]/sessions`
- `/admin/clients/[id]/packages`
- `/admin/clients/[id]/notes`
- `/admin/exercise-library`
- `/admin/plan-templates`
- `/admin/settings`

Client:

- `/client/dashboard`
- `/client/profile`
- `/client/workouts`
- `/client/monthly-plan`
- `/client/check-in`
- `/client/notes`

## Workbook Starting Point

The app structure maps the workbook tabs into normalized app tables:

- Clients to `ClientProfile`
- Assessments to `Assessment`
- Weekly_Checkins to `WeeklyCheckIn`
- Exercise_Library to `Exercise`
- Plan_Templates to `PlanTemplate`
- Monthly_Plans to `MonthlyPlan` and `MonthlyPlanItem`
- Workout_Sessions to `WorkoutSession`
- Packages to `Package`
- Coach_Notes to `CoachNote`
- App_Logic_Rules to code in `src/lib/rules.ts`

All client-specific records connect by `clientId`, never by client name.
