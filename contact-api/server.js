import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'

const PORT = Number(process.env.PORT || 8080)
const MONGODB_HOST = process.env.MONGODB_HOST || 'portfolio-mongodb.portfolio.svc.cluster.local'
const MONGODB_PORT = Number(process.env.MONGODB_PORT || 27017)
const MONGODB_USER = process.env.MONGODB_USER
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD
const MONGODB_DB = process.env.MONGODB_DB || 'portfolio'
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'contact_messages'

const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || ''
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 5)
const MIN_SUBMIT_SECONDS = Number(process.env.MIN_SUBMIT_SECONDS || 3)
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || ''

if (!MONGODB_USER || !MONGODB_PASSWORD) {
  console.error('MONGODB_USER and MONGODB_PASSWORD are required')
  process.exit(1)
}

const MONGODB_URI = `mongodb://${encodeURIComponent(MONGODB_USER)}:${encodeURIComponent(MONGODB_PASSWORD)}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB}?authSource=admin`

const app = express()
app.use(express.json({ limit: '128kb' }))

const client = new MongoClient(MONGODB_URI)
let collection = null

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ipRateMap = new Map()

function sanitize(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen)
}

function getClientIp(req) {
  const forwarded = sanitize(req.headers['x-forwarded-for'], 200)
  if (forwarded) {
    return sanitize(forwarded.split(',')[0], 120)
  }
  return sanitize(req.socket.remoteAddress || '', 120)
}

function checkRateLimit(ip) {
  const now = Date.now()
  const existing = ipRateMap.get(ip)

  if (!existing || now > existing.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetInMs: RATE_LIMIT_WINDOW_MS }
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetInMs: existing.resetAt - now }
  }

  existing.count += 1
  ipRateMap.set(ip, existing)
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - existing.count, resetInMs: existing.resetAt - now }
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, state] of ipRateMap.entries()) {
    if (now > state.resetAt) {
      ipRateMap.delete(ip)
    }
  }
}, 60 * 1000)

async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET_KEY) {
    return true
  }

  if (!token) {
    return false
  }

  try {
    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    })

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!resp.ok) {
      return false
    }

    const payload = await resp.json()
    return Boolean(payload.success)
  } catch {
    return false
  }
}

function requireAdminAuth(req, res, next) {
  if (!ADMIN_API_TOKEN) {
    return res.status(503).json({ detail: 'Admin endpoint is not configured.' })
  }

  const auth = sanitize(req.headers.authorization || '', 300)
  const expected = `Bearer ${ADMIN_API_TOKEN}`

  if (auth !== expected) {
    return res.status(401).json({ detail: 'Unauthorized' })
  }

  return next()
}

app.get('/health', (_req, res) => {
  const healthy = Boolean(collection)
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'starting' })
})

app.post('/messages', async (req, res) => {
  if (!collection) {
    return res.status(503).json({ detail: 'Service not ready yet.' })
  }

  const ip = getClientIp(req)
  const rate = checkRateLimit(ip)
  if (!rate.allowed) {
    return res.status(429).json({ detail: 'Too many requests. Please try again later.' })
  }

  const name = sanitize(req.body?.name, 80)
  const email = sanitize(req.body?.email, 160).toLowerCase()
  const message = sanitize(req.body?.message, 2000)
  const website = sanitize(req.body?.website, 200)
  const startedAt = Number(req.body?.startedAt || 0)
  const turnstileToken = sanitize(req.body?.turnstileToken, 2000)

  if (website) {
    return res.status(400).json({ detail: 'Invalid submission.' })
  }

  const submittedTooFast = !Number.isFinite(startedAt) || (Date.now() - startedAt) < (MIN_SUBMIT_SECONDS * 1000)
  if (submittedTooFast) {
    return res.status(400).json({ detail: 'Form submitted too quickly.' })
  }

  const turnstileOk = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileOk) {
    return res.status(400).json({ detail: 'Captcha verification failed.' })
  }

  if (!name || !email || !message) {
    return res.status(400).json({ detail: 'name, email, and message are required.' })
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ detail: 'Please provide a valid email address.' })
  }

  try {
    await collection.insertOne({
      name,
      email,
      message,
      createdAt: new Date(),
      source: 'portfolio',
      ip,
      userAgent: sanitize(req.headers['user-agent'] || '', 220),
    })
    return res.status(201).json({ ok: true })
  } catch (err) {
    console.error('Failed to persist message:', err)
    return res.status(500).json({ detail: 'Could not save message right now.' })
  }
})

app.get('/admin/messages', requireAdminAuth, async (req, res) => {
  if (!collection) {
    return res.status(503).json({ detail: 'Service not ready yet.' })
  }

  const limitRaw = Number(req.query.limit || 50)
  const limit = Math.min(Math.max(limitRaw, 1), 200)

  try {
    const messages = await collection
      .find({}, { projection: { _id: 1, name: 1, email: 1, message: 1, createdAt: 1, source: 1, ip: 1 } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    return res.json({ items: messages })
  } catch (err) {
    console.error('Failed to fetch admin messages:', err)
    return res.status(500).json({ detail: 'Could not load messages.' })
  }
})

app.delete('/admin/messages/:id', requireAdminAuth, async (req, res) => {
  if (!collection) {
    return res.status(503).json({ detail: 'Service not ready yet.' })
  }

  let objectId
  try {
    objectId = new ObjectId(req.params.id)
  } catch {
    return res.status(400).json({ detail: 'Invalid message id.' })
  }

  try {
    const result = await collection.deleteOne({ _id: objectId })
    if (!result.deletedCount) {
      return res.status(404).json({ detail: 'Message not found.' })
    }
    return res.json({ ok: true })
  } catch (err) {
    console.error('Failed to delete admin message:', err)
    return res.status(500).json({ detail: 'Could not delete message.' })
  }
})

async function start() {
  try {
    await client.connect()
    collection = client.db(MONGODB_DB).collection(MONGODB_COLLECTION)

    await collection.createIndex({ createdAt: -1 })
    await collection.createIndex({ email: 1 })

    app.listen(PORT, () => {
      console.log(`Contact API listening on :${PORT}`)
    })
  } catch (err) {
    console.error('Startup failed:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  await client.close().catch(() => {})
  process.exit(0)
})

start()
