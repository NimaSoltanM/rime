// convex/schemas/invitations.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Organization Invitations - Invite people to join organizations
export const organizationInvitationsTable = defineTable({
  organizationId: v.id('organizations'),

  // Who is being invited
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),

  // Invitation details
  inviteToken: v.string(), // Unique token for the invitation link
  role: v.union(v.literal('admin'), v.literal('member'), v.literal('guest')),

  // Permissions they'll get
  canCreateWorkspaces: v.boolean(),
  canInviteMembers: v.boolean(),

  // Invitation metadata
  invitedBy: v.id('users'),
  invitedAt: v.number(),
  expiresAt: v.number(), // Invitations expire after 7 days

  // Status
  status: v.union(
    v.literal('pending'),
    v.literal('accepted'),
    v.literal('declined'),
    v.literal('expired'),
    v.literal('revoked'),
  ),

  // Response info
  acceptedAt: v.optional(v.number()),
  acceptedBy: v.optional(v.id('users')), // User ID if they already had account
  declinedAt: v.optional(v.number()),

  // Custom message from inviter
  personalMessage: v.optional(v.string()),
})
  .index('by_organization', ['organizationId'])
  .index('by_email', ['email'])
  .index('by_token', ['inviteToken'])
  .index('by_inviter', ['invitedBy'])
  .index('by_status', ['status'])
  .index('by_expires', ['expiresAt'])

// Workspace Invitations - Invite people to specific workspaces
export const workspaceInvitationsTable = defineTable({
  workspaceId: v.id('workspaces'),
  organizationId: v.id('organizations'), // For isolation

  // Who is being invited (must already be org member)
  userId: v.id('users'),

  // Invitation details
  role: v.union(v.literal('admin'), v.literal('member'), v.literal('viewer')),

  // Invitation metadata
  invitedBy: v.id('users'),
  invitedAt: v.number(),

  // Status
  status: v.union(
    v.literal('pending'),
    v.literal('accepted'),
    v.literal('declined'),
    v.literal('auto_accepted'), // For public workspaces
  ),

  // Response info
  acceptedAt: v.optional(v.number()),
  declinedAt: v.optional(v.number()),

  // Custom message
  personalMessage: v.optional(v.string()),
})
  .index('by_workspace', ['workspaceId'])
  .index('by_organization', ['organizationId'])
  .index('by_user', ['userId'])
  .index('by_inviter', ['invitedBy'])
  .index('by_status', ['status'])
  .index('by_workspace_user', ['workspaceId', 'userId'])
