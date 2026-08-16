// Nested `include: { user: true }` pulls every User column — including
// passwordHash — into the response. Use this select wherever a related
// user is nested inside another entity's response.
export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  mustResetPassword: true,
  createdAt: true,
  updatedAt: true,
} as const;
