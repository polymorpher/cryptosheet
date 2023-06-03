import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { redisClient, commandOptions } from '../src/redis.ts'

import { limiter } from './middleware.ts'

const router = express.Router()
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type

router.get('/health', async (req, res) => {
  console.log('[/health]', JSON.stringify(req.fingerprint))
  res.send('OK').end()
})

router.get('/:key',
  limiter(),
  // authed,
  async (req, res) => {
    const key = req.params.key as string | undefined
    if (!key) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'need key in query', key })
    }
    console.log('[GET /basic]', { key })
    try {
      if (key.endsWith(':file')) {
        const mimetype = await redisClient.get(`${key}:mimetype`)
        if (!mimetype) {
          return res.status(StatusCodes.BAD_REQUEST).json({ error: 'key does not exist', key })
        }
        const value = await redisClient.get(commandOptions({ returnBuffers: true }), key)
        return res.contentType(mimetype).send(value).end()
      }
      const value = await redisClient.get(key)
      res.json({ value })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

export default router
