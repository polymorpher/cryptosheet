import * as dotenv from 'dotenv'
dotenv.config()

const DEBUG = process.env.DEBUG === 'true' || process.env.DEBUG === '1'
const config = {
  debug: DEBUG,
  provider: process.env.DEFAULT_RPC ?? 'https://api.harmony.one',
  verbose: process.env.VERBOSE === 'true' || process.env.VERBOSE === '1',
  https: {
    only: process.env.HTTPS_ONLY === 'true' || process.env.HTTPS_ONLY === '1',
    key: DEBUG ? './certs/test.key' : './certs/privkey.pem',
    cert: DEBUG ? './certs/test.cert' : './certs/fullchain.pem'
  },
  secret: process.env.SECRET || '',
  corsOrigins: process.env.CORS ?? '',
  // redis[s]://[[username][:password]@][host][:port][/db-number]
  redis: { url: process.env.REDIS_URL }
}
export default config
