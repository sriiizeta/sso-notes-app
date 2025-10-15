require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const cors = require('cors')

const User = require('./models/User')
const Note = require('./models/Note')

const app = express()
app.use(express.json())

// ---------------- ENV ----------------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN // e.g., https://your-frontend.vercel.app
const MONGO_URI = process.env.MONGO_URI
const SESSION_SECRET = process.env.SESSION_SECRET
const isProd = process.env.NODE_ENV === 'production'

// ---------------- CORS ----------------
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
  })
)

// ---------------- Mongoose ----------------
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

// ---------------- Sessions ----------------
app.use(
  session({
    secret: SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: true, // MUST be true for HTTPS
      sameSite: 'none', // allows cross-site cookies
      httpOnly: true
    }
  })
)

// ---------------- Passport ----------------
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => done(null, user._id))
passport.deserializeUser(async (id, done) => {
  try {
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
        let user = await User.findOne({ googleId: profile.id })
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails?.[0]?.value
          })
        }
        done(null, user)
      } catch (err) {
        done(err)
      }
    }
  )
)

// ---------------- ROUTES ----------------
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Backend running' }))

// Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: FRONTEND_ORIGIN + '/?error=auth', session: true }),
  (req, res) => {
    // Successful login → redirect to frontend notes page
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

// Middleware: check authentication
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next()
  res.status(401).json({ error: 'Not authenticated' })
}

// Notes API
app.get('/api/notes', ensureAuth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json(notes)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/notes', ensureAuth, async (req, res) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) return res.status(400).json({ error: 'Empty note' })
    const note = await Note.create({ user: req.user._id, text: text.trim() })
    res.json(note)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/notes/:id', ensureAuth, async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id })
    if (!note) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3050
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))