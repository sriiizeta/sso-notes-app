// backend/models/User.js
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema(
  {
    googleId: { type: String, index: true },
    displayName: String,
    email: String
  },
  { timestamps: true }
)

module.exports = mongoose.models?.User || mongoose.model('User', UserSchema)
