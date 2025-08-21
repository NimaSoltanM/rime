// convex/schema.ts
import { defineSchema } from 'convex/server'

// Import all schema tables
import { usersTable, sessionsTable, otpsTable } from './schemas/auth'
import { workspacesTable } from './schemas/workspaces'
import { messagesTable } from './schemas/messages'

export default defineSchema({
  // Auth tables
  users: usersTable,
  sessions: sessionsTable,
  otps: otpsTable,

  // Messaging tables
  workspaces: workspacesTable,
  messages: messagesTable,
})
