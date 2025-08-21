// app/components/MessageInput.tsx
import React, { useState, useRef } from 'react'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@/lib/auth'
import {
  Send,
  Paperclip,
  Smile,
  Loader2,
  Image as ImageIcon,
  FileText,
  Mic,
  AtSign,
  Hash,
  Bold,
  Italic,
  Code,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'

interface MessageInputProps {
  workspaceId: Id<'workspaces'>
  workspaceName?: string
  replyingTo?: {
    messageId: string
    userName: string
    text: string
  }
  onCancelReply?: () => void
}

export default function MessageInput({
  workspaceId,
  workspaceName,
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number
  }>({})
  const [showFormatting, setShowFormatting] = useState(false)
  const [mentions, setMentions] = useState<string[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { sessionToken } = useAuthActions()

  // Mutations
  const sendMessage = useMutation(api.messages.send)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const storeFileMetadata = useMutation(api.files.storeFileMetadata)

  const handleSendMessage = async () => {
    const messageText = message.trim()
    if (!messageText && attachments.length === 0) return
    if (isSubmitting || !sessionToken) return

    try {
      setIsSubmitting(true)

      let attachmentId: Id<'files'> | undefined

      // Handle file upload if there are attachments
      if (attachments.length > 0) {
        const file = attachments[0] // For now, handle single file

        // Generate upload URL
        const { uploadUrl } = await generateUploadUrl({
          context: 'chat_attachment',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          organizationId: 'org_123' as Id<'organizations'>, // TODO: Get from context
          workspaceId,
          sessionToken,
        })

        // Upload file
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: file,
        })

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file')
        }

        const { storageId } = await uploadResponse.json()

        // Store file metadata
        attachmentId = await storeFileMetadata({
          storageId,
          context: 'chat_attachment',
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          organizationId: 'org_123' as Id<'organizations'>, // TODO: Get from context
          workspaceId,
          sessionToken,
        })
      }

      // Send message
      await sendMessage({
        text: messageText || 'Shared a file',
        workspaceId,
        parentMessageId: replyingTo?.messageId as Id<'messages'> | undefined,
        attachmentId,
        mentions:
          mentions.length > 0
            ? mentions.map((m) => m as Id<'users'>)
            : undefined,
        sessionToken,
      })

      // Reset form
      setMessage('')
      setAttachments([])
      setMentions([])
      setUploadProgress({})
      if (onCancelReply) onCancelReply()

      // Focus back to textarea
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachments((prev) => [...prev, ...files.slice(0, 5 - prev.length)]) // Max 5 files
    }
    e.target.value = '' // Reset input
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const insertFormatting = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end)

    let formattedText = ''
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`
        break
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`
        break
      case 'code':
        formattedText = selectedText.includes('\n')
          ? `\`\`\`\n${selectedText || 'code block'}\n\`\`\``
          : `\`${selectedText || 'code'}\``
        break
    }

    const newMessage =
      message.substring(0, start) + formattedText + message.substring(end)
    setMessage(newMessage)

    // Focus back and set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + formattedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [message])

  return (
    <Card className="rounded-none border-l-0 border-r-0 border-b-0">
      <CardContent className="p-3 md:p-4">
        <div className="max-w-4xl mx-auto">
          {/* Reply Context */}
          {replyingTo && (
            <div className="mb-3 p-2 bg-muted rounded-lg flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Replying to {replyingTo.userName}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {replyingTo.text}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onCancelReply}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>
                  {uploadProgress[file.name] && (
                    <Progress
                      value={uploadProgress[file.name]}
                      className="w-20"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Area */}
          <div className="flex items-end gap-2">
            {/* Formatting Toolbar */}
            <Popover open={showFormatting} onOpenChange={setShowFormatting}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="self-end mb-1">
                  <Bold className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8"
                    onClick={() => insertFormatting('bold')}
                  >
                    <Bold className="w-3 h-3 mr-2" />
                    Bold
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8"
                    onClick={() => insertFormatting('italic')}
                  >
                    <Italic className="w-3 h-3 mr-2" />
                    Italic
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start h-8"
                    onClick={() => insertFormatting('code')}
                  >
                    <Code className="w-3 h-3 mr-2" />
                    Code
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Message Input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  replyingTo
                    ? 'Reply to message...'
                    : `Message ${workspaceName ? `#${workspaceName}` : 'workspace'}...`
                }
                className="min-h-[48px] max-h-[120px] resize-none pr-20"
                disabled={isSubmitting}
              />

              {/* Character Count */}
              {message.length > 800 && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-1 rounded">
                  {message.length}/2000
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 self-end mb-1">
              {/* File Upload */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isSubmitting}>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload File
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Upload Image
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Emoji */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isSubmitting}>
                    <Smile className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add emoji</TooltipContent>
              </Tooltip>

              {/* Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={
                  (!message.trim() && attachments.length === 0) || isSubmitting
                }
                size="sm"
                className="min-w-[80px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Input Hints */}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Press Enter to send, Shift + Enter for new line</span>
              <div className="flex items-center gap-2">
                <AtSign className="w-3 h-3" />
                <span>@mention</span>
                <Hash className="w-3 h-3" />
                <span>#workspace</span>
              </div>
            </div>
            {attachments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {attachments.length} file{attachments.length > 1 ? 's' : ''}{' '}
                attached
              </Badge>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            multiple
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx"
          />
        </div>
      </CardContent>
    </Card>
  )
}
