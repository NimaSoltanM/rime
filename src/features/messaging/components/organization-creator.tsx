// app/components/OrganizationCreator.tsx
import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { useAuthActions } from '@/lib/auth'
import { Building2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'

interface OrganizationCreatorProps {
  onOrganizationCreated: (organizationId: Id<'organizations'>) => void
  onCancel?: () => void
}

export default function OrganizationCreator({
  onOrganizationCreated,
  onCancel,
}: OrganizationCreatorProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    emailDomain: '',
    allowPublicJoin: false,
    industry: '',
    size: '1-10' as '1-10' | '11-50' | '51-200' | '201-500' | '500+',
    website: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [slugError, setSlugError] = useState('')

  const { sessionToken } = useAuthActions()
  const createOrganization = useMutation(api.organizations.create)

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50)
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug:
        prev.slug === generateSlug(prev.name) ? generateSlug(name) : prev.slug,
    }))
  }

  const handleSlugChange = (slug: string) => {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .substring(0, 50)

    setFormData((prev) => ({ ...prev, slug: cleanSlug }))
    setSlugError('')

    // Basic slug validation
    if (cleanSlug.length < 3) {
      setSlugError('Slug must be at least 3 characters')
    } else if (cleanSlug.startsWith('-') || cleanSlug.endsWith('-')) {
      setSlugError('Slug cannot start or end with a dash')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionToken || isCreating || slugError) return

    const { name, slug, description, emailDomain, allowPublicJoin } = formData

    if (!name.trim() || !slug.trim()) {
      alert('Name and slug are required')
      return
    }

    try {
      setIsCreating(true)
      const organizationId = await createOrganization({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        emailDomain: emailDomain.trim() || undefined,
        allowPublicJoin,
        sessionToken,
      })

      onOrganizationCreated(organizationId)
    } catch (error: any) {
      console.error('Failed to create organization:', error)
      if (error.message.includes('slug already exists')) {
        setSlugError('This slug is already taken')
      } else {
        alert('Failed to create organization. Please try again.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Create Organization</CardTitle>
              <p className="text-sm text-muted-foreground">
                Set up your team workspace
              </p>
            </div>
          </div>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corporation"
              required
              disabled={isCreating}
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              URL Slug
              <span className="text-xs text-muted-foreground ml-1">
                (for your organization URL)
              </span>
            </Label>
            <div className="flex">
              <div className="px-3 py-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">
                org/
              </div>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="acme-corp"
                className="rounded-l-none"
                required
                disabled={isCreating}
              />
            </div>
            {slugError && (
              <p className="text-xs text-destructive">{slugError}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="What does your organization do?"
              className="min-h-[80px]"
              disabled={isCreating}
            />
          </div>

          {/* Email Domain */}
          <div className="space-y-2">
            <Label htmlFor="emailDomain">
              Email Domain (Optional)
              <span className="text-xs text-muted-foreground ml-1">
                (e.g., company.com)
              </span>
            </Label>
            <Input
              id="emailDomain"
              value={formData.emailDomain}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  emailDomain: e.target.value,
                }))
              }
              placeholder="company.com"
              disabled={isCreating}
            />
          </div>

          {/* Allow Public Join */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Public Join</Label>
              <p className="text-xs text-muted-foreground">
                Let people with your email domain join automatically
              </p>
            </div>
            <Switch
              checked={formData.allowPublicJoin}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, allowPublicJoin: checked }))
              }
              disabled={isCreating}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCreating}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                !formData.name.trim() ||
                !formData.slug.trim() ||
                isCreating ||
                !!slugError
              }
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
