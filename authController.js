const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Helper: sign a JWT ───────────────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Helper: build safe user object (no password) ────────────────────────────
const safeUser = (user) => ({
  id:        user._id,
  firstName: user.firstName,
  lastName:  user.lastName,
  email:     user.email,
  avatar:    user.avatar,
  createdAt: user.createdAt,
});

// ─── POST /api/signup ─────────────────────────────────────────────────────────
// Body: { firstName, lastName, email, password }
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Basic field validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields (firstName, lastName, email, password) are required.',
      });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please sign in.',
      });
    }

    // Create user (password hashed by the model's pre-save hook)
    const user  = await User.create({ firstName, lastName, email, password });
    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── POST /api/login ──────────────────────────────────────────────────────────
// Body: { email, password }
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Explicitly select password (it's excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── GET /api/user ────────────────────────────────────────────────────────────
// Protected – requires valid JWT in Authorization header
exports.getUser = async (req, res) => {
  try {
    // req.user is set by the authMiddleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};
