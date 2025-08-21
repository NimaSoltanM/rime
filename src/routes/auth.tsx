// app/routes/auth.tsx
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuthActions } from '@/lib/auth'
import { getCurrentUserServer } from '@/lib/auth-server'

export const Route = createFileRoute('/auth')({
  beforeLoad: async () => {
    const user = await getCurrentUserServer()

    if (user && user.firstName && user.lastName) {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: AuthComponent,
})

type AuthStep = 'phone' | 'otp' | 'name'

function AuthComponent() {
  const navigate = useNavigate()
  const { signIn, sessionToken } = useAuthActions()
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const generateOTP = useMutation(api.auth.generateOTP)
  const verifyOTP = useMutation(api.auth.verifyOTP)
  const updateUserName = useMutation(api.auth.updateUserName)

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return

    setIsLoading(true)
    try {
      const result = await generateOTP({ phone: phone.trim() })

      // Show OTP in toast for development
      toast.success(`Your OTP code is: ${result.code}`, {
        duration: 10000,
        description: 'Enter this code to continue',
      })

      setStep('otp')
    } catch (error) {
      toast.error('Failed to generate OTP')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) return

    setIsLoading(true)
    try {
      const result = await verifyOTP({ phone: phone.trim(), code: otp.trim() })

      // Sign in with the session token (sets cookie)
      signIn(result.sessionToken)

      toast.success('Successfully authenticated!')

      // Check if user has completed profile
      if (result.user?.firstName && result.user?.lastName) {
        navigate({ to: '/dashboard' })
      } else {
        setStep('name')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid OTP')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !sessionToken) return

    setIsLoading(true)
    try {
      await updateUserName({
        sessionToken: sessionToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })

      toast.success('Profile completed successfully!')
      navigate({ to: '/dashboard' })
    } catch (error) {
      toast.error('Failed to update profile')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackFromOTP = () => {
    setStep('phone')
    setOtp('')
  }

  const handleBackFromName = () => {
    setStep('otp')
    setFirstName('')
    setLastName('')
  }

  const getStepDescription = () => {
    switch (step) {
      case 'phone':
        return 'Enter your phone number to get started'
      case 'otp':
        return 'Enter the 5-digit code we sent you'
      case 'name':
        return 'Tell us your name to complete setup'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Rime</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <Input
                  type="tel"
                  placeholder="Phone number (e.g., +1234567890)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !phone.trim()}
              >
                {isLoading ? 'Sending...' : 'Send Code'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter 5-digit code"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 5))
                  }
                  disabled={isLoading}
                  maxLength={5}
                  className="text-center text-2xl tracking-widest"
                  required
                />
              </div>
              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || otp.length !== 5}
                >
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBackFromOTP}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Enter your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Enter your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !firstName.trim() || !lastName.trim()}
                >
                  {isLoading ? 'Saving...' : 'Complete Setup'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBackFromName}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
