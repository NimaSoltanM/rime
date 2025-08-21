// convex/utils.ts - Helper functions for mutations
import { Id } from './_generated/dataModel'

/**
 * Get authenticated user from session token
 * Returns null if token is invalid or expired
 */
export async function getCurrentUserFromToken(ctx: any, sessionToken: string) {
  if (!sessionToken) return null

  // Find active session
  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q: any) => q.eq('token', sessionToken))
    .first()

  if (!session || Date.now() > session.expiresAt) {
    return null
  }

  // Get user
  return await ctx.db.get(session.userId)
}

/**
 * Check if user has access to an organization
 * Returns true if user is an active member of the organization
 */
export async function checkOrganizationAccess(
  ctx: any,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>,
): Promise<boolean> {
  const membership = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q: any) =>
      q.eq('organizationId', organizationId).eq('userId', userId),
    )
    .first()

  return membership && membership.status === 'active'
}

/**
 * Check if user has access to a workspace
 * Returns true if user is a member of the workspace
 */
export async function checkWorkspaceAccess(
  ctx: any,
  userId: Id<'users'>,
  workspaceId: Id<'workspaces'>,
): Promise<boolean> {
  const membership = await ctx.db
    .query('workspaceMembers')
    .withIndex('by_workspace_user', (q: any) =>
      q.eq('workspaceId', workspaceId).eq('userId', userId),
    )
    .first()

  return membership !== null
}

/**
 * Get organization membership for a user
 * Returns membership object or null if not found
 */
export async function getOrganizationMembership(
  ctx: any,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>,
) {
  return await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q: any) =>
      q.eq('organizationId', organizationId).eq('userId', userId),
    )
    .first()
}

/**
 * Get workspace membership for a user
 * Returns membership object or null if not found
 */
export async function getWorkspaceMembership(
  ctx: any,
  userId: Id<'users'>,
  workspaceId: Id<'workspaces'>,
) {
  return await ctx.db
    .query('workspaceMembers')
    .withIndex('by_workspace_user', (q: any) =>
      q.eq('workspaceId', workspaceId).eq('userId', userId),
    )
    .first()
}

/**
 * Check if user has specific organization permissions
 * Returns true if user has the required role or permission
 */
export async function hasOrganizationPermission(
  ctx: any,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>,
  permission:
    | 'canCreateWorkspaces'
    | 'canInviteMembers'
    | 'canManageBilling'
    | 'isAdmin',
): Promise<boolean> {
  const membership = await getOrganizationMembership(
    ctx,
    userId,
    organizationId,
  )

  if (!membership || membership.status !== 'active') {
    return false
  }

  switch (permission) {
    case 'canCreateWorkspaces':
      return (
        membership.canCreateWorkspaces ||
        ['owner', 'admin'].includes(membership.role)
      )
    case 'canInviteMembers':
      return (
        membership.canInviteMembers ||
        ['owner', 'admin'].includes(membership.role)
      )
    case 'canManageBilling':
      return membership.canManageBilling || membership.role === 'owner'
    case 'isAdmin':
      return ['owner', 'admin'].includes(membership.role)
    default:
      return false
  }
}

/**
 * Check if user has workspace admin permissions
 * Returns true if user is a workspace admin
 */
export async function isWorkspaceAdmin(
  ctx: any,
  userId: Id<'users'>,
  workspaceId: Id<'workspaces'>,
): Promise<boolean> {
  const membership = await getWorkspaceMembership(ctx, userId, workspaceId)
  return membership && membership.role === 'admin'
}

/**
 * Generate a secure random token for invitations
 * Returns a 32-character hex string
 */
export function generateSecureToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Clean up expired sessions
 * Should be called periodically to maintain database hygiene
 */
export async function cleanupExpiredSessions(ctx: any) {
  const now = Date.now()
  const expiredSessions = await ctx.db
    .query('sessions')
    .withIndex('by_expiry', (q: any) => q.lt('expiresAt', now))
    .collect()

  for (const session of expiredSessions) {
    await ctx.db.delete(session._id)
  }

  return expiredSessions.length
}

/**
 * Clean up expired organization invitations
 * Should be called periodically to maintain database hygiene
 */
export async function cleanupExpiredInvitations(ctx: any) {
  const now = Date.now()
  const expiredInvitations = await ctx.db
    .query('organizationInvitations')
    .withIndex('by_expires', (q: any) => q.lt('expiresAt', now))
    .filter((q: any) => q.eq(q.field('status'), 'pending'))
    .collect()

  for (const invitation of expiredInvitations) {
    await ctx.db.patch(invitation._id, { status: 'expired' })
  }

  return expiredInvitations.length
}

/**
 * Validate email format
 * Returns true if email is valid format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate organization slug format
 * Returns true if slug contains only lowercase letters, numbers, and hyphens
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50
}

/**
 * Extract mentions from message text
 * Returns array of user IDs mentioned in the format @userId
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9]+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1])
  }

  return [...new Set(mentions)] // Remove duplicates
}
