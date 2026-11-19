import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  userId: string
}

function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET']
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }
  return secret
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '24h' })
}

export function verifyAccessToken(token: string): { userId: string } {
  const payload = jwt.verify(token, getJwtSecret()) as { userId: string }
  return payload
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = verifyAccessToken(token)
    ;(req as AuthenticatedRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired access token' })
  }
}
