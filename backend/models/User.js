const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true },
    displayName: String,
    email: String
  },
  { timestamps: true }
)

module.exports = mongoose.model('User', userSchema)