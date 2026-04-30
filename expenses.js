const express     = require('express');
const router      = express.Router();
const auth        = require('../middleware/authMiddleware');
const expenseCtrl = require('../controllers/expenseController');
const settlCtrl   = require('../controllers/settlementController');

router.use(auth);

// All expenses across the user's groups
router.get('/',         expenseCtrl.getAllExpenses);

// Edit / delete a single expense by ID
router.put('/:id',      expenseCtrl.updateExpense);
router.delete('/:id',   expenseCtrl.deleteExpense);

// All settlements across the user's groups
router.get('/settlements', settlCtrl.getAllSettlements);

module.exports = router;
