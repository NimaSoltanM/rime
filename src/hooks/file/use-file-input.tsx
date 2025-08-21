// app/hooks/useFileInput.ts
import { useRef, useCallback, ChangeEvent } from 'react'

export interface UseFileInputOptions {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  disabled?: boolean
}

export function useFileInput(options: UseFileInputOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    onFilesSelected,
    accept,
    multiple = false,
    disabled = false,
  } = options

  // Handle file selection
  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        const fileArray = Array.from(files)
        onFilesSelected(fileArray)
      }
    },
    [onFilesSelected],
  )

  // Open file picker
  const openFilePicker = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  // Clear selection
  const clearSelection = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Get props for hidden input element
  const getInputProps = useCallback(
    () => ({
      ref: fileInputRef,
      type: 'file' as const,
      accept,
      multiple,
      onChange: handleFileChange,
      style: { display: 'none' },
      disabled,
    }),
    [accept, multiple, handleFileChange, disabled],
  )

  return {
    openFilePicker,
    clearSelection,
    getInputProps,
    fileInputRef,
  }
}
