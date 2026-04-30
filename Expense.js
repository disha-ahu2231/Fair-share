const mongoose = require('mongoose');

const SplitSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:   { type: String, required: true },
  amount: { type: Number, required: true },
  paid:   { type: Boolean, default: false },
}, { _id: false });

const ExpenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [120, 'Description cannot exceed 120 characters'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  category: {
    type: String,
    enum: ['Food', 'Transport', 'Stay', 'Bills', 'Entertainment', 'Shopping', 'Other'],
    default: 'Other',
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'percentage'],
    default: 'equal',
  },
  splits: [SplitSchema],
  date: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Index for fast lookups per group
ExpenseSchema.index({ group: 1, date: -1 });
ExpenseSchema.index({ paidBy: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
