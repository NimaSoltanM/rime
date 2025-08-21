// convex/schemas/workspaces.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Workspaces - Now belong to organizations (MULTI-TENANT!)
export const workspacesTable = defineTable({
  name: v.string(), // "general", "development", "project-alpha"
  description: v.optional(v.string()),

  // Organization isolation - CRITICAL for multi-tenant!
  organizationId: v.id('organizations'),

  // Workspace settings
  type: v.union(
    v.literal('public'), // All org members can see/join
    v.literal('private'), // Invite-only
    v.literal('archived'), // Read-only, completed projects
  ),

  // Business context
  purpose: v.optional(
    v.union(
      v.literal('general'),
      v.literal('project'),
      v.literal('department'),
      v.literal('client'),
      v.literal('announcement'),
    ),
  ),

  // Project management (for business workspaces)
  projectDeadline: v.optional(v.number()),
  clientName: v.optional(v.string()),
  priority: v.optional(
    v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
  ),

  // Access control
  createdBy: v.id('users'),
  isArchived: v.boolean(),

  // Settings
  allowThreads: v.optional(v.boolean()),
  allowFileUploads: v.optional(v.boolean()),
  retentionDays: v.optional(v.number()), // Message retention policy
})
  .index('by_organization', ['organizationId'])
  .index('by_created', ['createdBy'])
  .index('by_type', ['type'])
  .index('by_org_type', ['organizationId', 'type'])
  .index('by_archived', ['isArchived'])

// Workspace Members - Who can access which workspaces
export const workspaceMembersTable = defineTable({
  workspaceId: v.id('workspaces'),
  userId: v.id('users'),
  organizationId: v.id('organizations'), // For faster queries

  // Access control
  role: v.union(
    v.literal('admin'), // Can manage workspace
    v.literal('member'), // Can post/read
    v.literal('viewer'), // Read-only access
  ),

  // Join info
  joinedAt: v.number(),
  addedBy: v.id('users'),

  // Notification settings
  notificationsEnabled: v.boolean(),
  mentionNotifications: v.boolean(),
})
  .index('by_workspace', ['workspaceId'])
  .index('by_user', ['userId'])
  .index('by_organization', ['organizationId'])
  .index('by_workspace_user', ['workspaceId', 'userId'])
  .index('by_org_user', ['organizationId', 'userId'])
