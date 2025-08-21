// app/hooks/useClipboard.ts
import { useCallback, useEffect } from 'react'

export interface UseClipboardOptions {
  onFilePaste: (file: File) => void
  accept?: string[] // MIME types to accept
  enabled?: boolean
  targetElement?: HTMLElement | null // Element to listen on, default is document
}

export function useClipboard(options: UseClipboardOptions) {
  const { onFilePaste, accept, enabled = true, targetElement } = options

  // Handle paste event
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!enabled) return

      const clipboardData = e.clipboardData
      if (!clipboardData) return

      // Check for files in clipboard
      const items = Array.from(clipboardData.items)
      const fileItems = items.filter((item) => item.kind === 'file')

      if (fileItems.length === 0) return

      // Process first file (usually only one file from clipboard)
      const fileItem = fileItems[0]
      const file = fileItem.getAsFile()

      if (!file) return

      // Check accept types if specified
      if (accept && accept.length > 0) {
        const isAccepted = accept.some((acceptType) => {
          if (acceptType === '*/*') return true
          if (acceptType.endsWith('/*')) {
            const category = acceptType.split('/')[0]
            return file.type.startsWith(category + '/')
          }
          return file.type === acceptType
        })

        if (!isAccepted) return
      }

      // Prevent default paste behavior
      e.preventDefault()

      // Generate filename if it doesn't have one
      const fileName =
        file.name ||
        `pasted-${Date.now()}.${getExtensionFromMimeType(file.type)}`
      const renamedFile = new File([file], fileName, { type: file.type })

      onFilePaste(renamedFile)
    },
    [enabled, accept, onFilePaste],
  )

  // Set up event listener
  useEffect(() => {
    if (!enabled) return

    const element = targetElement || document

    // Wrapper to handle type casting
    const pasteHandler = (e: Event) => {
      handlePaste(e as ClipboardEvent)
    }

    element.addEventListener('paste', pasteHandler)

    return () => {
      element.removeEventListener('paste', pasteHandler)
    }
  }, [enabled, targetElement, handlePaste])

  return {
    // You can manually trigger paste handling if needed
    handlePaste,
  }
}

// Utility function to get file extension from MIME type
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'text/plain': 'txt',
    'application/pdf': 'pdf',
    'application/json': 'json',
  }

  return mimeToExt[mimeType] || 'file'
}
