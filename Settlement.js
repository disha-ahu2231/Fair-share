const mongoose = require('mongoose');

const SettlementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Settlement amount must be greater than 0'],
  },
  note: {
    type: String,
    default: '',
    maxlength: [200, 'Note cannot exceed 200 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'completed',
  },
  settledAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

SettlementSchema.index({ group: 1, settledAt: -1 });

module.exports = mongoose.model('Settlement', SettlementSchema);
