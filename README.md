# FairShare Backend — Setup & API Reference

## What was added

The backend now covers the full app surface area:

| Area | What's new |
|---|---|
| **Auth** | Login, signup, JWT session restore (was already there) |
| **Groups** | Create, read, update, delete groups; add/remove members by email |
| **Expenses** | Add expenses to a group with auto equal-split; edit & delete |
| **Balances** | Per-group net balance calculation (who owes whom) |
| **Settlements** | Record payments between members; view history |
| **Frontend sync** | `api-bridge.js` pulls real data into `AppState` and re-renders the dashboard |

---

## Quick start

### 1. Prerequisites

- **Node.js** v18+
- **MongoDB** — either local (`mongodb://localhost:27017`) or a free [Atlas](https://mongodb.com/atlas) cluster

### 2. Install dependencies

```bash
cd server
npm install
```

### 3. Configure environment

```bash
npm run setup        # creates server/.env from the template
```

Then open `server/.env` and set:

```env
MONGO_URI=mongodb://localhost:27017/fairshare   # or your Atlas URI
JWT_SECRET=some_long_random_string_here
PORT=5000
FRONTEND_URL=http://localhost:8000
```

### 4. Start the server

```bash
npm run dev          # development (auto-restarts on changes)
npm start            # production
```

You should see:
```
✅ MongoDB connected: localhost
🚀 FairShare server running on http://localhost:5000
```

### 5. Serve the frontend

From the project root (where `index.html` lives):
```bash
python3 -m http.server 8000
# or:  npx serve .
```

Open `http://localhost:8000` — the app will connect to the backend automatically.

---

## API Reference

All routes require `Authorization: Bearer <token>` except `/login` and `/signup`.

### Auth

| Method | Route | Body | Description |
|---|---|---|---|
| POST | `/api/signup` | `{ firstName, lastName, email, password }` | Create account |
| POST | `/api/login` | `{ email, password }` | Sign in, returns JWT |
| GET | `/api/user` | — | Get current user profile |

### Groups

| Method | Route | Body | Description |
|---|---|---|---|
| GET | `/api/groups` | — | All groups for the user |
| POST | `/api/groups` | `{ name, emoji?, description? }` | Create a group |
| GET | `/api/groups/:id` | — | Single group details |
| PUT | `/api/groups/:id` | `{ name?, emoji?, status? }` | Update group (admin only) |
| DELETE | `/api/groups/:id` | — | Delete group + all its expenses (admin only) |
| POST | `/api/groups/:id/members` | `{ email }` | Add member by email |
| DELETE | `/api/groups/:id/members/:userId` | — | Remove a member (admin only) |

### Expenses

| Method | Route | Body | Description |
|---|---|---|---|
| GET | `/api/expenses` | — | All expenses across user's groups |
| GET | `/api/groups/:id/expenses` | — | Expenses for one group |
| POST | `/api/groups/:id/expenses` | `{ description, amount, category?, notes?, date?, splitType? }` | Add expense (auto equal-split) |
| PUT | `/api/expenses/:id` | `{ description?, amount?, category?, notes? }` | Edit (creator only) |
| DELETE | `/api/expenses/:id` | — | Delete (creator only) |

**Categories:** `Food` · `Transport` · `Stay` · `Bills` · `Entertainment` · `Shopping` · `Other`

**Split types:** `equal` (default) · `exact` · `percentage`

### Balances

| Method | Route | Description |
|---|---|---|
| GET | `/api/groups/:id/balances` | Net balance for each member in the group |

Response shape:
```json
{
  "balances": [
    { "user": { "firstName": "Arjun", ... }, "net": 1500 },
    { "user": { "firstName": "Priya", ... }, "net": -1500 }
  ]
}
```
Positive `net` = the person is owed money. Negative = they owe money.

### Settlements

| Method | Route | Body | Description |
|---|---|---|---|
| GET | `/api/groups/:id/settlements` | — | Settlement history for a group |
| POST | `/api/groups/:id/settlements` | `{ toUserId, amount, note? }` | Record a payment |
| GET | `/api/expenses/settlements` | — | All settlements across user's groups |

---

## Frontend integration (`js/api-bridge.js`)

The updated bridge:

1. **On login/signup** — saves JWT, then calls `syncStateFromBackend()` which fetches real groups + expenses and populates `AppState`.
2. **On page load** — if a JWT exists, verifies it against `/api/user`, then syncs state.
3. **`window.FairShareAPI`** — a globally available object you can use from any JS file:

```javascript
// Create a group
const group = await FairShareAPI.createGroup('Goa Trip 2025', '🏖️');

// Add an expense
await FairShareAPI.createExpense(group._id, {
  description: 'Hotel Panjim',
  amount: 12000,
  category: 'Stay',
  splitType: 'equal',
});

// Check who owes what
const balances = await FairShareAPI.getBalances(group._id);

// Settle up
await FairShareAPI.createSettlement(group._id, friendUserId, 4000, 'Paid via UPI');
```

4. **Offline fallback** — if the server is unreachable, the app falls back silently to `AppState` (the demo data in `state.js`), so it always works.

---

## File structure

```
server/
├── index.js                   ← Express app entry, registers all routes
├── package.json
├── .env.example               ← Copy to .env and fill in your values
├── config/
│   └── db.js                  ← MongoDB connection
├── middleware/
│   └── authMiddleware.js      ← JWT verification
├── models/
│   ├── User.js                ← User schema (bcrypt password hash)
│   ├── Group.js               ← Group + members schema
│   ├── Expense.js             ← Expense + splits schema
│   └── Settlement.js          ← Settlement record schema
├── controllers/
│   ├── authController.js      ← signup, login, getUser
│   ├── groupController.js     ← full group CRUD + member management
│   ├── expenseController.js   ← expense CRUD + balance computation
│   └── settlementController.js← settlement creation + history
└── routes/
    ├── auth.js
    ├── groups.js              ← group + expense + settlement routes
    └── expenses.js            ← cross-group expense + settlement routes
```
