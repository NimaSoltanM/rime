// convex/schemas/workspaces.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Workspaces (channels for messaging)
export const workspacesTable = defineTable({
  name: v.string(), // "general", "development", "marketing"
  description: v.optional(v.string()),
  createdBy: v.id('users'),
}).index('by_created', ['createdBy'])
