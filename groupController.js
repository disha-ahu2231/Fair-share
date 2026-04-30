const Group   = require('../models/Group');
const Expense = require('../models/Expense');

// ─── GET /api/groups ──────────────────────────────────────────────────────────
// Returns all groups the authenticated user belongs to
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.user._id })
      .populate('members.user', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1 });

    // Attach expense totals for each group
    const groupsWithTotals = await Promise.all(
      groups.map(async (g) => {
        const total = await Expense.aggregate([
          { $match: { group: g._id } },
          { $group: { _id: null, sum: { $sum: '$amount' } } },
        ]);
        return {
          ...g.toObject(),
          totalExpenses: total[0]?.sum || 0,
        };
      })
    );

    res.json({ success: true, groups: groupsWithTotals });
  } catch (err) {
    console.error('getGroups error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching groups.' });
  }
};

// ─── GET /api/groups/:id ──────────────────────────────────────────────────────
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName');

    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    // Check membership
    const isMember = group.members.some((m) => m.user._id.equals(req.user._id));
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied.' });

    res.json({ success: true, group });
  } catch (err) {
    console.error('getGroup error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching group.' });
  }
};

// ─── POST /api/groups ─────────────────────────────────────────────────────────
exports.createGroup = async (req, res) => {
  try {
    const { name, emoji, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    const group = await Group.create({
      name:        name.trim(),
      emoji:       emoji || '👥',
      description: description || '',
      createdBy:   req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });

    await group.populate('members.user', 'firstName lastName email avatar');

    res.status(201).json({ success: true, message: 'Group created.', group });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join('. ');
      return res.status(400).json({ success: false, message: msg });
    }
    console.error('createGroup error:', err);
    res.status(500).json({ success: false, message: 'Server error creating group.' });
  }
};

// ─── PUT /api/groups/:id ──────────────────────────────────────────────────────
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isAdmin = group.members.some(
      (m) => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admins can edit the group.' });

    const { name, emoji, description, status } = req.body;
    if (name)        group.name        = name.trim();
    if (emoji)       group.emoji       = emoji;
    if (description !== undefined) group.description = description;
    if (status)      group.status      = status;

    await group.save();
    await group.populate('members.user', 'firstName lastName email avatar');

    res.json({ success: true, message: 'Group updated.', group });
  } catch (err) {
    console.error('updateGroup error:', err);
    res.status(500).json({ success: false, message: 'Server error updating group.' });
  }
};

// ─── DELETE /api/groups/:id ───────────────────────────────────────────────────
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isAdmin = group.members.some(
      (m) => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admins can delete the group.' });

    // Remove all expenses for this group too
    await Expense.deleteMany({ group: group._id });
    await group.deleteOne();

    res.json({ success: true, message: 'Group and its expenses deleted.' });
  } catch (err) {
    console.error('deleteGroup error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting group.' });
  }
};

// ─── POST /api/groups/:id/members ─────────────────────────────────────────────
// Add a member by email
exports.addMember = async (req, res) => {
  try {
    const User  = require('../models/User');
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isAdmin = group.members.some(
      (m) => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admins can add members.' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const newUser = await User.findOne({ email: email.toLowerCase() });
    if (!newUser) return res.status(404).json({ success: false, message: 'No account found with that email.' });

    const alreadyMember = group.members.some((m) => m.user.equals(newUser._id));
    if (alreadyMember) return res.status(409).json({ success: false, message: 'User is already in this group.' });

    group.members.push({ user: newUser._id, role: 'member' });
    await group.save();
    await group.populate('members.user', 'firstName lastName email avatar');

    res.json({ success: true, message: `${newUser.firstName} added to the group.`, group });
  } catch (err) {
    console.error('addMember error:', err);
    res.status(500).json({ success: false, message: 'Server error adding member.' });
  }
};

// ─── DELETE /api/groups/:id/members/:userId ────────────────────────────────────
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    const isAdmin = group.members.some(
      (m) => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admins can remove members.' });

    group.members = group.members.filter((m) => !m.user.equals(req.params.userId));
    await group.save();

    res.json({ success: true, message: 'Member removed.', group });
  } catch (err) {
    console.error('removeMember error:', err);
    res.status(500).json({ success: false, message: 'Server error removing member.' });
  }
};
