import { type NextFunction, type Request, type Response } from 'express'
import express from 'express'
import { StatusCodes } from 'http-status-codes'
import rateLimit from 'express-rate-limit'
import { redisClient, SUPPORTED_COMMANDS } from '../src/redis.ts'
import config from '../config.ts'
import axios from 'axios'
import { VM } from 'vm2'
import lodash from 'lodash-es'
// import { ethers } from 'ethers'
import crypto from 'crypto'

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

const base = axios.create({ timeout: 10000 })
router.get('/get',
  limiter(),
  authed,
  async (req, res) => {
    try {
      const sepPos = req.originalUrl.indexOf('?')
      const url = req.originalUrl.slice(sepPos + 1)
      if (!url) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'need url as query string', url })
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'malformed url', url })
      }
      const { data, status, statusText } = await base.get(url, { validateStatus: () => true })
      res.json({ data, status, statusText })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

const SUPPORTED_METHODS = ['get', 'post', 'put', 'delete']
router.post('/url',
  limiter(),
  authed,
  async (req, res) => {
    try {
      let { url, method, body, headers } = req.body
      if (!url) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'need url in body', url })
      }
      method = method?.toLowerCase()
      if (!SUPPORTED_METHODS.includes(method)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'method not supported', method })
      }
      const { data, status, statusText } = await base({ url, method, data: body, headers, validateStatus: () => true })
      res.json({ data, status, statusText })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

async function runVMScript (script: string, useEthers: boolean = false, timeout: number = 5000): Promise<any> {
  let ethers = {}
  if (useEthers) {
    const { default: e } = await import('ethers')
    ethers = e.ethers
  }
  const vm = new VM({
    timeout,
    allowAsync: false,
    sandbox: { crypto, lodash, ethers }
  })
  return vm.run(script)
}
router.get('/eval',
  limiter(),
  authed,
  async (req, res) => {
    try {
      const sepPos = req.originalUrl.indexOf('?')
      const script = req.originalUrl.slice(sepPos + 1)
      if (!script) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'no script provided', script })
      }
      const result = await runVMScript(script)
      res.json({ result })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString(), query: req.query })
    }
  })

router.post('/eval',
  limiter(),
  authed,
  async (req, res) => {
    try {
      const { script, useEthers, timeout } = req.body
      if (!script) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'no script provided', script })
      }
      const timeoutParsed = Number(timeout)
      if (!(timeoutParsed < 5000)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'timeout has to be less than 5000ms', timeout: timeoutParsed })
      }
      const result = await runVMScript(script, !!useEthers, timeoutParsed)
      res.json({ result })
    } catch (ex: any) {
      console.error(ex)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: ex.toString() })
    }
  })

export default router
