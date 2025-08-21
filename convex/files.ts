// convex/files.ts - Universal File Upload System (Fixed)
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'

// File validation rules based on context
const FILE_RULES = {
  profile_picture: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ] as string[],
    description: 'Profile picture',
  },
  workspace_logo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
    description: 'Workspace logo',
  },
  organization_logo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
    description: 'Organization logo',
  },
  chat_attachment: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [] as string[], // Allow all types (empty array = no restrictions)
    description: 'Chat attachment',
  },
  document: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
    ] as string[],
    description: 'Document',
  },
} as const

// Helper function to get user from session token
async function getCurrentUserFromToken(ctx: any, sessionToken: string) {
  if (!sessionToken) return null

  const session = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q: any) => q.eq('token', sessionToken))
    .first()

  if (!session || Date.now() > session.expiresAt) return null
  return await ctx.db.get(session.userId)
}

// Helper function to check organization access
async function checkOrganizationAccess(
  ctx: any,
  userId: Id<'users'>,
  organizationId: Id<'organizations'>,
) {
  const membership = await ctx.db
    .query('organizationMembers')
    .withIndex('by_org_user', (q: any) =>
      q.eq('organizationId', organizationId).eq('userId', userId),
    )
    .first()

  return membership && membership.status === 'active'
}

// Helper function to categorize file type
function categorizeFileType(
  fileType: string,
): 'image' | 'document' | 'video' | 'audio' | 'other' {
  if (fileType.startsWith('image/')) return 'image'
  if (fileType.startsWith('video/')) return 'video'
  if (fileType.startsWith('audio/')) return 'audio'
  if (
    fileType.includes('pdf') ||
    fileType.includes('document') ||
    fileType.includes('sheet') ||
    fileType.includes('text')
  ) {
    return 'document'
  }
  return 'other'
}

// Generate upload URL with validation
export const generateUploadUrl = mutation({
  args: {
    context: v.union(
      v.literal('profile_picture'),
      v.literal('workspace_logo'),
      v.literal('organization_logo'),
      v.literal('chat_attachment'),
      v.literal('document'),
    ),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    organizationId: v.id('organizations'),
    workspaceId: v.optional(v.id('workspaces')),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check organization access
    const hasOrgAccess = await checkOrganizationAccess(
      ctx,
      user._id,
      args.organizationId,
    )
    if (!hasOrgAccess) throw new Error('No access to organization')

    // Validate file based on context
    const rules = FILE_RULES[args.context]

    // Check file size
    if (args.fileSize > rules.maxSize) {
      throw new Error(
        `File too large. ${rules.description} must be under ${Math.round(rules.maxSize / 1024 / 1024)}MB`,
      )
    }

    // Check file type (only if allowedTypes is not empty)
    if (
      rules.allowedTypes.length > 0 &&
      !rules.allowedTypes.includes(args.fileType)
    ) {
      throw new Error(
        `Invalid file type. ${rules.description} must be: ${rules.allowedTypes.join(', ')}`,
      )
    }

    // For workspace-specific uploads, check workspace access
    if (args.workspaceId) {
      const workspaceMember = await ctx.db
        .query('workspaceMembers')
        .withIndex('by_workspace_user', (q: any) =>
          q.eq('workspaceId', args.workspaceId).eq('userId', user._id),
        )
        .first()

      if (!workspaceMember) {
        throw new Error('No access to workspace')
      }
    }

    // Generate upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl()

    return {
      uploadUrl,
      uploadToken: `${Date.now()}_${user._id}_${args.context}`, // For tracking
    }
  },
})

// Store file metadata after successful upload
export const storeFileMetadata = mutation({
  args: {
    storageId: v.id('_storage'),
    context: v.union(
      v.literal('profile_picture'),
      v.literal('workspace_logo'),
      v.literal('organization_logo'),
      v.literal('chat_attachment'),
      v.literal('document'),
    ),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    organizationId: v.id('organizations'),
    workspaceId: v.optional(v.id('workspaces')),
    messageId: v.optional(v.id('messages')),
    description: v.optional(v.string()),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check organization access
    const hasOrgAccess = await checkOrganizationAccess(
      ctx,
      user._id,
      args.organizationId,
    )
    if (!hasOrgAccess) throw new Error('No access to organization')

    // Determine access level and settings based on context
    let accessLevel: 'organization' | 'workspace' | 'private' = 'organization'
    let isPublic = true

    switch (args.context) {
      case 'profile_picture':
        accessLevel = 'organization'
        isPublic = true
        // Delete old profile picture
        const oldProfilePic = await ctx.db
          .query('files')
          .withIndex('by_org_context', (q: any) =>
            q
              .eq('organizationId', args.organizationId)
              .eq('context', 'profile_picture'),
          )
          .filter((q: any) => q.eq(q.field('uploadedBy'), user._id))
          .first()
        if (oldProfilePic) {
          await ctx.storage.delete(oldProfilePic.storageId)
          await ctx.db.delete(oldProfilePic._id)
        }
        break

      case 'workspace_logo':
        accessLevel = 'workspace'
        isPublic = true
        // Delete old workspace logo
        if (args.workspaceId) {
          const oldLogo = await ctx.db
            .query('files')
            .withIndex('by_workspace_context', (q: any) =>
              q
                .eq('workspaceId', args.workspaceId)
                .eq('context', 'workspace_logo'),
            )
            .first()
          if (oldLogo) {
            await ctx.storage.delete(oldLogo.storageId)
            await ctx.db.delete(oldLogo._id)
          }
        }
        break

      case 'organization_logo':
        accessLevel = 'organization'
        isPublic = true
        // Delete old organization logo
        const oldOrgLogo = await ctx.db
          .query('files')
          .withIndex('by_org_context', (q: any) =>
            q
              .eq('organizationId', args.organizationId)
              .eq('context', 'organization_logo'),
          )
          .first()
        if (oldOrgLogo) {
          await ctx.storage.delete(oldOrgLogo.storageId)
          await ctx.db.delete(oldOrgLogo._id)
        }
        break

      case 'chat_attachment':
        accessLevel = args.workspaceId ? 'workspace' : 'organization'
        isPublic = true
        break

      case 'document':
        accessLevel = args.workspaceId ? 'workspace' : 'organization'
        isPublic = true
        break
    }

    // Store file metadata
    const fileId = await ctx.db.insert('files', {
      storageId: args.storageId,
      organizationId: args.organizationId,
      workspaceId: args.workspaceId,
      context: args.context,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      uploadedBy: user._id,
      messageId: args.messageId,
      category: categorizeFileType(args.fileType),
      isPublic,
      accessLevel,
      description: args.description,
      isDeleted: false,
      processingStatus: 'completed',
    })

    return fileId
  },
})

// Get file URL with access control
export const getFileUrl = query({
  args: {
    fileId: v.id('files'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Get file metadata
    const file = await ctx.db.get(args.fileId)
    if (!file || file.isDeleted) throw new Error('File not found')

    // Check access based on file's access level
    switch (file.accessLevel) {
      case 'organization':
        const hasOrgAccess = await checkOrganizationAccess(
          ctx,
          user._id,
          file.organizationId,
        )
        if (!hasOrgAccess) throw new Error('No access to file')
        break

      case 'workspace':
        if (!file.workspaceId)
          throw new Error('Workspace file without workspace ID')
        const workspaceMember = await ctx.db
          .query('workspaceMembers')
          .withIndex('by_workspace_user', (q: any) =>
            q.eq('workspaceId', file.workspaceId).eq('userId', user._id),
          )
          .first()
        if (!workspaceMember) throw new Error('No access to workspace file')
        break

      case 'private':
        if (file.uploadedBy !== user._id) {
          // Check if user is admin
          const orgMember = await ctx.db
            .query('organizationMembers')
            .withIndex('by_org_user', (q: any) =>
              q
                .eq('organizationId', file.organizationId)
                .eq('userId', user._id),
            )
            .first()
          if (!orgMember || !['owner', 'admin'].includes(orgMember.role)) {
            throw new Error('No access to private file')
          }
        }
        break
    }

    // Generate and return file URL
    const url = await ctx.storage.getUrl(file.storageId)
    return {
      url,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      uploadedBy: file.uploadedBy,
      context: file.context,
    }
  },
})

// List files for organization/workspace
export const listFiles = query({
  args: {
    organizationId: v.id('organizations'),
    workspaceId: v.optional(v.id('workspaces')),
    context: v.optional(
      v.union(
        v.literal('profile_picture'),
        v.literal('workspace_logo'),
        v.literal('organization_logo'),
        v.literal('chat_attachment'),
        v.literal('document'),
      ),
    ),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Check organization access
    const hasOrgAccess = await checkOrganizationAccess(
      ctx,
      user._id,
      args.organizationId,
    )
    if (!hasOrgAccess) throw new Error('No access to organization')

    // Start with base query
    let files

    if (args.workspaceId && args.context) {
      // Query by workspace and context
      files = await ctx.db
        .query('files')
        .withIndex('by_workspace_context', (q: any) =>
          q.eq('workspaceId', args.workspaceId).eq('context', args.context),
        )
        .filter((q: any) => q.eq(q.field('isDeleted'), false))
        .order('desc')
        .collect()
    } else if (args.workspaceId) {
      // Query by workspace only
      files = await ctx.db
        .query('files')
        .withIndex('by_workspace', (q: any) =>
          q.eq('workspaceId', args.workspaceId),
        )
        .filter((q: any) => q.eq(q.field('isDeleted'), false))
        .order('desc')
        .collect()
    } else if (args.context) {
      // Query by organization and context
      files = await ctx.db
        .query('files')
        .withIndex('by_org_context', (q: any) =>
          q
            .eq('organizationId', args.organizationId)
            .eq('context', args.context),
        )
        .filter((q: any) => q.eq(q.field('isDeleted'), false))
        .order('desc')
        .collect()
    } else {
      // Query by organization only
      files = await ctx.db
        .query('files')
        .withIndex('by_organization', (q: any) =>
          q.eq('organizationId', args.organizationId),
        )
        .filter((q: any) => q.eq(q.field('isDeleted'), false))
        .order('desc')
        .collect()
    }

    // Generate URLs for accessible files
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const url = await ctx.storage.getUrl(file.storageId)
          const uploader = await ctx.db.get(file.uploadedBy)

          return {
            ...file,
            url,
            uploaderName: uploader
              ? `${uploader.firstName} ${uploader.lastName}`
              : 'Unknown',
          }
        } catch {
          return null // Skip files user can't access
        }
      }),
    )

    return filesWithUrls.filter(Boolean)
  },
})

// Delete file
export const deleteFile = mutation({
  args: {
    fileId: v.id('files'),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await getCurrentUserFromToken(ctx, args.sessionToken)
    if (!user) throw new Error('Not authenticated')

    // Get file
    const file = await ctx.db.get(args.fileId)
    if (!file || file.isDeleted) throw new Error('File not found')

    // Check if user can delete (uploader or admin)
    let canDelete = file.uploadedBy === user._id

    if (!canDelete) {
      const orgMember = await ctx.db
        .query('organizationMembers')
        .withIndex('by_org_user', (q: any) =>
          q.eq('organizationId', file.organizationId).eq('userId', user._id),
        )
        .first()
      canDelete = Boolean(
        orgMember && ['owner', 'admin'].includes(orgMember.role),
      )
    }

    if (!canDelete) throw new Error('Not authorized to delete file')

    // Soft delete in database
    await ctx.db.patch(args.fileId, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: user._id,
    })

    // Delete from storage
    await ctx.storage.delete(file.storageId)

    return { success: true }
  },
})
