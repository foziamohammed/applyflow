import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { registerSchema, loginSchema } from '@applyflow/shared'
import { prisma } from '../db.js'
import { validate } from '../middleware/validate.js'
import { signAccessToken, authMiddleware } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import type { Response } from 'express'

const router: Router = Router()

const BCRYPT_SALT_ROUNDS = 12
const REFRESH_TOKEN_EXPIRY_DAYS = 30

function getRefreshSecret(): string {
  const secret = process.env['JWT_REFRESH_SECRET'] ?? process.env['JWT_SECRET']
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET environment variable is not set')
  }
  return secret
}

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  })
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      res.status(409).json({ error: 'conflict', message: 'Email already registered' })
      return
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
    const user = await prisma.user.create({
      data: { email, passwordHash },
    })

    // Generate tokens
    const accessToken = signAccessToken(user.id)
    const refreshTokenValue = crypto.randomUUID()

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    })

    setRefreshTokenCookie(res, refreshTokenValue)
    res.status(201).json({ accessToken, userId: user.id })
  } catch (error) {
    console.error('[Auth] Registration error:', error)
    res.status(500).json({ error: 'internal_error', message: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials' })
      return
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid credentials' })
      return
    }

    // Generate tokens
    const accessToken = signAccessToken(user.id)
    const refreshTokenValue = crypto.randomUUID()

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    })

    setRefreshTokenCookie(res, refreshTokenValue)
    res.json({ accessToken, userId: user.id })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    res.status(500).json({ error: 'internal_error', message: 'Login failed' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const refreshTokenValue = req.cookies?.refreshToken as string | undefined
    if (!refreshTokenValue) {
      res.status(401).json({ error: 'unauthorized', message: 'No refresh token provided' })
      return
    }

    // Find and validate the refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } })
      }
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired refresh token' })
      return
    }

    // Rotate: delete old token, issue new pair
    await prisma.refreshToken.delete({ where: { id: storedToken.id } })

    const accessToken = signAccessToken(storedToken.userId)
    const newRefreshTokenValue = crypto.randomUUID()

    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenValue,
        userId: storedToken.userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
      },
    })

    setRefreshTokenCookie(res, newRefreshTokenValue)
    res.json({ accessToken, userId: storedToken.userId })
  } catch (error) {
    console.error('[Auth] Refresh error:', error)
    res.status(500).json({ error: 'internal_error', message: 'Token refresh failed' })
  }
})

export default router
