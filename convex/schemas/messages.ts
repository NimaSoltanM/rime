// convex/schemas/messages.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Messages (real-time communication)
export const messagesTable = defineTable({
  text: v.string(),
  workspaceId: v.id('workspaces'),
  userId: v.id('users'),
})
  .index('by_workspace', ['workspaceId'])
  .index('by_user', ['userId'])
