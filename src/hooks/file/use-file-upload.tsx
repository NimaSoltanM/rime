// app/hooks/useFileUpload.ts
import { useState, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@/lib/auth'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'

type FileContext =
  | 'profile_picture'
  | 'workspace_logo'
  | 'organization_logo'
  | 'chat_attachment'
  | 'document'

export interface UploadState {
  status: 'idle' | 'validating' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  fileId?: Id<'files'>
  file?: File
}

export interface UseFileUploadOptions {
  context: FileContext
  organizationId: Id<'organizations'>
  workspaceId?: Id<'workspaces'>
  messageId?: Id<'messages'>
  onUploadStart?: (file: File) => void
  onProgress?: (progress: number) => void
  onUploadComplete?: (fileId: Id<'files'>, file: File) => void
  onUploadError?: (error: string, file?: File) => void
  autoUpload?: boolean // If true, upload immediately on file selection
}

// File validation rules (same as backend)
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
    allowedTypes: [] as string[], // Allow all types
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

export function useFileUpload(options: UseFileUploadOptions) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
  })

  const { sessionToken } = useAuthActions()
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const storeFileMetadata = useMutation(api.files.storeFileMetadata)

  // Validate file against context rules
  const validateFile = useCallback(
    (file: File): string | null => {
      const rules = FILE_RULES[options.context]

      // Check file size
      if (file.size > rules.maxSize) {
        return `File too large. ${rules.description} must be under ${Math.round(rules.maxSize / 1024 / 1024)}MB`
      }

      // Check file type (only if allowedTypes is not empty)
      if (
        rules.allowedTypes.length > 0 &&
        !rules.allowedTypes.includes(file.type)
      ) {
        return `Invalid file type. ${rules.description} must be: ${rules.allowedTypes.join(', ')}`
      }

      return null
    },
    [options.context],
  )

  // Upload a file
  const uploadFile = useCallback(
    async (file: File): Promise<Id<'files'> | null> => {
      if (!sessionToken) {
        const error = 'Not authenticated'
        setUploadState({ status: 'error', progress: 0, error })
        options.onUploadError?.(error, file)
        return null
      }

      try {
        // Step 1: Validate file
        setUploadState({ status: 'validating', progress: 5, file })

        const validationError = validateFile(file)
        if (validationError) {
          setUploadState({
            status: 'error',
            progress: 0,
            error: validationError,
            file,
          })
          options.onUploadError?.(validationError, file)
          return null
        }

        // Step 2: Start upload
        setUploadState({ status: 'uploading', progress: 10, file })
        options.onUploadStart?.(file)

        // Step 3: Generate upload URL
        const { uploadUrl } = await generateUploadUrl({
          context: options.context,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          organizationId: options.organizationId,
          workspaceId: options.workspaceId,
          sessionToken,
        })

        setUploadState((prev) => ({ ...prev, progress: 30 }))
        options.onProgress?.(30)

        // Step 4: Upload file to Convex storage
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`)
        }

        const { storageId } = await uploadResponse.json()
        setUploadState((prev) => ({ ...prev, progress: 70 }))
        options.onProgress?.(70)

        // Step 5: Store file metadata
        const fileId = await storeFileMetadata({
          storageId,
          context: options.context,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          organizationId: options.organizationId,
          workspaceId: options.workspaceId,
          messageId: options.messageId,
          sessionToken,
        })

        // Step 6: Success
        setUploadState({ status: 'success', progress: 100, fileId, file })
        options.onProgress?.(100)
        options.onUploadComplete?.(fileId, file)

        return fileId
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed'
        setUploadState({
          status: 'error',
          progress: 0,
          error: errorMessage,
          file,
        })
        options.onUploadError?.(errorMessage, file)
        return null
      }
    },
    [options, sessionToken, generateUploadUrl, storeFileMetadata, validateFile],
  )

  // Handle file selection (with optional auto-upload)
  const selectFile = useCallback(
    (file: File) => {
      if (options.autoUpload) {
        uploadFile(file)
      } else {
        setUploadState({ status: 'idle', progress: 0, file })
      }
    },
    [options.autoUpload, uploadFile],
  )

  // Handle multiple files (for batch upload)
  const selectFiles = useCallback(
    (files: File[]) => {
      if (files.length === 1) {
        selectFile(files[0])
      } else {
        // For multiple files, you might want to handle them differently
        // This is a simple implementation that takes the first file
        selectFile(files[0])
      }
    },
    [selectFile],
  )

  // Reset upload state
  const reset = useCallback(() => {
    setUploadState({ status: 'idle', progress: 0 })
  }, [])

  // Manually trigger upload (if autoUpload is false)
  const triggerUpload = useCallback(() => {
    if (uploadState.file) {
      uploadFile(uploadState.file)
    }
  }, [uploadState.file, uploadFile])

  return {
    // State
    uploadState,
    isUploading:
      uploadState.status === 'uploading' || uploadState.status === 'validating',
    isSuccess: uploadState.status === 'success',
    isError: uploadState.status === 'error',
    hasFile: !!uploadState.file,

    // Actions
    uploadFile,
    selectFile,
    selectFiles,
    triggerUpload,
    reset,

    // Utilities
    validateFile,
    getRules: () => FILE_RULES[options.context],
  }
}
