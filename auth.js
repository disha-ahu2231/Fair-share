const express        = require('express');
const router         = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/signup   – Create a new account
router.post('/signup', authController.signup);

// POST /api/login    – Sign in and receive JWT
router.post('/login', authController.login);

// GET  /api/user     – Get authenticated user's profile (protected)
router.get('/user', authMiddleware, authController.getUser);

module.exports = router;
