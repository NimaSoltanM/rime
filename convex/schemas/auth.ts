// convex/schemas/auth.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Users table - individual people who use the app
export const usersTable = defineTable({
  // Authentication
  phone: v.string(),

  // Basic Profile
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.optional(v.string()), // For invitations
  avatar: v.optional(v.string()), // Profile picture

  // Status & Activity
  status: v.union(
    v.literal('online'),
    v.literal('offline'),
    v.literal('away'),
    v.literal('in-meeting'),
  ),
  lastSeenAt: v.optional(v.number()),

  // Account settings
  timezone: v.optional(v.string()),
  notifications: v.optional(v.boolean()),

  // Timestamps
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index('by_phone', ['phone'])
  .index('by_email', ['email'])
  .index('by_status', ['status'])

// Sessions table - for cookie-based auth
export const sessionsTable = defineTable({
  userId: v.id('users'),
  token: v.string(),
  expiresAt: v.number(),
  createdAt: v.number(),
})
  .index('by_token', ['token'])
  .index('by_user', ['userId'])

// OTP table - for phone verification
export const otpsTable = defineTable({
  phone: v.string(),
  code: v.string(),
  expiresAt: v.number(),
  isUsed: v.boolean(),
}).index('by_phone', ['phone'])
