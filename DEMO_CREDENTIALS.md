# QUIZME Credentials

The production database has been reset to a single account. All demo teachers, students,
classes, subjects, quizzes, and questions from the original seed have been removed.

| Role  | Email             | Notes                          |
|-------|-------------------|----------------------------------|
| Admin | admin@quizme.com  | Password: `Passw0rd!` — change this on first login. |

Create real classes, subjects, teachers, and students from the Admin dashboard. New users get
a randomly generated temporary password (shown once at creation time) and are required to
change it on first login.

## Local development seed data

`backend/prisma/seed.ts` still seeds a full demo dataset (teachers, students, classes,
subjects, quizzes) for local development against your own database. It uses `upsert`, so
running `npm run seed` again is safe and won't delete anything — it only adds/updates the
demo records. Do not run it against the production database if you want to keep it clean.
