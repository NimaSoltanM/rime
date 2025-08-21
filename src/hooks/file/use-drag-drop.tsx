// app/hooks/useDragDrop.ts
import { useState, useCallback, useRef, DragEvent } from 'react'

export interface UseDragDropOptions {
  onFilesDropped: (files: File[]) => void
  accept?: string // MIME types to accept
  multiple?: boolean
  disabled?: boolean
}

export function useDragDrop(options: UseDragDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const [isOverDropZone, setIsOverDropZone] = useState(false)
  const dragCounterRef = useRef(0)

  const { onFilesDropped, accept, multiple = false, disabled = false } = options

  // Validate dropped files
  const validateDroppedFiles = useCallback(
    (files: FileList): File[] => {
      const fileArray = Array.from(files)

      // Filter by accept types if specified
      const validFiles = accept
        ? fileArray.filter((file) => {
            const acceptTypes = accept.split(',').map((type) => type.trim())
            return acceptTypes.some((acceptType) => {
              if (acceptType === '*/*') return true
              if (acceptType.endsWith('/*')) {
                const category = acceptType.split('/')[0]
                return file.type.startsWith(category + '/')
              }
              return file.type === acceptType
            })
          })
        : fileArray

      // Handle multiple files
      return multiple ? validFiles : validFiles.slice(0, 1)
    },
    [accept, multiple],
  )

  // Handle drag enter
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      dragCounterRef.current++

      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true)
      }
    },
    [disabled],
  )

  // Handle drag leave
  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      dragCounterRef.current--

      if (dragCounterRef.current === 0) {
        setIsDragging(false)
        setIsOverDropZone(false)
      }
    },
    [disabled],
  )

  // Handle drag over
  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      setIsOverDropZone(true)

      // Show copy cursor
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy'
      }
    },
    [disabled],
  )

  // Handle drop
  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (disabled) return

      setIsDragging(false)
      setIsOverDropZone(false)
      dragCounterRef.current = 0

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const validFiles = validateDroppedFiles(e.dataTransfer.files)
        if (validFiles.length > 0) {
          onFilesDropped(validFiles)
        }
      }
    },
    [disabled, validateDroppedFiles, onFilesDropped],
  )

  // Get props for drop zone element
  const getDropZoneProps = useCallback(
    () => ({
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    }),
    [handleDragEnter, handleDragLeave, handleDragOver, handleDrop],
  )

  return {
    isDragging,
    isOverDropZone,
    getDropZoneProps,
    // Individual handlers if you need custom setup
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  }
}
