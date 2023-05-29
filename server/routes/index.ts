import { type NextFunction, type Request, type Response } from 'express'
import express from 'express'
import { StatusCodes } from 'http-status-codes'
import rateLimit from 'express-rate-limit'
import { redisClient } from '../src/redis.ts'
import config from '../config.ts'

const router = express.Router()
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const limiter = (args?) => rateLimit({
  windowMs: 1000 * 60,
  max: 60,
  keyGenerator: req => req.fingerprint?.hash ?? '',
  ...args
})

router.get('/health', async (req, res) => {
  console.log('[/health]', JSON.stringify(req.fingerprint))
  res.send('OK').end()
})

const authed = (req: Request, res: Response, next: NextFunction): void => {
  const s = req.header('X-CRYPTOSHEET-SECRET')
  if (config.secret && (s !== config.secret)) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: `Invalid X-CRYPTOSHEET-SECRET: ${s}`, code: 0 })
    return
  }
  next()
}

router.get('/basic',
  limiter(),
  authed,
  async (req, res) => {
    const { key } = req.query
    if (!key) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'need key in query', key })
    }
    console.log('[GET /basic]', { key })
    try {
      const value = await redisClient.get(key)
      res.json({ value })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

router.post('/basic',
  limiter(),
  authed,
  async (req, res) => {
    const { key, value } = req.body
    if (!key || !value) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'need key and value in body', key, value })
    }
    console.log('[POST /basic]', { key, value })
    try {
      const response = await redisClient.set(key, value)
      res.json({ response })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

router.delete('/basic',
  limiter(),
  authed,
  async (req, res) => {
    const { key } = req.query
    if (!key) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'need key in query', key })
    }
    console.log('[DEL /basic]', { key })
    try {
      const ret = await redisClient.del(key)
      res.json({ updated: ret === 1 })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

const SUPPORTED_COMMANDS = [
  'COPY',
  'DEL',
  'GET',
  'SET',
  'EXISTS',
  'EXPIRE',
  'MOVE',
  'TOUCH',
  'RENAME',

  'HDEL',
  'HEXISTS',
  'HGET',
  'HGETALL',
  'HINCRBY',
  'HINCRBYFLOAT',
  'HKEYS',
  'HLEN',
  'HMGET',
  'HMSET',
  'HRANDFIELD',
  'HSCAN',
  'HSET',
  'HSETNX',
  'HSTRLEN',
  'HVALS',

  'SADD',
  'SCARD',
  'SDIFF',
  'SDIFFSTORE',
  'SINTER',
  'SINTERCARD',
  'SINTERSTORE',
  'SISMEMBER',
  'SMEMBERS',
  'SMISMEMBER',
  'SMOVE',
  'SPOP',
  'SRANDMEMBER',
  'SREM',
  'SSCAN',
  'SUNION',
  'SUNIONSTORE',

  'ZADD',
  'ZCARD',
  'ZCOUNT',
  'ZDIFF',
  'ZDIFFSTORE',
  'ZINCRBY',
  'ZINTER',
  'ZINTERCARD',
  'ZINTERSTORE',
  'ZLEXCOUNT',
  'ZMPOP',
  'ZMSCORE',
  'ZPOPMAX',
  'ZPOPMIN',
  'ZRANDMEMBER',
  'ZRANGE',
  'ZRANGEBYLEX',
  'ZRANGEBYSCORE',
  'ZRANGESTORE',
  'ZRANK',
  'ZREM',
  'ZREMRANGEBYLEX',
  'ZREMRANGEBYRANK',
  'ZREMRANGEBYSCORE',
  'ZREVRANGE',
  'ZREVRANGEBYLEX',
  'ZREVRANGEBYSCORE',
  'ZREVRANK',
  'ZSCAN',
  'ZSCORE',
  'ZUNION',
  'ZUNIONSTORE',

  'PFADD',
  'PFCOUNT',
  'PFDEBUG',
  'PFMERGE',
  'PFSELFTEST',

  'GEOADD',
  'GEODIST',
  'GEOHASH',
  'GEOPOS',
  'GEORADIUS',
  'GEORADIUS_RO',
  'GEORADIUSBYMEMBER',
  'GEORADIUSBYMEMBER_RO',
  'GEOSEARCH',
  'GEOSEARCHSTORE',

  'APPEND',
  'DECR',
  'DECRBY',
  'GET',
  'GETDEL',
  'GETEX',
  'GETRANGE',
  'GETSET',
  'INCR',
  'INCRBY',
  'INCRBYFLOAT',
  'LCS',
  'MGET',
  'MSET',
  'MSETNX',
  'PSETEX',
  'SET',
  'SETEX',
  'SETNX',
  'SETRANGE',
  'STRLEN',
  'SUBSTR'
]
router.post('/cmd',
  limiter(),
  authed,
  async (req, res) => {
    try {
      const { cmd, args } = req.body
      if (!cmd || !args) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'need cmd and args', cmd, args })
      }
      if (typeof cmd !== 'string') {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'cmd must be string', cmd })
      }
      if (args.length === undefined || typeof args !== 'object') {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'args must be array', args })
      }
      if (!SUPPORTED_COMMANDS.includes(cmd)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'unsupported command', cmd })
      }
      const response = await redisClient.sendCommand([cmd, ...args])
      res.json({ response })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

export default router
