import rateLimit from 'express-rate-limit'
import { type NextFunction, type Request, type Response } from 'express'
import config from '../config.ts'
import { StatusCodes } from 'http-status-codes'

export const limiter = (args?): any => rateLimit({
  windowMs: 1000 * 60,
  max: 60,
  keyGenerator: req => req.fingerprint?.hash ?? '',
  ...args
})

export const authed = (req: Request, res: Response, next: NextFunction): void => {
  const s = req.header('X-CRYPTOSHEET-SECRET')
  if (config.secret && (s !== config.secret)) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: `Invalid X-CRYPTOSHEET-SECRET: ${s}`, code: 0 })
    return
  }
  next()
}
