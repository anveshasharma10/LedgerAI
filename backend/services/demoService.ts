/**
 * Dynamic Demo Data Generation Engine
 * Produces rich, realistic, multi-category and multi-month financial records.
 */

import { query } from '../config/db.js';

interface DemoOptions {
  clearExisting?: boolean;
}

export async function generateDynamicDemoData(userId: number, options: DemoOptions = {}): Promise<{
  expenseCount: number;
  incomeCount: number;
  budgetCount: number;
  totalExpenses: number;
  totalIncome: number;
}> {
  if (options.clearExisting) {
    await query('DELETE FROM expenses WHERE user_id = ?', [userId]);
    await query('DELETE FROM income WHERE user_id = ?', [userId]);
    await query('DELETE FROM budgets WHERE user_id = ?', [userId]);
    await query('DELETE FROM notifications WHERE user_id = ?', [userId]);
    await query('DELETE FROM ai_insights WHERE user_id = ?', [userId]);
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  // Helper to format YYYY-MM-DD
  const formatYMD = (year: number, month: number, day: number) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(Math.min(day, 28)).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  // Helper to get past month/year
  const getPastMonth = (offset: number) => {
    let m = currentMonth - offset;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    return { month: m, year: y, str: `${y}-${String(m).padStart(2, '0')}` };
  };

  const m0 = { month: currentMonth, year: currentYear };
  const m1 = getPastMonth(1);
  const m2 = getPastMonth(2);
  const m3 = getPastMonth(3);

  // --- 1. DYNAMIC INCOMES ---
  const incomeRecords = [
    // Current Month
    [userId, 68000, 'Salary', 'Senior Software Engineer Monthly Salary', formatYMD(m0.year, m0.month, 1)],
    [userId, 15500, 'Freelance', 'Fullstack Fintech Dashboard Consulting', formatYMD(m0.year, m0.month, 8)],
    [userId, 4800, 'Investment', 'Nifty 50 Index Fund Quarterly Dividend', formatYMD(m0.year, m0.month, 14)],
    [userId, 8500, 'Bonus', 'Q3 Engineering Innovation Award', formatYMD(m0.year, m0.month, 18)],

    // Month -1
    [userId, 68000, 'Salary', 'Senior Software Engineer Monthly Salary', formatYMD(m1.year, m1.month, 1)],
    [userId, 12000, 'Freelance', 'Mobile App Security Audit & Review', formatYMD(m1.year, m1.month, 11)],
    [userId, 3600, 'Investment', 'Fixed Deposit Interest Credit', formatYMD(m1.year, m1.month, 16)],

    // Month -2
    [userId, 65000, 'Salary', 'Senior Software Engineer Monthly Salary', formatYMD(m2.year, m2.month, 1)],
    [userId, 18000, 'Freelance', 'E-commerce API Integration Milestone', formatYMD(m2.year, m2.month, 9)],
    [userId, 5200, 'Investment', 'Tech Stock Portfolio Dividends', formatYMD(m2.year, m2.month, 20)],

    // Month -3
    [userId, 65000, 'Salary', 'Senior Software Engineer Monthly Salary', formatYMD(m3.year, m3.month, 1)],
    [userId, 14000, 'Freelance', 'React & Tailwind Component Library Build', formatYMD(m3.year, m3.month, 12)],
  ];

  for (const inc of incomeRecords) {
    await query(
      'INSERT INTO income (user_id, amount, source, description, income_date) VALUES (?, ?, ?, ?, ?)',
      inc
    );
  }

  // --- 2. DIVERSE, DYNAMIC EXPENSES (BEYOND JUST RENT) ---
  const expenseRecords = [
    // === CURRENT MONTH (Rich variety of daily and weekly spends) ===
    // Rent
    [userId, 18000, 'Rent', 'Apartment Rent - Palm Heights #402', formatYMD(m0.year, m0.month, 2), 'Bank Transfer', 'Monthly residential lease'],

    // Food & Dining
    [userId, 4650, 'Food', 'Organic Supermarket & Whole Foods Grocery', formatYMD(m0.year, m0.month, 3), 'Debit Card', 'Monthly essential pantry, olive oil & dairy'],
    [userId, 820, 'Food', 'Blue Tokai Artisanal Coffee & Croissants', formatYMD(m0.year, m0.month, 5), 'UPI', 'Weekend morning work session'],
    [userId, 1450, 'Food', 'Swiggy Gourmet Dinner Delivery', formatYMD(m0.year, m0.month, 7), 'UPI', 'Friday night Thai curries'],
    [userId, 1850, 'Food', 'Fresh Farmers Market Produce & Exotic Berries', formatYMD(m0.year, m0.month, 10), 'Cash', 'Weekly fresh greens'],
    [userId, 3400, 'Food', 'Italian Trattoria Dinner with Colleagues', formatYMD(m0.year, m0.month, 12), 'Credit Card', 'Woodfired pizza and appetizers'],
    [userId, 650, 'Food', 'Chipotle Burrito Bowl & Kombucha', formatYMD(m0.year, m0.month, 15), 'Debit Card', 'Quick healthy lunch'],

    // Shopping & Tech Gear
    [userId, 6800, 'Shopping', 'Keychron K2 Pro Mechanical Wireless Keyboard', formatYMD(m0.year, m0.month, 4), 'Credit Card', 'Hot-swappable RGB mechanical switches'],
    [userId, 3200, 'Shopping', 'Uniqlo Airism & Smart Casual Wear', formatYMD(m0.year, m0.month, 9), 'Debit Card', 'Workplace apparel'],
    [userId, 1450, 'Shopping', 'Anker 65W GaN Fast Charger & Braided Cable', formatYMD(m0.year, m0.month, 13), 'UPI', 'Compact travel charger'],
    [userId, 1890, 'Shopping', 'Ergonomic Memory Foam Lumbar Support Cushion', formatYMD(m0.year, m0.month, 16), 'Credit Card', 'Home office desk ergonomics'],

    // Bills & Utilities
    [userId, 1179, 'Bills', 'Airtel Xstream 300Mbps Fiber Broadband', formatYMD(m0.year, m0.month, 3), 'UPI', 'High-speed remote work connection'],
    [userId, 2840, 'Bills', 'State Electricity Board Monthly Bill', formatYMD(m0.year, m0.month, 6), 'Net Banking', 'Air conditioning and appliances'],
    [userId, 1650, 'Bills', 'AWS Cloud & Vercel Pro Hosting', formatYMD(m0.year, m0.month, 8), 'Credit Card', 'Personal projects and side databases'],
    [userId, 799, 'Bills', 'Jio 5G Unlimited Family Postpaid Mobile', formatYMD(m0.year, m0.month, 11), 'UPI', 'Monthly cellular bill'],
    [userId, 890, 'Bills', 'Piped Natural Gas (PNG) & Water Supply', formatYMD(m0.year, m0.month, 14), 'UPI', 'Municipal utility charges'],

    // Transport & Mobility
    [userId, 1500, 'Transport', 'Metro Commuter Smartcard Monthly Recharge', formatYMD(m0.year, m0.month, 2), 'UPI', 'Daily office transit pass'],
    [userId, 1250, 'Transport', 'Airport Express & Uber Premier Ride', formatYMD(m0.year, m0.month, 7), 'UPI', 'Client on-site meeting travel'],
    [userId, 3400, 'Transport', 'Shell V-Power Premium Petrol Refuel', formatYMD(m0.year, m0.month, 11), 'Credit Card', 'Full tank refuel'],
    [userId, 620, 'Transport', 'EV Fast Charging Hub Session', formatYMD(m0.year, m0.month, 14), 'UPI', 'Quick DC fast-charge'],
    [userId, 800, 'Transport', 'Fastag Highway Tolls & Airport Parking', formatYMD(m0.year, m0.month, 17), 'UPI', 'Weekend getaway tolls'],

    // Entertainment & Leisure
    [userId, 1200, 'Entertainment', 'IMAX 3D Sci-Fi Movie Tickets & Snacks', formatYMD(m0.year, m0.month, 6), 'Credit Card', 'Weekend cinema screening'],
    [userId, 499, 'Entertainment', 'Spotify Premium Family Plan', formatYMD(m0.year, m0.month, 9), 'UPI', 'Monthly lossless music streaming'],
    [userId, 2100, 'Entertainment', 'Steam Summer Games & Indie Bundle', formatYMD(m0.year, m0.month, 13), 'Credit Card', 'Weekend gaming relaxation'],
    [userId, 1600, 'Entertainment', 'Live Acoustic Jazz Club Entry & Drinks', formatYMD(m0.year, m0.month, 16), 'UPI', 'Cultural evening performance'],

    // Healthcare & Wellness
    [userId, 3500, 'Healthcare', 'Cult.fit Gym & Functional Fitness Pass', formatYMD(m0.year, m0.month, 1), 'Credit Card', 'Monthly athletic membership'],
    [userId, 1350, 'Healthcare', 'Apollo Pharmacy Vitamins, Zinc & First Aid', formatYMD(m0.year, m0.month, 8), 'Debit Card', 'Immunity and recovery supplements'],
    [userId, 1800, 'Healthcare', 'Routine Dental Scaling & Oral Health Exam', formatYMD(m0.year, m0.month, 15), 'UPI', 'Preventative dental care'],

    // Education & Upskilling
    [userId, 1999, 'Education', 'O\'Reilly Learning Platform Annual Sub Split', formatYMD(m0.year, m0.month, 5), 'Credit Card', 'Architecture & AI engineering books'],
    [userId, 2899, 'Education', 'Deep Learning & System Design Masterclass', formatYMD(m0.year, m0.month, 12), 'Debit Card', 'Advanced engineering certification'],

    // Other & Home
    [userId, 2100, 'Other', 'Urban Company Home Deep Cleaning Service', formatYMD(m0.year, m0.month, 4), 'UPI', 'Monthly sanitization & dusting'],
    [userId, 1450, 'Other', 'Premium Pet Nutrition & Organic Treats', formatYMD(m0.year, m0.month, 10), 'Debit Card', 'High-protein pet kibble'],

    // === PAST MONTH -1 (Historical Depth) ===
    [userId, 18000, 'Rent', 'Apartment Rent - Palm Heights #402', formatYMD(m1.year, m1.month, 2), 'Bank Transfer', 'Monthly residential lease'],
    [userId, 5200, 'Food', 'Monthly Gourmet Groceries & Farmers Market', formatYMD(m1.year, m1.month, 5), 'Debit Card', 'Pantry restock'],
    [userId, 2900, 'Food', 'Bistro Weekend Dinners & Coffee Outings', formatYMD(m1.year, m1.month, 14), 'UPI', 'Social dining'],
    [userId, 8499, 'Shopping', 'Sony WH-1000XM4 Noise Cancelling Headphones', formatYMD(m1.year, m1.month, 10), 'Credit Card', 'Focus audio for deep work'],
    [userId, 2600, 'Bills', 'Electricity & High-Speed Internet', formatYMD(m1.year, m1.month, 4), 'UPI', 'Monthly utilities'],
    [userId, 2800, 'Transport', 'Vehicle Fuel & Metro Card Recharges', formatYMD(m1.year, m1.month, 8), 'Debit Card', 'Commuting costs'],
    [userId, 1750, 'Entertainment', 'Concert Tickets & Streaming Services', formatYMD(m1.year, m1.month, 18), 'Credit Card', 'Weekend live music'],
    [userId, 2400, 'Healthcare', 'Doctor Consultation & Lab Bloodwork', formatYMD(m1.year, m1.month, 12), 'Debit Card', 'Annual preventive screening'],
    [userId, 1400, 'Education', 'Kindle Programming & Finance Books', formatYMD(m1.year, m1.month, 15), 'Credit Card', 'Technical e-books'],

    // === PAST MONTH -2 (Historical Depth) ===
    [userId, 18000, 'Rent', 'Apartment Rent - Palm Heights #402', formatYMD(m2.year, m2.month, 2), 'Bank Transfer', 'Monthly residential lease'],
    [userId, 4800, 'Food', 'Supermarket Supplies & Organic Produce', formatYMD(m2.year, m2.month, 6), 'Debit Card', 'Groceries'],
    [userId, 3100, 'Food', 'Family Dinner Celebration & Takeouts', formatYMD(m2.year, m2.month, 17), 'Credit Card', 'Celebratory dinner'],
    [userId, 4500, 'Shopping', 'Nike Pegasus Trail Running Shoes', formatYMD(m2.year, m2.month, 12), 'Debit Card', 'Marathon training footwear'],
    [userId, 2450, 'Bills', 'Broadband & Mobile Postpaid Plans', formatYMD(m2.year, m2.month, 5), 'UPI', 'Utilities'],
    [userId, 3100, 'Transport', 'Fuel & Outstation Highway Cab', formatYMD(m2.year, m2.month, 9), 'Credit Card', 'Travel expenses'],
    [userId, 1500, 'Entertainment', 'Art Exhibition Entry & Museum Pass', formatYMD(m2.year, m2.month, 21), 'UPI', 'Cultural weekend'],
    [userId, 3500, 'Healthcare', 'Cult.fit Fitness & Strength Membership', formatYMD(m2.year, m2.month, 1), 'Credit Card', 'Monthly gym dues'],

    // === PAST MONTH -3 ===
    [userId, 18000, 'Rent', 'Apartment Rent - Palm Heights #402', formatYMD(m3.year, m3.month, 2), 'Bank Transfer', 'Monthly residential lease'],
    [userId, 4600, 'Food', 'Groceries & Household Supplies', formatYMD(m3.year, m3.month, 7), 'Debit Card', 'Provisions'],
    [userId, 2750, 'Bills', 'Summer Electricity & Water Utilities', formatYMD(m3.year, m3.month, 4), 'Net Banking', 'Utility bills'],
    [userId, 2200, 'Transport', 'City Metro & Uber Commute', formatYMD(m3.year, m3.month, 11), 'UPI', 'Commute'],
    [userId, 3200, 'Shopping', 'Desk Organizing Shelves & LED Lighting', formatYMD(m3.year, m3.month, 16), 'Credit Card', 'Home office setup'],
  ];

  let totalExpenses = 0;
  for (const exp of expenseRecords) {
    await query(
      'INSERT INTO expenses (user_id, amount, category, description, expense_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      exp
    );
    totalExpenses += Number(exp[1]);
  }

  // --- 3. DYNAMIC CATEGORY BUDGETS ---
  const budgetAllocations = [
    { category: 'Food', amount: 13000 },
    { category: 'Rent', amount: 18000 },
    { category: 'Shopping', amount: 12000 },
    { category: 'Bills', amount: 7500 },
    { category: 'Transport', amount: 7000 },
    { category: 'Entertainment', amount: 5000 },
    { category: 'Healthcare', amount: 6500 },
    { category: 'Education', amount: 5000 },
    { category: 'Other', amount: 4000 },
  ];

  // Insert budgets for current month and previous 2 months
  const budgetMonths = [m0, m1, m2];
  for (const bMonth of budgetMonths) {
    for (const b of budgetAllocations) {
      await query(
        'INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)',
        [userId, b.category, b.amount, bMonth.month, bMonth.year]
      );
    }
  }

  // --- 4. DYNAMIC NOTIFICATIONS & BUDGET ALERTS ---
  await query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
    [
      userId,
      '🚀 Dynamic Financial Demo Loaded',
      'Loaded 35+ multi-category transactions across Food, Shopping, Bills, Transport, Health, Entertainment, Education and Rent.',
      'positive',
      0,
    ]
  );
  await query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
    [
      userId,
      '📊 Budget Optimization Insight',
      'Food & Dining spending is at 62% of allocated monthly limit. Shopping is well-paced at 56%. Excellent financial stability!',
      'info',
      0,
    ]
  );
  await query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
    [
      userId,
      '💡 Smart Savings Tip',
      'Consolidating monthly cloud subscriptions and setting auto-pay for utilities can save approximately ₹1,200/month.',
      'warning',
      0,
    ]
  );

  // --- 5. INITIAL AI FINANCIAL INSIGHTS ---
  await query(
    'INSERT INTO ai_insights (user_id, insight_type, title, content, score, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      'spending_anomaly',
      'Balanced Multi-Category Portfolio',
      'Your spending is healthily distributed: Rent represents 28% of total expenses, followed by Food (18%), Shopping (16%), Transport (11%), and Healthcare (9%). Discretionary spending remains securely below 20% of net monthly income.',
      88,
      1,
    ]
  );
  await query(
    'INSERT INTO ai_insights (user_id, insight_type, title, content, score, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      'saving_opportunity',
      'High Savings Rate Detected (42%)',
      'With total monthly inflow of ~₹96,800 and outflow of ~₹56,200, you are sustaining an impressive 42% net monthly savings rate. Consider allocating ₹25,000 toward diversified index funds and emergency reserves.',
      94,
      1,
    ]
  );
  await query(
    'INSERT INTO ai_insights (user_id, insight_type, title, content, score, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      'budget_optimization',
      'Discretionary Spend Under Control',
      'Entertainment and gadget shopping are well within calibrated boundaries. No category has breached the 85% critical risk threshold this billing cycle.',
      91,
      0,
    ]
  );

  const totalIncome = incomeRecords.reduce((sum, r) => sum + Number(r[1]), 0);

  return {
    expenseCount: expenseRecords.length,
    incomeCount: incomeRecords.length,
    budgetCount: budgetAllocations.length * budgetMonths.length,
    totalExpenses,
    totalIncome,
  };
}
