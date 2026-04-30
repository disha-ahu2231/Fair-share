const Settlement = require('../models/Settlement');
const Group      = require('../models/Group');

// ─── GET /api/groups/:groupId/settlements ─────────────────────────────────────
exports.getSettlements = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isMember = group.members.some((m) => m.user.equals(req.user._id));
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const settlements = await Settlement.find({ group: req.params.groupId })
      .populate('from', 'firstName lastName avatar')
      .populate('to',   'firstName lastName avatar')
      .sort({ settledAt: -1 });

    res.json({ success: true, settlements });
  } catch (err) {
    console.error('getSettlements error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching settlements.' });
  }
};

// ─── POST /api/groups/:groupId/settlements ────────────────────────────────────
exports.createSettlement = async (req, res) => {
  try {
    const { toUserId, amount, note } = req.body;

    if (!toUserId || !amount) {
      return res.status(400).json({ success: false, message: 'toUserId and amount are required.' });
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }
    if (req.user._id.equals(toUserId)) {
      return res.status(400).json({ success: false, message: 'Cannot settle with yourself.' });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isMember = group.members.some((m) => m.user.equals(req.user._id));
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    const settlement = await Settlement.create({
      group:     req.params.groupId,
      from:      req.user._id,
      to:        toUserId,
      amount:    Number(amount),
      note:      note || '',
      status:    'completed',
      createdBy: req.user._id,
    });

    await settlement.populate('from', 'firstName lastName avatar');
    await settlement.populate('to',   'firstName lastName avatar');

    res.status(201).json({ success: true, message: 'Settlement recorded.', settlement });
  } catch (err) {
    console.error('createSettlement error:', err);
    res.status(500).json({ success: false, message: 'Server error creating settlement.' });
  }
};

// ─── GET /api/settlements (all settlements for user) ─────────────────────────
exports.getAllSettlements = async (req, res) => {
  try {
    const settlements = await Settlement.find({
      $or: [{ from: req.user._id }, { to: req.user._id }],
    })
      .populate('from', 'firstName lastName avatar')
      .populate('to',   'firstName lastName avatar')
      .populate('group', 'name emoji')
      .sort({ settledAt: -1 })
      .limit(50);

    res.json({ success: true, settlements });
  } catch (err) {
    console.error('getAllSettlements error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching settlements.' });
  }
};
