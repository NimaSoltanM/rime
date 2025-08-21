// app/utils/fileUtils.ts

export type FileContext =
  | 'profile_picture'
  | 'workspace_logo'
  | 'organization_logo'
  | 'chat_attachment'
  | 'document'

// File validation rules (sync with backend)
export const FILE_RULES = {
  profile_picture: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ] as string[],
    description: 'Profile picture',
    accept: 'image/*',
  },
  workspace_logo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
    description: 'Workspace logo',
    accept: 'image/*',
  },
  organization_logo: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
    description: 'Organization logo',
    accept: 'image/*',
  },
  chat_attachment: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [] as string[], // Allow all types
    description: 'Chat attachment',
    accept: '*/*',
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
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*',
  },
} as const

// Format file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Get file category from MIME type
export function getFileCategory(
  mimeType: string,
): 'image' | 'document' | 'video' | 'audio' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('text')
  ) {
    return 'document'
  }
  return 'other'
}

// Get file icon based on type
export function getFileIcon(mimeType: string): string {
  const category = getFileCategory(mimeType)

  switch (category) {
    case 'image':
      return '🖼️'
    case 'video':
      return '🎥'
    case 'audio':
      return '🎵'
    case 'document':
      return '📄'
    default:
      return '📎'
  }
}

// Validate file against context rules
export function validateFile(file: File, context: FileContext): string | null {
  const rules = FILE_RULES[context]

  // Check file size
  if (file.size > rules.maxSize) {
    return `File too large. ${rules.description} must be under ${formatFileSize(rules.maxSize)}`
  }

  // Check file type (only if allowedTypes is not empty)
  if (
    rules.allowedTypes.length > 0 &&
    !rules.allowedTypes.includes(file.type)
  ) {
    return `Invalid file type. ${rules.description} must be: ${rules.allowedTypes.join(', ')}`
  }

  return null
}

// Create file preview URL
export function createFilePreview(file: File): string | null {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }
  return null
}

// Cleanup file preview URL
export function cleanupFilePreview(url: string): void {
  URL.revokeObjectURL(url)
}

// Get context-specific configuration
export function getContextConfig(context: FileContext) {
  return FILE_RULES[context]
}

// Generate accept string for file input
export function getAcceptString(context: FileContext): string {
  return FILE_RULES[context].accept
}

// Check if file is an image
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

// Check if file is a document
export function isDocumentFile(file: File): boolean {
  return getFileCategory(file.type) === 'document'
}

// Generate unique filename
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now()
  const extension = originalName.split('.').pop()
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')

  return `${nameWithoutExt}_${timestamp}.${extension}`
}

// Compress image file (basic implementation)
export function compressImage(
  file: File,
  maxWidth: number = 1024,
  quality: number = 0.8,
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      // Set canvas size
      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Fallback to original
          }
        },
        file.type,
        quality,
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

// Parse filename and extension
export function parseFilename(filename: string): {
  name: string
  extension: string
} {
  const lastDotIndex = filename.lastIndexOf('.')

  if (lastDotIndex === -1) {
    return { name: filename, extension: '' }
  }

  return {
    name: filename.substring(0, lastDotIndex),
    extension: filename.substring(lastDotIndex + 1),
  }
}
