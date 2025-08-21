// app/components/MessageList.tsx
import React, { useEffect, useRef, useState } from 'react'
import { convexQuery } from '@convex-dev/react-query'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import {
  MessageSquare,
  MoreVertical,
  Pin,
  Reply,
  Smile,
  Copy,
  Edit3,
  Trash2,
  FileText,
  Image as ImageIcon,
  Download,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Id } from 'convex/_generated/dataModel'
import { api } from 'convex/_generated/api'

interface MessageListProps {
  workspaceId: Id<'workspaces'>
  sessionToken: string
}

export default function MessageList({
  workspaceId,
  sessionToken,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

  const { data: messages = [] } = useSuspenseQuery(
    convexQuery(api.messages.get, {
      workspaceId,
      sessionToken,
    }),
  )

  const addReaction = useMutation(api.messages.addReaction)
  const removeReaction = useMutation(api.messages.removeReaction)
  const pinMessage = useMutation(api.messages.pin)
  const deleteMessage = useMutation(api.messages.remove)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffInDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } else if (diffInDays === 1) {
      return 'Yesterday'
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    }
  }

  const formatDateDivider = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U'
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getUserName = (user: any) => {
    if (!user) return 'Unknown User'
    return (
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User'
    )
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'away':
        return 'bg-yellow-500'
      case 'in-meeting':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!sessionToken) return

    try {
      await addReaction({
        messageId: messageId as Id<'messages'>,
        emoji,
        sessionToken,
      })
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const handlePinMessage = async (messageId: string) => {
    if (!sessionToken) return

    try {
      await pinMessage({
        messageId: messageId as Id<'messages'>,
        sessionToken,
      })
    } catch (error) {
      console.error('Failed to pin message:', error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!sessionToken) return

    try {
      await deleteMessage({
        messageId: messageId as Id<'messages'>,
        sessionToken,
      })
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups: any[], message, index) => {
    const messageDate = new Date(message._creationTime).toDateString()
    const prevMessageDate =
      index > 0
        ? new Date(messages[index - 1]._creationTime).toDateString()
        : null

    if (messageDate !== prevMessageDate) {
      groups.push({ type: 'date', date: message._creationTime })
    }

    groups.push({ type: 'message', ...message })
    return groups
  }, [])

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="text-center p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This is the beginning of your workspace. Send a message below to get
            things started!
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Smile className="w-4 h-4" />
            <span>Use @ to mention teammates</span>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <ScrollArea className="flex-1">
        <div className="p-3 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-2">
            {groupedMessages.map((item, index) => {
              if (item.type === 'date') {
                return (
                  <div
                    key={`date-${item.date}`}
                    className="flex items-center gap-4 my-6"
                  >
                    <Separator className="flex-1" />
                    <Badge variant="secondary" className="px-3 py-1">
                      {formatDateDivider(item.date)}
                    </Badge>
                    <Separator className="flex-1" />
                  </div>
                )
              }

              const message = item
              const prevMessage =
                index > 0 && groupedMessages[index - 1].type === 'message'
                  ? groupedMessages[index - 1]
                  : null

              const showAvatar =
                !prevMessage ||
                prevMessage.userId !== message.userId ||
                message._creationTime - prevMessage._creationTime > 300000

              const isHovered = hoveredMessageId === message._id

              return (
                <div
                  key={message._id}
                  className={`group relative transition-colors duration-200 ${
                    isHovered ? 'bg-muted/30' : ''
                  } rounded-lg p-2 -mx-2`}
                  onMouseEnter={() => setHoveredMessageId(message._id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="relative">
                            <Avatar className="w-10 h-10 cursor-pointer">
                              <AvatarImage src={message.user?.avatar} />
                              <AvatarFallback className="text-sm font-medium">
                                {getInitials(
                                  message.user?.firstName,
                                  message.user?.lastName,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(message.user?.status)}`}
                            />
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={message.user?.avatar} />
                              <AvatarFallback>
                                {getInitials(
                                  message.user?.firstName,
                                  message.user?.lastName,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">
                                {getUserName(message.user)}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${getStatusColor(message.user?.status)}`}
                                />
                                {message.user?.status || 'offline'}
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* User info and timestamp */}
                      {showAvatar && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {getUserName(message.user)}
                          </span>
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                {formatTime(message._creationTime)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {new Date(
                                  message._creationTime,
                                ).toLocaleString()}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          {message.isEdited && (
                            <Badge
                              variant="secondary"
                              className="text-xs px-1 py-0"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">edited</span>
                            </Badge>
                          )}
                          {message.isPinned && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1 py-0"
                            >
                              <Pin className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">pinned</span>
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Message text */}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-2">
                        {message.text}
                      </div>

                      {/* Attachment */}
                      {message.hasAttachment && (
                        <Card className="p-3 mb-2 max-w-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              {message.attachmentType?.startsWith('image/') ? (
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <FileText className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {message.attachmentName || 'Attachment'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {message.attachmentType}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      )}

                      {/* Thread indicator */}
                      {message.threadCount && message.threadCount > 0 && (
                        <Button variant="ghost" size="sm" className="mt-1 h-8">
                          <Reply className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">
                            {message.threadCount}{' '}
                            {message.threadCount === 1 ? 'reply' : 'replies'}
                          </span>
                          <span className="sm:hidden">
                            {message.threadCount}
                          </span>
                        </Button>
                      )}
                    </div>

                    {/* Message actions */}
                    <div
                      className={`flex items-start transition-opacity duration-200 ${
                        isHovered ? 'opacity-100' : 'opacity-0 lg:opacity-0'
                      } lg:group-hover:opacity-100`}
                    >
                      {/* Desktop: Individual buttons */}
                      <div className="hidden lg:flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReaction(message._id, '👍')}
                            >
                              <Smile className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add reaction</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Dropdown menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleReaction(message._id, '👍')}
                          >
                            <Smile className="w-4 h-4 mr-2" />
                            Add reaction
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Reply className="w-4 h-4 mr-2" />
                            Reply in thread
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handlePinMessage(message._id)}
                          >
                            <Pin className="w-4 h-4 mr-2" />
                            Pin message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteMessage(message._id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>
    </TooltipProvider>
  )
}
