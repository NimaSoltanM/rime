// convex/organizations.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUserFromToken } from './utils'

// Create new organization
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    emailDomain: v.optional(v.string()),
    allowPublicJoin: v.boolean(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check slug uniqueness
    const existingOrg = await ctx.db
      .query('organizations')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first()
    if (existingOrg) throw new Error('Organization slug already exists')

    // Create organization
    const orgId = await ctx.db.insert('organizations', {
      name: args.name,
      slug: args.slug,
      description: args.description,
      emailDomain: args.emailDomain,
      allowPublicJoin: args.allowPublicJoin,
      plan: 'free',
      subscriptionStatus: 'trial',
      trialEndsAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      maxMembers: 10,
      createdBy: user._id,
      isActive: true,
    })

    // Add creator as owner
    await ctx.db.insert('organizationMembers', {
      organizationId: orgId,
      userId: user._id,
      role: 'owner',
      canCreateWorkspaces: true,
      canInviteMembers: true,
      canManageBilling: true,
      joinedAt: Date.now(),
      status: 'active',
    })

    return orgId
  },
})

// Update organization
export const update = mutation({
  args: {
    organizationId: v.id('organizations'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    website: v.optional(v.string()),
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
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check user is admin/owner
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Not authorized')
    }

    const updates: any = {}
    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl
    if (args.primaryColor !== undefined)
      updates.primaryColor = args.primaryColor
    if (args.website !== undefined) updates.website = args.website
    if (args.industry !== undefined) updates.industry = args.industry
    if (args.size !== undefined) updates.size = args.size

    await ctx.db.patch(args.organizationId, updates)
    return args.organizationId
  },
})

// Delete organization
export const remove = mutation({
  args: {
    organizationId: v.id('organizations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check user is owner
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.role !== 'owner') {
      throw new Error('Only owners can delete organizations')
    }

    // Soft delete by marking inactive
    await ctx.db.patch(args.organizationId, { isActive: false })
    return { success: true }
  },
})

export const getUserOrganizations = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Get user's organization memberships
    const memberships = await ctx.db
      .query('organizationMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    // Get organization details with member counts
    const organizationsWithDetails = await Promise.all(
      memberships.map(async (membership) => {
        const organization = await ctx.db.get(membership.organizationId)
        if (!organization || !organization.isActive) return null

        // Get member count
        const members = await ctx.db
          .query('organizationMembers')
          .withIndex('by_organization', (q) =>
            q.eq('organizationId', organization._id),
          )
          .filter((q) => q.eq(q.field('status'), 'active'))
          .collect()

        return {
          _id: organization._id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          logoUrl: organization.logoUrl,
          plan: organization.plan,
          memberCount: members.length,
          userRole: membership.role,
          userCanCreateWorkspaces: membership.canCreateWorkspaces,
          userCanInviteMembers: membership.canInviteMembers,
        }
      }),
    )

    return organizationsWithDetails.filter(Boolean)
  },
})

// Get organization details
export const getOrganization = query({
  args: {
    organizationId: v.id('organizations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    const organization = await ctx.db.get(args.organizationId)
    if (!organization || !organization.isActive) {
      throw new Error('Organization not found')
    }

    // Check if user is member
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.status !== 'active') {
      throw new Error('No access to organization')
    }

    // Get member count
    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId),
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    // Get workspace count
    const workspaces = await ctx.db
      .query('workspaces')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId),
      )
      .filter((q) => q.eq(q.field('isArchived'), false))
      .collect()

    return {
      ...organization,
      memberCount: members.length,
      workspaceCount: workspaces.length,
      userRole: membership.role,
      userCanCreateWorkspaces: membership.canCreateWorkspaces,
      userCanInviteMembers: membership.canInviteMembers,
      userCanManageBilling: membership.canManageBilling,
    }
  },
})

// Get organization members
export const getOrganizationMembers = query({
  args: {
    organizationId: v.id('organizations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check if user is member
    const userMembership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (!userMembership || userMembership.status !== 'active') {
      throw new Error('No access to organization')
    }

    // Get all members
    const memberships = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId),
      )
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect()

    // Enrich with user data
    const membersWithUserData = await Promise.all(
      memberships.map(async (membership) => {
        const memberUser = await ctx.db.get(membership.userId)
        return {
          _id: membership._id,
          userId: membership.userId,
          role: membership.role,
          canCreateWorkspaces: membership.canCreateWorkspaces,
          canInviteMembers: membership.canInviteMembers,
          canManageBilling: membership.canManageBilling,
          joinedAt: membership.joinedAt,
          user: memberUser
            ? {
                firstName: memberUser.firstName,
                lastName: memberUser.lastName,
                email: memberUser.email,
                phone: memberUser.phone,
                status: memberUser.status,
                lastSeenAt: memberUser.lastSeenAt,
              }
            : null,
        }
      }),
    )

    return membersWithUserData
  },
})

// Get organization invitations
export const getOrganizationInvitations = query({
  args: {
    organizationId: v.id('organizations'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check if user can view invitations
    const membership = await ctx.db
      .query('organizationMembers')
      .withIndex('by_org_user', (q) =>
        q.eq('organizationId', args.organizationId).eq('userId', user._id),
      )
      .first()

    if (!membership || membership.status !== 'active') {
      throw new Error('No access to organization')
    }

    if (
      !membership.canInviteMembers &&
      !['owner', 'admin'].includes(membership.role)
    ) {
      throw new Error('Not authorized to view invitations')
    }

    // Get pending invitations
    const invitations = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_organization', (q) =>
        q.eq('organizationId', args.organizationId),
      )
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect()

    // Enrich with inviter data
    const invitationsWithInviterData = await Promise.all(
      invitations.map(async (invitation) => {
        const inviter = await ctx.db.get(invitation.invitedBy)
        return {
          ...invitation,
          inviter: inviter
            ? {
                firstName: inviter.firstName,
                lastName: inviter.lastName,
              }
            : null,
        }
      }),
    )

    return invitationsWithInviterData
  },
})
