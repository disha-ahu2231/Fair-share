const Expense = require('../models/Expense');
const Group   = require('../models/Group');

// ─── Helper: compute equal splits ────────────────────────────────────────────
function buildEqualSplits(members, amount) {
  const perPerson = +(amount / members.length).toFixed(2);
  return members.map((m) => ({
    user:   m.user._id || m.user,
    name:   m.user.firstName ? `${m.user.firstName} ${m.user.lastName}` : String(m.user),
    amount: perPerson,
    paid:   false,
  }));
}

// ─── GET /api/groups/:groupId/expenses ────────────────────────────────────────
exports.getExpenses = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isMember = group.members.some((m) => m.user.equals(req.user._id));
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'firstName lastName avatar')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 });

    res.json({ success: true, expenses });
  } catch (err) {
    console.error('getExpenses error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching expenses.' });
  }
};

// ─── GET /api/expenses  (all expenses for the user across groups) ─────────────
exports.getAllExpenses = async (req, res) => {
  try {
    // Find all groups the user is in
    const groups = await Group.find({ 'members.user': req.user._id }).select('_id');
    const groupIds = groups.map((g) => g._id);

    const expenses = await Expense.find({ group: { $in: groupIds } })
      .populate('paidBy', 'firstName lastName avatar')
      .populate('group', 'name emoji')
      .sort({ date: -1 })
      .limit(100);

    res.json({ success: true, expenses });
  } catch (err) {
    console.error('getAllExpenses error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching expenses.' });
  }
};

// ─── POST /api/groups/:groupId/expenses ───────────────────────────────────────
exports.createExpense = async (req, res) => {
  try {
    const { description, amount, category, splitType, splits, date, notes } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ success: false, message: 'Description and amount are required.' });
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const group = await Group.findById(req.params.groupId)
      .populate('members.user', 'firstName lastName');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isMember = group.members.some((m) => m.user._id.equals(req.user._id));
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    // Build splits
    let computedSplits;
    if (splitType === 'equal' || !splitType) {
      computedSplits = buildEqualSplits(group.members, Number(amount));
    } else {
      // Use provided splits as-is (exact or percentage)
      computedSplits = splits || buildEqualSplits(group.members, Number(amount));
    }

    const expense = await Expense.create({
      description: description.trim(),
      amount:      Number(amount),
      category:    category || 'Other',
      group:       req.params.groupId,
      paidBy:      req.user._id,
      splitType:   splitType || 'equal',
      splits:      computedSplits,
      date:        date ? new Date(date) : new Date(),
      notes:       notes || '',
      createdBy:   req.user._id,
    });

    // Update group status to active if it was settled
    if (group.status === 'settled') {
      group.status = 'active';
      await group.save();
    }

    await expense.populate('paidBy', 'firstName lastName avatar');

    res.status(201).json({ success: true, message: 'Expense added.', expense });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join('. ');
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('createExpense error:', err);
    res.status(500).json({ success: false, message: 'Server error creating expense.' });
  }
};

// ─── PUT /api/expenses/:id ────────────────────────────────────────────────────
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    if (!expense.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the creator can edit this expense.' });
    }

    const { description, amount, category, notes, date } = req.body;
    if (description) expense.description = description.trim();
    if (amount)      expense.amount      = Number(amount);
    if (category)    expense.category    = category;
    if (notes !== undefined) expense.notes = notes;
    if (date)        expense.date        = new Date(date);

    await expense.save();
    await expense.populate('paidBy', 'firstName lastName avatar');

    res.json({ success: true, message: 'Expense updated.', expense });
  } catch (err) {
    console.error('updateExpense error:', err);
    res.status(500).json({ success: false, message: 'Server error updating expense.' });
  }
};

// ─── DELETE /api/expenses/:id ─────────────────────────────────────────────────
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found.' });

    if (!expense.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the creator can delete this expense.' });
    }

    await expense.deleteOne();
    res.json({ success: true, message: 'Expense deleted.' });
  } catch (err) {
    console.error('deleteExpense error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting expense.' });
  }
};

// ─── GET /api/groups/:groupId/balances ────────────────────────────────────────
// Returns a simplified debt graph: who owes whom how much
exports.getBalances = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members.user', 'firstName lastName avatar email');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isMember = group.members.some((m) => m.user._id.equals(req.user._id));
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const expenses = await Expense.find({ group: req.params.groupId })
      .populate('paidBy', 'firstName lastName');

    // Net balance map: userId → net amount (positive = owed money, negative = owes money)
    const balanceMap = {};
    group.members.forEach((m) => {
      balanceMap[m.user._id.toString()] = {
        user: m.user,
        net:  0,
      };
    });

    expenses.forEach((exp) => {
      const payerId = exp.paidBy._id.toString();
      if (balanceMap[payerId] !== undefined) {
        balanceMap[payerId].net += exp.amount;
      }
      exp.splits.forEach((split) => {
        const uid = split.user.toString();
        if (balanceMap[uid] !== undefined) {
          balanceMap[uid].net -= split.amount;
        }
      });
    });

    const balances = Object.values(balanceMap);
    res.json({ success: true, balances });
  } catch (err) {
    console.error('getBalances error:', err);
    res.status(500).json({ success: false, message: 'Server error computing balances.' });
  }
};
