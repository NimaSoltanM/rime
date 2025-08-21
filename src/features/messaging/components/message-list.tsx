// app/components/MessageList.tsx
import React, { useEffect, useRef } from 'react'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/lib/auth' // Your existing auth hook
import { MessageSquare } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Id } from 'convex/_generated/dataModel'
import { api } from 'convex/_generated/api'

interface MessageListProps {
  workspaceId: Id<'workspaces'>
}

export default function MessageList({ workspaceId }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUser = useCurrentUser()

  // Real-time messages using your Convex pattern
  const { data: messages } = useSuspenseQuery(
    convexQuery(api.messages.get, { workspaceId }),
  )

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()

    // If today, show time. If older, show date
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    }
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U'
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const isOwnMessage = (userId: string) => {
    return currentUser?._id === userId
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="text-center p-8">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to start the conversation!
          </p>
        </Card>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => {
            const isOwn = isOwnMessage(message.userId)
            const showAvatar =
              index === 0 ||
              messages[index - 1].userId !== message.userId ||
              message._creationTime - messages[index - 1]._creationTime > 300000 // 5 min gap

            return (
              <div
                key={message._id}
                className={`flex gap-4 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
                >
                  <Avatar>
                    <AvatarFallback
                      className={
                        isOwn ? 'bg-primary text-primary-foreground' : ''
                      }
                    >
                      {getInitials(
                        message.user?.firstName,
                        message.user?.lastName,
                      )}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Message Content */}
                <div
                  className={`flex-1 max-w-2xl ${isOwn ? 'text-right' : ''}`}
                >
                  {/* User info (only show if avatar is shown) */}
                  {showAvatar && (
                    <div
                      className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}
                    >
                      <span className="font-semibold text-foreground">
                        {isOwn
                          ? 'You'
                          : `${message.user?.firstName || ''} ${message.user?.lastName || ''}`.trim() ||
                            'Unknown User'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(message._creationTime)}
                      </span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <Card
                    className={`inline-block p-4 max-w-full ${
                      isOwn
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {message.text}
                    </p>

                    {/* Time for non-avatar messages */}
                    {!showAvatar && (
                      <div
                        className={`text-xs mt-1 ${
                          isOwn
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(message._creationTime)}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )
          })}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </ScrollArea>
  )
}
