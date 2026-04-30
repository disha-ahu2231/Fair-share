const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [60, 'Group name cannot exceed 60 characters'],
  },
  emoji: {
    type: String,
    default: '👥',
    maxlength: [8, 'Emoji too long'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [300, 'Description cannot exceed 300 characters'],
  },
  members: {
    type: [MemberSchema],
    validate: {
      validator: (arr) => arr.length >= 1,
      message: 'A group must have at least one member',
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'settled', 'archived'],
    default: 'active',
  },
}, { timestamps: true });

GroupSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Group', GroupSchema);
