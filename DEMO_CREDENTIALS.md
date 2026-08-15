# QUIZME Demo Credentials

These accounts are created by the seed script (`npm run seed` in `backend/`) for local
demonstration only. **Never use these credentials, or this password, in a real deployment.**
Change or remove the seed script before deploying to production.

Demo password for every seeded account: `Passw0rd!`

| Role    | Email                    | Notes                                   |
|---------|--------------------------|------------------------------------------|
| Admin   | admin@quizme.com         | Full platform access                     |
| Teacher | teacher1@quizme.com      | Teaches Mathematics (JHS 2A, JHS 2B) and Integrated Science (JHS 2A) |
| Teacher | teacher2@quizme.com      | Teaches English Language & Social Studies (JHS 1A, JHS 1B) |
| Student | student1@quizme.com      | JHS 2A                                   |
| Student | student2@quizme.com      | JHS 2A                                   |

Additional demo students are seeded across JHS 1A, JHS 1B, JHS 2A, and JHS 2B with generated
emails (`studentN@quizme.com`) — see `backend/prisma/seed.ts` for the full list.

Real users created through the Admin dashboard get a randomly generated temporary password
(shown once at creation time) and are required to change it on first login.
