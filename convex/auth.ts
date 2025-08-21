// convex/auth.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Helper to generate secure random token
function generateSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Generate and store OTP for phone number
export const generateOTP = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    // Generate random 5-digit code
    const code = Math.floor(10000 + Math.random() * 90000).toString()

    // Expire in 15 minutes
    const expiresAt = Date.now() + 15 * 60 * 1000

    // Clean up any existing OTPs for this phone
    const existingOTPs = await ctx.db
      .query('otps')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .collect()

    for (const otp of existingOTPs) {
      await ctx.db.delete(otp._id)
    }

    // Store new OTP
    await ctx.db.insert('otps', {
      phone: args.phone,
      code,
      expiresAt,
      isUsed: false,
    })

    // Return the code for development (will show in toast)
    return { code }
  },
})

// Verify OTP and create session
export const verifyOTP = mutation({
  args: {
    phone: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the OTP
    const otp = await ctx.db
      .query('otps')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .first()

    if (!otp) {
      throw new Error('No OTP found for this phone number')
    }

    // Check if expired
    if (Date.now() > otp.expiresAt) {
      await ctx.db.delete(otp._id)
      throw new Error('OTP has expired')
    }

    // Check if already used
    if (otp.isUsed) {
      throw new Error('OTP has already been used')
    }

    // Check if code matches
    if (otp.code !== args.code) {
      throw new Error('Invalid OTP code')
    }

    // Mark OTP as used
    await ctx.db.patch(otp._id, { isUsed: true })

    // Find or create user
    let user = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', args.phone))
      .first()

    if (!user) {
      // Create new user
      const userId = await ctx.db.insert('users', {
        phone: args.phone,
        status: 'online',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      user = await ctx.db.get(userId)
    } else {
      // Update status to online and last updated
      await ctx.db.patch(user._id, {
        status: 'online',
        updatedAt: Date.now(),
      })
      user = await ctx.db.get(user._id)
    }

    if (!user) throw new Error('Failed to create user')

    // Clean up old sessions for this user
    const oldSessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    for (const session of oldSessions) {
      await ctx.db.delete(session._id)
    }

    // Create new session
    const sessionToken = generateSessionToken()
    const sessionExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days

    await ctx.db.insert('sessions', {
      userId: user._id,
      token: sessionToken,
      expiresAt: sessionExpiresAt,
      createdAt: Date.now(),
    })

    return {
      user,
      sessionToken,
    }
  },
})

// Update user's name (requires valid session)
export const updateUserName = mutation({
  args: {
    sessionToken: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.sessionToken))
      .first()

    if (!session || Date.now() > session.expiresAt) {
      throw new Error('Invalid or expired session')
    }

    // Get user
    const user = await ctx.db.get(session.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Update user name
    await ctx.db.patch(user._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(user._id)
  },
})

// Get current user by session token
export const getCurrentUser = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    // Don't validate empty tokens
    if (!args.sessionToken) {
      return null
    }

    // Find session
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.sessionToken))
      .first()

    if (!session || Date.now() > session.expiresAt) {
      return null
    }

    // Get user
    return await ctx.db.get(session.userId)
  },
})

// Sign out (delete session)
export const signOut = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.sessionToken))
      .first()

    if (session) {
      // Update user status to offline
      await ctx.db.patch(session.userId, {
        status: 'offline',
        updatedAt: Date.now(),
      })

      // Delete session
      await ctx.db.delete(session._id)
    }

    return { success: true }
  },
})

// Clean up expired sessions (run this periodically)
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const expiredSessions = await ctx.db
      .query('sessions')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect()

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id)
    }

    return { deletedCount: expiredSessions.length }
  },
})
