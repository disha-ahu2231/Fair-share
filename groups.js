const express     = require('express');
const router      = express.Router();
const auth        = require('../middleware/authMiddleware');
const groupCtrl   = require('../controllers/groupController');
const expenseCtrl = require('../controllers/expenseController');
const settlCtrl   = require('../controllers/settlementController');

// All routes require authentication
router.use(auth);

// Groups CRUD
router.get('/',           groupCtrl.getGroups);
router.post('/',          groupCtrl.createGroup);
router.get('/:id',        groupCtrl.getGroup);
router.put('/:id',        groupCtrl.updateGroup);
router.delete('/:id',     groupCtrl.deleteGroup);

// Member management
router.post('/:id/members',               groupCtrl.addMember);
router.delete('/:id/members/:userId',     groupCtrl.removeMember);

// Expenses within a group
router.get('/:groupId/expenses',          expenseCtrl.getExpenses);
router.post('/:groupId/expenses',         expenseCtrl.createExpense);

// Balances for a group
router.get('/:groupId/balances',          expenseCtrl.getBalances);

// Settlements within a group
router.get('/:groupId/settlements',       settlCtrl.getSettlements);
router.post('/:groupId/settlements',      settlCtrl.createSettlement);

module.exports = router;
