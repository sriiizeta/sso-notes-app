require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const passport = require('passport')                        // must import passport
const GoogleStrategy = require('passport-google-oauth20').Strategy
const cors = require('cors')

const User = require('./models/User')
const Note = require('./models/Note')

const app = express()
app.use(express.json())

// Allow frontend origin and send credentials
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000', credentials: true }))

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error', err))

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    secure: false,
    sameSite: 'lax'
  }
}))

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

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id })
    if (!user) {
      user = await User.create({ googleId: profile.id, displayName: profile.displayName, email: profile.emails?.[0]?.value })
    }
    return done(null, user)
  } catch (err) {
    return done(err)
  }
}))

// -- Routes --
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: process.env.FRONTEND_ORIGIN + '/?error=auth' }), (req, res) => {
  res.redirect(process.env.FRONTEND_ORIGIN + '/notes')
})

app.get('/auth/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) return next(err)
    res.redirect(process.env.FRONTEND_ORIGIN)
  })
})

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next()
  res.status(401).json({ error: 'Not authenticated' })
}

app.get('/api/notes', ensureAuth, async (req, res) => {
  const notes = await Note.find({ user: req.user._id }).sort({ createdAt: -1 })
  res.json(notes)
})

app.post('/api/notes', ensureAuth, async (req, res) => {
  const { text } = req.body
  if (!text || !text.trim()) return res.status(400).json({ error: 'Empty note' })
  const n = await Note.create({ user: req.user._id, text: text.trim() })
  res.json(n)
})

app.delete('/api/notes/:id', ensureAuth, async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!note) return res.status(404).json({ error: 'Not found' })
  res.json({ success: true })
})

if(process.env.NODE_ENV!=="production"){
  const PORT = process.env.PORT || 3050;
  app.listen(PORT, () => console.log('Backend listening on port', PORT));
}
export default server;
