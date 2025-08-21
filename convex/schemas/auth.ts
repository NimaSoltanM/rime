// convex/schemas/auth.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Users table - core user information
export const usersTable = defineTable({
  // Authentication
  phone: v.string(),

  // Basic Profile
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),

  // Status
  status: v.union(v.literal('online'), v.literal('offline')),

  // Timestamps
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
}).index('by_phone', ['phone'])

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
