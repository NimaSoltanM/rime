// app/components/MessageInput.tsx
import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@/lib/auth' // ← ADD THIS IMPORT
import { Send, Paperclip, Smile, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'

interface MessageInputProps {
  workspaceId: Id<'workspaces'>
  workspaceName?: string
}

export default function MessageInput({
  workspaceId,
  workspaceName,
}: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get session token for auth
  const { sessionToken } = useAuthActions()

  // Mutation for sending messages (optimistic updates)
  const sendMessage = useMutation(api.messages.send)

  const handleSendMessage = async () => {
    const messageText = newMessage.trim()
    if (!messageText || isSubmitting || !sessionToken) return

    try {
      setIsSubmitting(true)

      // Clear input immediately for better UX
      setNewMessage('')

      // Send message to Convex
      await sendMessage({
        text: messageText,
        workspaceId,
        sessionToken, // ← PASS SESSION TOKEN
      })
    } catch (error) {
      console.error('Failed to send message:', error)

      // Restore message text on error
      setNewMessage(messageText)

      // You might want to show a toast notification here
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
  }

  return (
    <Card className="rounded-none border-l-0 border-r-0 border-b-0">
      <CardContent className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="sm">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Smile className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              Shift + Enter for new line
            </span>
          </div>

          {/* Message Input */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${workspaceName ? `#${workspaceName}` : 'workspace'}...`}
                className="min-h-[48px] max-h-[120px] resize-none"
                disabled={isSubmitting}
              />

              {/* Character count for long messages */}
              {newMessage.length > 200 && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background px-1 rounded">
                  {newMessage.length}/1000
                </div>
              )}
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>

          {/* Typing indicator placeholder */}
          <div className="mt-2 h-4 flex items-center">
            <span className="text-xs text-muted-foreground">
              {/* Future: Show who's typing */}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
