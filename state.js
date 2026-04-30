// ─── CENTRAL DATA/STATE LAYER ───
const AppState = {
  user: null,
  groups: [
    { id: 'goa',    name: "Goa Trip '24",        emoji: '🏖️', members: 5, total: 32400, balance: -900,  status: 'active',  role: 'Admin',  created: 'you',   dateRange: 'Sept 12 – 16, 2024' },
    { id: 'apt',    name: 'Apartment 4B',         emoji: '🏠', members: 3, total: 18200, balance: 2100,  status: 'active',  role: 'Member', created: 'Rahul', dateRange: 'Monthly bills' },
    { id: 'office', name: 'Office Lunch Circle',  emoji: '🍽️', members: 8, total:  9650, balance:    0,  status: 'settled', role: 'Member', created: 'Sneha', dateRange: 'Recurring' },
    { id: 'movie',  name: 'Movie Night Squad',    emoji: '🎬', members: 4, total:  3400, balance: -850,  status: 'pending', role: 'Member', created: 'Vikram', dateRange: '' }
  ],
  expenses: [
    { desc: 'Dinner at Hakkasan',   group: '🏖️ Goa Trip', cat: '🍽️ Food',      catColor: 'orange', paidBy: 'Priya',  split: 'Equal', yourShare:  -620, date: 'Oct 15',  total:  3100 },
    { desc: 'October Rent',         group: '🏠 Apt 4B',   cat: '🏠 Bills',      catColor: 'accent', paidBy: 'You',    split: 'Equal', yourShare:  2100, date: 'Oct 1',   total:  6300 },
    { desc: 'Petrol – Road Trip',   group: '🏖️ Goa Trip', cat: '⛽ Transport',  catColor: 'red',    paidBy: 'Vikram', split: 'Equal', yourShare:  -430, date: 'Sept 27', total:  2150 },
    { desc: 'Movie Tickets – Jigra',group: '🎬 Movies',   cat: '🎬 Entertain',  catColor: 'green',  paidBy: 'You',    split: 'Equal', yourShare:   850, date: 'Sept 25', total:  3400 },
    { desc: 'Office Lunch Order',   group: '🍽️ Office',   cat: '🍱 Food',       catColor: 'orange', paidBy: 'Sneha',  split: '%',     yourShare:   320, date: 'Sept 24', total:  1600 },
    { desc: 'Hotel – 4 nights',     group: '🏖️ Goa Trip', cat: '🏨 Stay',       catColor: 'accent', paidBy: 'Priya',  split: 'Equal', yourShare: -2400, date: 'Sept 12', total: 12000 }
  ],
  weeklyData: [
    { v: 3200, label: '₹3.2k' },
    { v: 5800, label: '₹5.8k' },
    { v: 4200, label: '₹4.2k' },
    { v: 5250, label: '₹5.3k' }
  ],
  monthlyData: {
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'],
    values: [4200, 6800, 5100, 7300, 8900, 6200, 7800, 11200, 32400, 18450]
  }
};
