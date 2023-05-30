import { createClient } from 'redis'
import config from '../config.ts'
export { commandOptions } from 'redis'

export let redisClient

export const initRedis = async (): Promise<boolean> => {
  if (redisClient === undefined) {
    console.log(`Connecting redis to ${config.redis.url}`)
    redisClient = createClient({ url: config.redis.url })
    await redisClient.connect()
  }
  return redisClient.isReady
}

export const testRedis = async (): Promise<void> => {
  const testRes = await redisClient.keys('*')
  console.log(testRes)
}

export const SUPPORTED_COMMANDS = [
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
