// backend/models/Note.js
const mongoose = require('mongoose')
const Schema = mongoose.Schema

const NoteSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true }
  },
  { timestamps: true }
)

module.exports = mongoose.models?.Note || mongoose.model('Note', NoteSchema)
