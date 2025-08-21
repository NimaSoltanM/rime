// convex/schema.ts - Main schema file (imports all separate schemas)
import { defineSchema } from 'convex/server'

// Import all schema tables from separate files
import { usersTable, sessionsTable, otpsTable } from './schemas/auth'
import {
  organizationsTable,
  organizationMembersTable,
} from './schemas/organizations'
import { workspacesTable, workspaceMembersTable } from './schemas/workspaces'
import {
  messagesTable,
  reactionsTable,
  messageReadsTable,
} from './schemas/messages'
import {
  organizationInvitationsTable,
  workspaceInvitationsTable,
} from './schemas/invitations'
import { filesTable } from './schemas/files'

export default defineSchema({
  // ===== AUTH SYSTEM =====
  users: usersTable,
  sessions: sessionsTable,
  otps: otpsTable,

  // ===== MULTI-TENANT ORGANIZATION SYSTEM =====
  organizations: organizationsTable,
  organizationMembers: organizationMembersTable,

  // ===== WORKSPACE SYSTEM =====
  workspaces: workspacesTable,
  workspaceMembers: workspaceMembersTable,

  // ===== MESSAGING SYSTEM =====
  messages: messagesTable,
  reactions: reactionsTable,
  messageReads: messageReadsTable,

  // ===== INVITATION SYSTEM =====
  organizationInvitations: organizationInvitationsTable,
  workspaceInvitations: workspaceInvitationsTable,

  // ===== FILE SYSTEM =====
  files: filesTable,
})
