# Crypto Sheet API server

This server exposes a subset of Redis database commands to the client, and allows clients to evaluate javascripts in sandboxes (with crypto, lodash, and ethers.js libraries included), upload files, call APIs, or retrieve resources from the web. This enables a spreadsheet client to experiment with advanced spreadsheet functionalities as cell formula without being limited by CORS restrictions by browsers, or delays in blockchain transactions.

## APIs

### Get key or resources from database

```
GET /:key
```

Response: 

If `key` ends with `:file`, the resource is retrieved as a binary buffer from the database, and the response will include its mime-type in the response header `content-type`. Otherwise, the value is retrieved as a string and returned in JSON:

```
{"value": "123"}
```

### Set key and a string value

```
POST /a/basic
{
    "key": "test",
    "value": "111"
}
```

Response:

The redis database's response to the set command. `key` must match `/^[a-zA-Z0-9\-_]+$/` and cannot be `a` or `health`.

```
{
    "response": "OK"
}
```

### Delete a key and its value

```
DELETE /a/basic?key=test
```

Response:

The redis database's response to the delete command

```
{
    "response": "OK"
}
```

### Execute a redis command

Support commands are: COPY, DEL, GET, SET, EXISTS, EXPIRE, MOVE, TOUCH, RENAME, HDEL, HEXISTS, HGET, HGETALL, HINCRBY, HINCRBYFLOAT, HKEYS, HLEN, HMGET, HMSET, HRANDFIELD, HSCAN, HSET, HSETNX, HSTRLEN, HVALS, SADD, SCARD, SDIFF, SDIFFSTORE, SINTER, SINTERCARD, SINTERSTORE, SISMEMBER, SMEMBERS, SMISMEMBER, SMOVE, SPOP, SRANDMEMBER, SREM, SSCAN, SUNION, SUNIONSTORE, ZADD, ZCARD, ZCOUNT, ZDIFF, ZDIFFSTORE, ZINCRBY, ZINTER, ZINTERCARD, ZINTERSTORE, ZLEXCOUNT, ZMPOP, ZMSCORE, ZPOPMAX, ZPOPMIN, ZRANDMEMBER, ZRANGE, ZRANGEBYLEX, ZRANGEBYSCORE, ZRANGESTORE, ZRANK, ZREM, ZREMRANGEBYLEX, ZREMRANGEBYRANK, ZREMRANGEBYSCORE, ZREVRANGE, ZREVRANGEBYLEX, ZREVRANGEBYSCORE, ZREVRANK, ZSCAN, ZSCORE, ZUNION, ZUNIONSTORE, PFADD, PFCOUNT, PFDEBUG, PFMERGE, PFSELFTEST, GEOADD, GEODIST, GEOHASH, GEOPOS, GEORADIUS, GEORADIUS_RO, GEORADIUSBYMEMBER, GEORADIUSBYMEMBER_RO, GEOSEARCH, GEOSEARCHSTORE, APPEND, DECR, DECRBY, GET, GETDEL, GETEX, GETRANGE, GETSET, INCR, INCRBY, INCRBYFLOAT, LCS, MGET, MSET, MSETNX, PSETEX, SET, SETEX, SETNX, SETRANGE, STRLEN, SUBSTR

```
POST /a/cmd
{
    "cmd": "HSET",
    "args": ["testset", "field1", "value1"]
}
```

Response:

The redis database's response to the delete command

```
{
    "response": "OK"
}
```

### Fetch a remote resource via HTTP GET

```
GET /a/get?https://google.com
```

Response:

```
{
    "data": "....",
    "status": 200,
    "statusText": "OK",
    "headers": {...}
}
```

### Call a remote API via an HTTP method

```
POST /a/url
{
    "url": "https://google.com",
    "method": "get",
    "body": {...},
    "headers": {...}
}
```

Response:

```
{
    "data": "....",
    "status": 200,
    "statusText": "OK",
    "headers": {...}
}
```

### Evaluate a simple javascript in a sandbox

```
GET /a/eval?1+1
```

Response:

```
{
    "result": 2
}
```

```
GET /eval?lodash.uniq([1,1,2,3,1])
```

Response:

```
{
    "result": [
        1,
        2,
        3
    ]
}
```

### Evaluate a complex javascript in a sandbox

```
POST /a/eval
{
    "script": "ethers.Wallet.createRandom().privateKey",
    "timeout": 100,
    "useEthers": true
}
```

Here, `useEthers` and `timeout` (in ms) are optional. If `useEthers` is true, a fresh instance of ethers.js v5.6 library is loaded dynamically, which may slow down the response time. `timeout` cannot be more than 30 seconds

Response:

```
{
    "result": "0x0ce9f8ba9756fdd0db2fb89db1abdbd92a9014321e94d3c18c766796307e9e32"
}
```

### Upload a file

```
POST /a/upload
content-type: multipart/form-data
fields:
- key: satoshi-html:file
- file: ...
```

Here, the key must ends with `:file`, and the uploaded file should be attached to `file` field. 

`key` must match `/^[a-zA-Z0-9\-_]+$/` and cannot be `a` or `health`.

Response:

```
{
    "response": "OK",
    "mimetype": "text/html",
    "originalname": "Google.html",
    "size": 143870
}
```

Internally, the mime-type of the file is stored at key `<key>:mimetype`. In the example above, the mime-type is stored at `satoshi-html:file:mimetype`