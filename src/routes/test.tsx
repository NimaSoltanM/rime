// app/routes/test.tsx - Comprehensive File Upload Test Page
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useFileUpload } from '@/hooks/file/use-file-upload'
import { useFileInput } from '@/hooks/file/use-file-input'
import { useDragDrop } from '@/hooks/file/use-drag-drop'
import { useClipboard } from '@/hooks/file/use-clipboard'
import { useCurrentUser } from '@/lib/auth'
import { formatFileSize } from '@/hooks/file/file-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Upload,
  FileText,
  Image,
  Paperclip,
  Settings,
  Copy,
} from 'lucide-react'

export const Route = createFileRoute('/test')({
  component: RouteComponent,
})

function RouteComponent() {
  const currentUser = useCurrentUser()
  const [testResults, setTestResults] = useState<string[]>([])

  // Mock organization ID for testing (replace with real one)
  const organizationId = 'test-org-id' as any
  const workspaceId = 'test-workspace-id' as any

  const addTestResult = (result: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${result}`,
    ])
  }

  if (!currentUser) {
    return (
      <div className="p-8 text-center">
        <p>Please log in to test file uploads</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">File Upload System Test</h1>
        <p className="text-muted-foreground">
          Test all file upload contexts and interaction methods
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Profile Picture Upload Test */}
        <ProfilePictureTest
          organizationId={organizationId}
          onResult={addTestResult}
        />

        {/* 2. Chat Attachment Test */}
        <ChatAttachmentTest
          organizationId={organizationId}
          workspaceId={workspaceId}
          onResult={addTestResult}
        />

        {/* 3. Document Upload Test */}
        <DocumentUploadTest
          organizationId={organizationId}
          workspaceId={workspaceId}
          onResult={addTestResult}
        />

        {/* 4. Workspace Logo Test */}
        <WorkspaceLogoTest
          organizationId={organizationId}
          workspaceId={workspaceId}
          onResult={addTestResult}
        />

        {/* 5. Drag & Drop Test */}
        <DragDropTest
          organizationId={organizationId}
          onResult={addTestResult}
        />

        {/* 6. Clipboard Paste Test */}
        <ClipboardTest
          organizationId={organizationId}
          onResult={addTestResult}
        />
      </div>

      {/* Test Results Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Test Results Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-muted-foreground">
              No tests run yet. Try the upload components above!
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="text-sm font-mono bg-muted p-2 rounded"
                >
                  {result}
                </div>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestResults([])}
            className="mt-4"
          >
            Clear Log
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Profile Picture Upload Test Component
function ProfilePictureTest({
  organizationId,
  onResult,
}: {
  organizationId: any
  onResult: (result: string) => void
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { uploadState, uploadFile, validateFile } = useFileUpload({
    context: 'profile_picture',
    organizationId,
    onUploadStart: (file) => {
      onResult(`✅ Started uploading profile picture: ${file.name}`)
    },
    onUploadComplete: (fileId, file) => {
      onResult(`🎉 Profile picture uploaded successfully! ID: ${fileId}`)
      setPreviewUrl(null)
    },
    onUploadError: (error, file) => {
      onResult(`❌ Profile picture upload failed: ${error}`)
      setPreviewUrl(null)
    },
  })

  const { openFilePicker, getInputProps } = useFileInput({
    accept: 'image/*',
    onFilesSelected: (files) => {
      const file = files[0]
      if (file) {
        const validationError = validateFile(file)
        if (validationError) {
          onResult(`⚠️ Profile picture validation failed: ${validationError}`)
          return
        }
        setPreviewUrl(URL.createObjectURL(file))
        uploadFile(file)
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Profile Picture Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input {...getInputProps()} />

        <div className="flex items-center gap-4">
          <Avatar
            className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity border-2 border-dashed border-gray-300"
            onClick={openFilePicker}
          >
            <AvatarImage src={previewUrl || undefined} />
            <AvatarFallback>
              {uploadState.status === 'uploading' ? '📤' : '🖼️'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">
              Click avatar to upload (Images only, max 5MB)
            </p>

            {uploadState.status === 'uploading' && (
              <Progress value={uploadState.progress} className="mb-2" />
            )}

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  uploadState.status === 'success'
                    ? 'default'
                    : uploadState.status === 'error'
                      ? 'destructive'
                      : uploadState.status === 'uploading'
                        ? 'secondary'
                        : 'outline'
                }
              >
                {uploadState.status === 'idle'
                  ? 'Ready'
                  : uploadState.status === 'uploading'
                    ? `Uploading ${uploadState.progress}%`
                    : uploadState.status === 'success'
                      ? 'Success'
                      : uploadState.status === 'error'
                        ? 'Error'
                        : 'Unknown'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Test with valid image (JPG, PNG, WebP, GIF)</p>
          <p>• Test with invalid file type (PDF, etc.)</p>
          <p>• Test with oversized image (&gt;5MB)</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Chat Attachment Test Component
function ChatAttachmentTest({
  organizationId,
  workspaceId,
  onResult,
}: {
  organizationId: any
  workspaceId: any
  onResult: (result: string) => void
}) {
  const { uploadState, uploadFile } = useFileUpload({
    context: 'chat_attachment',
    organizationId,
    workspaceId,
    autoUpload: true,
    onUploadComplete: (fileId, file) => {
      onResult(`💬 Chat attachment uploaded: ${file.name} (ID: ${fileId})`)
    },
    onUploadError: (error, file) => {
      onResult(`❌ Chat attachment failed: ${error}`)
    },
  })

  const { openFilePicker, getInputProps } = useFileInput({
    accept: '*/*',
    multiple: true,
    onFilesSelected: (files) => {
      onResult(`📎 Selected ${files.length} files for chat`)
      files.forEach((file) => uploadFile(file))
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          Chat Attachment Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input {...getInputProps()} />

        <div className="flex items-center gap-2">
          <Button onClick={openFilePicker} size="sm">
            <Paperclip className="w-4 h-4 mr-2" />
            Attach Files
          </Button>

          <Button
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'image/*'
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files
                if (files) {
                  onResult(`🖼️ Quick image selected: ${files[0].name}`)
                  uploadFile(files[0])
                }
              }
              input.click()
            }}
            variant="outline"
            size="sm"
          >
            <Image className="w-4 h-4 mr-2" />
            Quick Image
          </Button>
        </div>

        {uploadState.status === 'uploading' && (
          <div className="space-y-2">
            <Progress value={uploadState.progress} />
            <p className="text-sm text-muted-foreground">
              Uploading {uploadState.file?.name}... {uploadState.progress}%
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Test with any file type (should accept all)</p>
          <p>• Test with multiple files at once</p>
          <p>• Test with large files (up to 100MB)</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Document Upload Test Component
function DocumentUploadTest({
  organizationId,
  workspaceId,
  onResult,
}: {
  organizationId: any
  workspaceId: any
  onResult: (result: string) => void
}) {
  const { uploadState, selectFiles } = useFileUpload({
    context: 'document',
    organizationId,
    workspaceId,
    onUploadComplete: (fileId, file) => {
      onResult(
        `📄 Document uploaded: ${file.name} (${formatFileSize(file.size)})`,
      )
    },
    onUploadError: (error) => {
      onResult(`❌ Document upload failed: ${error}`)
    },
  })

  const { isDragging, getDropZoneProps } = useDragDrop({
    onFilesDropped: (files) => {
      onResult(`📂 Dropped ${files.length} files for document upload`)
      selectFiles(files)
    },
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,image/*',
    multiple: true,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getDropZoneProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">
            {isDragging ? 'Drop files here!' : 'Drag & Drop Documents'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            PDF, Word, Excel, images or text files (max 50MB)
          </p>

          {uploadState.status === 'uploading' && (
            <div className="mt-4">
              <Progress value={uploadState.progress} />
              <p className="text-sm mt-2">
                Uploading... {uploadState.progress}%
              </p>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-4">
          <p>• Drag PDF, Word, Excel files here</p>
          <p>• Test with invalid file types (executable files)</p>
          <p>• Test with oversized files (&gt;50MB)</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Workspace Logo Test Component
function WorkspaceLogoTest({
  organizationId,
  workspaceId,
  onResult,
}: {
  organizationId: any
  workspaceId: any
  onResult: (result: string) => void
}) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const { uploadState, uploadFile } = useFileUpload({
    context: 'workspace_logo',
    organizationId,
    workspaceId,
    onUploadComplete: (fileId) => {
      onResult(`🏢 Workspace logo updated successfully! ID: ${fileId}`)
      setLogoPreview(null)
    },
    onUploadError: (error) => {
      onResult(`❌ Logo upload failed: ${error}`)
      setLogoPreview(null)
    },
  })

  const { openFilePicker, getInputProps } = useFileInput({
    accept: 'image/*',
    onFilesSelected: (files) => {
      const file = files[0]
      if (file) {
        setLogoPreview(URL.createObjectURL(file))
        uploadFile(file)
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Workspace Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input {...getInputProps()} />

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                🏢
              </div>
            )}
          </div>

          <div className="flex-1">
            <h4 className="font-medium">Test Workspace Logo</h4>
            <p className="text-sm text-muted-foreground">
              JPG, PNG or WebP (max 2MB)
            </p>

            {uploadState.status === 'uploading' && (
              <Progress value={uploadState.progress} className="mt-2" />
            )}
          </div>

          <Button
            onClick={openFilePicker}
            disabled={uploadState.status === 'uploading'}
          >
            {uploadState.status === 'uploading'
              ? 'Uploading...'
              : 'Change Logo'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Test with valid logo images</p>
          <p>• Test with oversized images (&gt;2MB)</p>
          <p>• Old logo should be replaced automatically</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Drag & Drop Test Component
function DragDropTest({
  organizationId,
  onResult,
}: {
  organizationId: any
  onResult: (result: string) => void
}) {
  const { isDragging, isOverDropZone, getDropZoneProps } = useDragDrop({
    onFilesDropped: (files) => {
      onResult(`🎯 Drag & Drop test: ${files.length} files dropped`)
      files.forEach((file) => {
        onResult(
          `  • ${file.name} (${formatFileSize(file.size)}, ${file.type})`,
        )
      })
    },
    multiple: true,
    accept: '*/*',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Drag & Drop Test
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getDropZoneProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50 scale-105'
              : 'border-gray-300'
          } ${isOverDropZone ? 'bg-blue-100' : ''}`}
        >
          <div className="space-y-3">
            <div className="text-4xl">{isDragging ? '🎯' : '📁'}</div>
            <h3 className="font-medium">
              {isDragging ? 'Drop files here!' : 'Drag & Drop Test Zone'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isDragging
                ? 'Release to test file handling'
                : 'Drag any files here to test detection'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Badge variant={isDragging ? 'default' : 'outline'}>
                {isDragging ? 'Dragging' : 'Ready'}
              </Badge>
              <Badge variant={isOverDropZone ? 'default' : 'outline'}>
                {isOverDropZone ? 'Over Zone' : 'Outside'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-4">
          <p>• Test drag enter/leave detection</p>
          <p>• Test with single and multiple files</p>
          <p>• Test with different file types</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Clipboard Paste Test Component
function ClipboardTest({
  organizationId,
  onResult,
}: {
  organizationId: any
  onResult: (result: string) => void
}) {
  const [lastPastedFile, setLastPastedFile] = useState<File | null>(null)

  useClipboard({
    onFilePaste: (file) => {
      onResult(
        `📋 File pasted from clipboard: ${file.name} (${formatFileSize(file.size)})`,
      )
      setLastPastedFile(file)
    },
    accept: ['image/*'],
    enabled: true,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="w-5 h-5" />
          Clipboard Paste Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="space-y-3">
            <div className="text-4xl">📋</div>
            <h3 className="font-medium">Paste Image Test</h3>
            <p className="text-sm text-muted-foreground">
              Copy an image and paste it here (Ctrl/Cmd + V)
            </p>

            {lastPastedFile && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Last pasted:</strong> {lastPastedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(lastPastedFile.size)} • {lastPastedFile.type}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Copy image from web/screenshot and paste</p>
          <p>• Test with different image formats</p>
          <p>• Only images should be detected</p>
        </div>
      </CardContent>
    </Card>
  )
}
