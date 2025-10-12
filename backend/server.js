// backend/index.js
require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const cors = require('cors')
const serverless = require('serverless-http') // for Vercel serverless

const User = require('./models/User')
const Note = require('./models/Note')

const app = express()
app.use(express.json())

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000'
const MONGO_URI = process.env.MONGO_URI || ''
const isProd = process.env.NODE_ENV === 'production'

// CORS: allow frontend to send cookies
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
  })
)

// ---------- serverless-friendly mongoose connection caching ----------
if (!MONGO_URI) console.warn('Warning: MONGO_URI is not set in env')

let cachedPromise = global.__mongoClientPromise
async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    // already connected
    return
  }
  if (!cachedPromise) {
    cachedPromise = mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    global.__mongoClientPromise = cachedPromise
  }
  await cachedPromise
}
// ------------------------------------------------------------------

// Trust proxy if behind Vercel / proxies
if (isProd) {
  app.set('trust proxy', 1)
  console.log('Running in production mode; trust proxy enabled')
}

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: isProd, // true in production (HTTPS)
      sameSite: isProd ? 'none' : 'lax',
      httpOnly: true
    }
  })
)

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => done(null, user._id))
passport.deserializeUser(async (id, done) => {
  try {
    await connectToDatabase()
    const user = await User.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        await connectToDatabase()
        let user = await User.findOne({ googleId: profile.id })
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value
          })
        }
        return done(null, user)
      } catch (err) {
        return done(err)
      }
    }
  )
)

// -- Routes --
// Root (useful debug)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    env: isProd ? 'production' : 'development',
    message: 'Backend service running'
  })
})

// Health check (useful)
app.get('/_health', (req, res) =>
  res.json({
    status: 'ok',
    time: new Date().toISOString()
  })
)

// Start Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

// Google callback
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: FRONTEND_ORIGIN + '/?error=auth', session: true }),
  (req, res) => {
    // success — redirect to frontend notes page
    res.redirect(FRONTEND_ORIGIN + '/notes')
  }
)

// Logout
app.get('/auth/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err)
    res.redirect(FRONTEND_ORIGIN)
  })
})

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next()
  res.status(401).json({ error: 'Not authenticated' })
}

// Notes endpoints (call connectToDatabase before DB ops)
app.get('/api/notes', ensureAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const notes = await Note.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(notes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/notes', ensureAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const { text } = req.body
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty note' })
    const n = await Note.create({ user: req.user._id, text: text.trim() })
    res.json(n)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/notes/:id', ensureAuth, async (req, res) => {
  try {
    await connectToDatabase()
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!note) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Local dev: listen (kept for running locally)
if (!isProd) {
  const PORT = process.env.PORT || 3050
  app.listen(PORT, () => console.log('Backend listening on port', PORT))
}

// Export serverless handler for Vercel
module.exports = serverless(app)
