import type { Request, Response, NextFunction } from 'express'
import { ZodError, type ZodSchema } from 'zod'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'validation_error',
          message: 'Request body validation failed',
          details: error.errors,
        })
        return
      }
      next(error)
    }
  }
}
