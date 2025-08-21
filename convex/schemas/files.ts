// convex/schemas/files.ts
import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// Files - Universal file storage with context-aware handling
export const filesTable = defineTable({
  // Convex file storage
  storageId: v.id('_storage'), // Convex storage ID

  // Multi-tenant isolation
  organizationId: v.id('organizations'),
  workspaceId: v.optional(v.id('workspaces')), // null = org-level file

  // File context - determines validation and behavior
  context: v.union(
    v.literal('profile_picture'), // User avatar
    v.literal('workspace_logo'), // Workspace/org branding
    v.literal('chat_attachment'), // Message attachment
    v.literal('document'), // Workspace document
    v.literal('organization_logo'), // Organization branding
  ),

  // File metadata
  fileName: v.string(),
  fileType: v.string(), // "image/jpeg", "application/pdf"
  fileSize: v.number(), // bytes

  // Upload info
  uploadedBy: v.id('users'),
  messageId: v.optional(v.id('messages')), // For chat attachments

  // File categorization (auto-detected)
  category: v.union(
    v.literal('image'),
    v.literal('document'),
    v.literal('video'),
    v.literal('audio'),
    v.literal('other'),
  ),

  // Access control
  isPublic: v.boolean(), // Public to all org members vs private
  accessLevel: v.union(
    v.literal('organization'), // All org members
    v.literal('workspace'), // Workspace members only
    v.literal('private'), // Uploader + admins only
  ),

  // File status
  isDeleted: v.optional(v.boolean()),
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id('users')),

  // Business features
  tags: v.optional(v.array(v.string())), // For searchability
  description: v.optional(v.string()),

  // File processing status (for thumbnails, etc.)
  processingStatus: v.optional(
    v.union(v.literal('pending'), v.literal('completed'), v.literal('failed')),
  ),
  thumbnailStorageId: v.optional(v.id('_storage')), // For image thumbnails
})
  .index('by_organization', ['organizationId'])
  .index('by_workspace', ['workspaceId'])
  .index('by_uploader', ['uploadedBy'])
  .index('by_message', ['messageId'])
  .index('by_context', ['context'])
  .index('by_category', ['category'])
  .index('by_access', ['accessLevel'])
  .index('by_deleted', ['isDeleted'])
  .index('by_org_context', ['organizationId', 'context'])
  .index('by_workspace_context', ['workspaceId', 'context'])
  .index('by_processing', ['processingStatus'])
