// convex/schemas/organizations.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Organizations (Companies/Teams) - The core tenant isolation
export const organizationsTable = defineTable({
  name: v.string(), // "Acme Corp", "TechStart Inc"
  slug: v.string(), // "acme-corp" (unique URL identifier)
  description: v.optional(v.string()),

  // Branding & Customization
  logoUrl: v.optional(v.string()),
  primaryColor: v.optional(v.string()),
  website: v.optional(v.string()),

  // Business info
  industry: v.optional(v.string()),
  size: v.optional(
    v.union(
      v.literal('1-10'),
      v.literal('11-50'),
      v.literal('51-200'),
      v.literal('201-500'),
      v.literal('500+'),
    ),
  ),

  // Plan & Billing
  plan: v.union(v.literal('free'), v.literal('pro'), v.literal('enterprise')),
  billingEmail: v.optional(v.string()),
  subscriptionStatus: v.union(
    v.literal('active'),
    v.literal('trial'),
    v.literal('suspended'),
    v.literal('cancelled'),
  ),
  trialEndsAt: v.optional(v.number()),

  // Settings
  allowPublicJoin: v.boolean(), // Can people join with email domain?
  emailDomain: v.optional(v.string()), // "@company.com"
  maxMembers: v.optional(v.number()), // Plan limits

  // Metadata
  createdBy: v.id('users'),
  isActive: v.boolean(),
})
  .index('by_slug', ['slug'])
  .index('by_created', ['createdBy'])
  .index('by_domain', ['emailDomain'])
  .index('by_plan', ['plan'])
  .index('by_status', ['subscriptionStatus'])

// Organization Members - Who belongs to which organizations
export const organizationMembersTable = defineTable({
  organizationId: v.id('organizations'),
  userId: v.id('users'),

  // Role in organization
  role: v.union(
    v.literal('owner'), // Full control, billing
    v.literal('admin'), // Manage members, workspaces
    v.literal('member'), // Regular user
    v.literal('guest'), // Limited access
  ),

  // Permissions
  canCreateWorkspaces: v.boolean(),
  canInviteMembers: v.boolean(),
  canManageBilling: v.boolean(),

  // Join info
  joinedAt: v.number(),
  invitedBy: v.optional(v.id('users')),
  inviteAcceptedAt: v.optional(v.number()),

  // Status
  status: v.union(
    v.literal('active'),
    v.literal('suspended'),
    v.literal('pending_invitation'),
  ),
})
  .index('by_organization', ['organizationId'])
  .index('by_user', ['userId'])
  .index('by_org_user', ['organizationId', 'userId'])
  .index('by_role', ['role'])
  .index('by_status', ['status'])
