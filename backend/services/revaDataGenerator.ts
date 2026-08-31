/**
 * Reva Profile Data Generator
 * Creates a unique financial profile (Product Designer & Creative Entrepreneur) distinct from the software engineer demo dataset.
 */

import { query } from '../config/db.js';

interface RevaOptions {
  clearExisting?: boolean;
}

export async function generateRevaFinancialData(userId: number, options: RevaOptions = {}) {
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
    return { month: m, year: y };
  };

  const m0 = { month: currentMonth, year: currentYear };
  const m1 = getPastMonth(1);
  const m2 = getPastMonth(2);
  const m3 = getPastMonth(3);

  // --- 1. DISTINCT INCOME STREAMS (Design Studio Director & UI/UX Consultant) ---
  const incomeRecords = [
    // Current Month
    [userId, 92000, 'Salary', 'Lead UI/UX Product Designer Monthly Retainer', formatYMD(m0.year, m0.month, 1)],
    [userId, 24000, 'Freelance', 'Fintech Mobile App Design System Sprint', formatYMD(m0.year, m0.month, 7)],
    [userId, 9500, 'Investment', 'Sovereign Gold Bonds & Equity Mutual Fund Dividend', formatYMD(m0.year, m0.month, 15)],
    [userId, 12000, 'Business', 'Figma UI Component Kit Marketplace Royalties', formatYMD(m0.year, m0.month, 20)],

    // Month -1
    [userId, 92000, 'Salary', 'Lead UI/UX Product Designer Monthly Retainer', formatYMD(m1.year, m1.month, 1)],
    [userId, 28500, 'Freelance', 'Brand Identity & Webflow Studio Launch', formatYMD(m1.year, m1.month, 10)],
    [userId, 8200, 'Business', 'Digital Icon Pack & Asset Sales', formatYMD(m1.year, m1.month, 18)],

    // Month -2
    [userId, 88000, 'Salary', 'Lead UI/UX Product Designer Monthly Retainer', formatYMD(m2.year, m2.month, 1)],
    [userId, 19500, 'Freelance', 'E-Commerce UX Audit & Conversion Flow Redesign', formatYMD(m2.year, m2.month, 12)],
    [userId, 6400, 'Investment', 'Debt Mutual Fund Interest Credit', formatYMD(m2.year, m2.month, 22)],

    // Month -3
    [userId, 88000, 'Salary', 'Lead UI/UX Product Designer Monthly Retainer', formatYMD(m3.year, m3.month, 1)],
    [userId, 22000, 'Freelance', 'SaaS Onboarding UX & Design Token Setup', formatYMD(m3.year, m3.month, 14)],
  ];

  for (const inc of incomeRecords) {
    await query(
      'INSERT INTO income (user_id, amount, source, description, income_date) VALUES (?, ?, ?, ?, ?)',
      inc
    );
  }

  // --- 2. DISTINCT EXPENSES (Creative Studio, Wellness, Art, Travel & Modern Lifestyle) ---
  const expenseRecords = [
    // === CURRENT MONTH ===
    // Rent / Studio Loft
    [userId, 26000, 'Rent', 'Sunlit Modern Studio Apartment - Indiranagar 4th Block', formatYMD(m0.year, m0.month, 2), 'Bank Transfer', 'Monthly loft rent including maintenance'],

    // Food & Specialty Cafes
    [userId, 5800, 'Food', 'Nature’s Basket Gourmet Organics & Italian Pantry', formatYMD(m0.year, m0.month, 3), 'Credit Card', 'Cold-pressed oils, aged cheese, sourdough & berries'],
    [userId, 1250, 'Food', 'Third Wave Coffee Roasters & Specialty Matchas', formatYMD(m0.year, m0.month, 5), 'UPI', 'Creative sketching afternoon sessions'],
    [userId, 2400, 'Food', 'Olive Beach Mediterranean Bistro Dinner', formatYMD(m0.year, m0.month, 8), 'Credit Card', 'Dinner with creative team & clients'],
    [userId, 1680, 'Food', 'Subko Artisanal Bakery & Specialty Pour-overs', formatYMD(m0.year, m0.month, 11), 'UPI', 'Weekend sourdough pastries & cold brews'],
    [userId, 3100, 'Food', 'Japanese Izakaya Ramen & Sushi Platter', formatYMD(m0.year, m0.month, 14), 'Debit Card', 'Team lunch celebration'],
    [userId, 1420, 'Food', 'Farm-to-Table Fresh Salad Bowl Deliveries', formatYMD(m0.year, m0.month, 17), 'UPI', 'Healthy workday meals'],

    // Shopping & Creative Workspace Hardware
    [userId, 14500, 'Shopping', 'Apple Studio Display 27-inch 5K Monitor Stand & Accs', formatYMD(m0.year, m0.month, 4), 'Credit Card', 'Color-accurate design workspace setup'],
    [userId, 4800, 'Shopping', 'Zara Minimalist Linen Capsule Wardrobe Collection', formatYMD(m0.year, m0.month, 9), 'Credit Card', 'Design conference attire'],
    [userId, 2900, 'Shopping', 'Moleskine Smart Writing Set & Japanese Brush Pens', formatYMD(m0.year, m0.month, 13), 'Debit Card', 'Analog wireframing and sketching supplies'],
    [userId, 3600, 'Shopping', 'Herman Miller Flo Modular Dual Monitor Arm', formatYMD(m0.year, m0.month, 16), 'Credit Card', 'Ergonomic studio desk overhaul'],

    // Bills & Creative Software Subscriptions
    [userId, 3999, 'Bills', 'Adobe Creative Cloud All Apps & Figma Organization', formatYMD(m0.year, m0.month, 2), 'Credit Card', 'Professional design suite license'],
    [userId, 2200, 'Bills', 'Act Fibernet Gigabit 1000Mbps Fiber Broadband', formatYMD(m0.year, m0.month, 4), 'UPI', 'High bandwidth cloud asset sync'],
    [userId, 1950, 'Bills', 'Electricity & Central Studio Air Conditioning', formatYMD(m0.year, m0.month, 6), 'Net Banking', 'Monthly electricity charges'],
    [userId, 1499, 'Bills', 'Midjourney Pro & Claude AI Pro Subscriptions', formatYMD(m0.year, m0.month, 9), 'Credit Card', 'Generative asset styling & prompt workflows'],
    [userId, 699, 'Bills', 'Airtel Black 5G Postpaid Executive Plan', formatYMD(m0.year, m0.month, 12), 'UPI', 'Mobile and roaming data'],

    // Transport & Eco Mobility
    [userId, 2800, 'Transport', 'Ather 450X Electric Scooter Smart Grid Charging', formatYMD(m0.year, m0.month, 3), 'UPI', 'Clean daily urban commute'],
    [userId, 1850, 'Transport', 'Uber Black Airport Transfers to Mumbai Design Fest', formatYMD(m0.year, m0.month, 7), 'Credit Card', 'Design conference transit'],
    [userId, 1200, 'Transport', 'Namma Metro Executive Smart Pass', formatYMD(m0.year, m0.month, 12), 'UPI', 'Traffic-free cross-city studio commutes'],
    [userId, 2400, 'Transport', 'Self-drive Outstation EV Rental (Weekend Coorg)', formatYMD(m0.year, m0.month, 18), 'Credit Card', 'Weekend rejuvenation trip'],

    // Entertainment, Culture & Arts
    [userId, 3500, 'Entertainment', 'National Centre for Performing Arts (NCPA) Symphony', formatYMD(m0.year, m0.month, 6), 'Credit Card', 'Live orchestral classical concert'],
    [userId, 1400, 'Entertainment', 'Independent Art Cinema Society & MUBI Annual', formatYMD(m0.year, m0.month, 10), 'UPI', 'Curated cinema streaming & indie screenings'],
    [userId, 2200, 'Entertainment', 'Contemporary Ceramics Pottery Workshop & Clay Kit', formatYMD(m0.year, m0.month, 15), 'Debit Card', 'Mindful weekend sculpting'],
    [userId, 899, 'Entertainment', 'Apple One Premier (Music, Arcade, TV+ & Fitness+)', formatYMD(m0.year, m0.month, 20), 'Credit Card', 'Family media subscription'],

    // Healthcare, Mindfulness & Wellness
    [userId, 5500, 'Healthcare', 'Ashtanga Yoga Shala & Sound Healing Immersion', formatYMD(m0.year, m0.month, 1), 'UPI', 'Monthly mindfulness and morning yoga'],
    [userId, 2100, 'Healthcare', 'Organic Plant Protein & Cold-Pressed Herbal Tonics', formatYMD(m0.year, m0.month, 8), 'Debit Card', 'Wellness nutrition & adaptogens'],
    [userId, 3200, 'Healthcare', 'Ayurvedic Rejuvenation Therapy & Deep Tissue Massage', formatYMD(m0.year, m0.month, 16), 'UPI', 'Stress relief & spine alignment'],

    // Education, Typography & Masterclasses
    [userId, 4500, 'Education', 'Type Design & Variable Font Foundry Masterclass', formatYMD(m0.year, m0.month, 5), 'Credit Card', 'Advanced typographic system design'],
    [userId, 2750, 'Education', 'Monotype Font License Bundle & Design Annuals', formatYMD(m0.year, m0.month, 13), 'Debit Card', 'Commercial font assets for client work'],

    // Other & Studio Plants
    [userId, 3200, 'Other', 'Indoor Exotic Air-Purifying Plants & Ceramic Planters', formatYMD(m0.year, m0.month, 4), 'UPI', 'Monstera, Fiddle Leaf Fig & studio greenery'],
    [userId, 1800, 'Other', 'Scented Soy Wax Candles & Essential Oil Diffuser', formatYMD(m0.year, m0.month, 11), 'Debit Card', 'Aromatherapy studio atmosphere'],

    // === PAST MONTH -1 ===
    [userId, 26000, 'Rent', 'Sunlit Modern Studio Apartment - Indiranagar', formatYMD(m1.year, m1.month, 2), 'Bank Transfer', 'Monthly loft rent'],
    [userId, 6400, 'Food', 'Organic Groceries, Specialty Cheeses & Wines', formatYMD(m1.year, m1.month, 6), 'Credit Card', 'Gourmet home cooking'],
    [userId, 3800, 'Food', 'Weekend Rooftop Dinners & Craft Cocktails', formatYMD(m1.year, m1.month, 15), 'UPI', 'Social evenings'],
    [userId, 11200, 'Shopping', 'iPad Pro 11-inch M4 Apple Pencil Pro & Folio', formatYMD(m1.year, m1.month, 9), 'Credit Card', 'Digital hand-drawing and design reviews'],
    [userId, 4800, 'Bills', 'Adobe Cloud, Figma Enterprise & Gigabit Fiber', formatYMD(m1.year, m1.month, 4), 'Credit Card', 'Design tech stack'],
    [userId, 3400, 'Transport', 'Intercity Flight Transit & Eco Ride Hailing', formatYMD(m1.year, m1.month, 11), 'Credit Card', 'Client presentation trip'],
    [userId, 4200, 'Entertainment', 'Art Biennale Pass & Modern Art Exhibition Catalog', formatYMD(m1.year, m1.month, 19), 'Debit Card', 'Contemporary art exploration'],
    [userId, 5500, 'Healthcare', 'Ashtanga Yoga & Wellness Membership', formatYMD(m1.year, m1.month, 1), 'UPI', 'Monthly fitness pass'],
    [userId, 3500, 'Education', 'Interaction Design Foundation Global Membership', formatYMD(m1.year, m1.month, 14), 'Credit Card', 'HCI research library access'],

    // === PAST MONTH -2 ===
    [userId, 26000, 'Rent', 'Sunlit Modern Studio Apartment - Indiranagar', formatYMD(m2.year, m2.month, 2), 'Bank Transfer', 'Monthly loft rent'],
    [userId, 5900, 'Food', 'Organic Provisions & Healthy Meal Kits', formatYMD(m2.year, m2.month, 7), 'Debit Card', 'Groceries'],
    [userId, 3400, 'Food', 'Artisan Coffee Roasteries & Bakery Meets', formatYMD(m2.year, m2.month, 18), 'UPI', 'Client meetings'],
    [userId, 6200, 'Shopping', 'Bang & Olufsen Beosound A1 Portable Speaker', formatYMD(m2.year, m2.month, 12), 'Credit Card', 'Studio acoustics & design fidelity'],
    [userId, 4200, 'Bills', 'Studio Utilities, Fiber & Creative Software', formatYMD(m2.year, m2.month, 5), 'UPI', 'Recurring expenses'],
    [userId, 2900, 'Transport', 'City Electric Commute & Airport Rides', formatYMD(m2.year, m2.month, 10), 'Debit Card', 'Transit'],
    [userId, 3800, 'Entertainment', 'Live Jazz & World Music Festival Weekend Passes', formatYMD(m2.year, m2.month, 22), 'Credit Card', 'Weekend festival'],
    [userId, 5500, 'Healthcare', 'Ashtanga Yoga Studio Pass', formatYMD(m2.year, m2.month, 1), 'UPI', 'Yoga studio'],

    // === PAST MONTH -3 ===
    [userId, 26000, 'Rent', 'Sunlit Modern Studio Apartment - Indiranagar', formatYMD(m3.year, m3.month, 2), 'Bank Transfer', 'Monthly loft rent'],
    [userId, 5600, 'Food', 'Artisan Pantry Supplies & Weekly Produce', formatYMD(m3.year, m3.month, 8), 'Debit Card', 'Pantry restock'],
    [userId, 4100, 'Bills', 'High-Speed Broadband & Cloud Infrastructure', formatYMD(m3.year, m3.month, 5), 'Net Banking', 'Utilities'],
    [userId, 2500, 'Transport', 'Urban Mobility & Eco Charging', formatYMD(m3.year, m3.month, 12), 'UPI', 'Transit'],
    [userId, 4900, 'Shopping', 'Minimalist Oak Wood Desk Organizer & Mat', formatYMD(m3.year, m3.month, 17), 'Credit Card', 'Workspace aesthetics'],
  ];

  let totalExpenses = 0;
  for (const exp of expenseRecords) {
    await query(
      'INSERT INTO expenses (user_id, amount, category, description, expense_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      exp
    );
    totalExpenses += Number(exp[1]);
  }

  // --- 3. CUSTOM BUDGET LIMITS FOR REVA ---
  const budgetAllocations = [
    { category: 'Food', amount: 16000 },
    { category: 'Rent', amount: 26000 },
    { category: 'Shopping', amount: 18000 },
    { category: 'Bills', amount: 9000 },
    { category: 'Transport', amount: 8500 },
    { category: 'Entertainment', amount: 7500 },
    { category: 'Healthcare', amount: 8000 },
    { category: 'Education', amount: 7000 },
    { category: 'Other', amount: 5000 },
  ];

  const budgetMonths = [m0, m1, m2];
  for (const bMonth of budgetMonths) {
    for (const b of budgetAllocations) {
      await query(
        'INSERT INTO budgets (user_id, category, amount, month, year) VALUES (?, ?, ?, ?, ?)',
        [userId, b.category, b.amount, bMonth.month, bMonth.year]
      );
    }
  }

  // --- 4. SMART NOTIFICATIONS FOR REVA ---
  await query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
    [
      userId,
      '🎨 Creative Studio Financial Profile Ready',
      'Welcome Reva! Loaded custom financial telemetry tailored for design consulting, SaaS royalties, and studio operations.',
      'positive',
      0,
    ]
  );
  await query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
    [
      userId,
      '💎 High Inflow Rate',
      'This month’s retainer + Figma royalties achieved ₹1,37,500 in total revenue. Operating expenses remain well under 52% of income.',
      'info',
      0,
    ]
  );
  await query(
    'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
    [
      userId,
      '🌿 Tax & Expense Optimization',
      'Software licenses (Figma, Adobe, Midjourney) qualify for business expense deductions under Creative Consultancy.',
      'warning',
      0,
    ]
  );

  // --- 5. AI INSIGHTS CUSTOMIZED FOR REVA ---
  await query(
    'INSERT INTO ai_insights (user_id, insight_type, title, content, score, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      'spending_anomaly',
      'High-Margin Creative Consulting Portfolio',
      'Your financial profile reflects strong revenue diversity: 67% retainer salary, 17% client design sprints, 9% Figma asset royalties, and 7% passive investments. Net margin after all living and studio expenses is 48.6%.',
      95,
      1,
    ]
  );
  await query(
    'INSERT INTO ai_insights (user_id, insight_type, title, content, score, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      'saving_opportunity',
      'Design Hardware Capital Expenditure',
      'Your workspace hardware upgrades (Apple 5K display, monitor arms) have been completely amortized this quarter without exceeding your Shopping budget (71% utilized).',
      92,
      1,
    ]
  );
  await query(
    'INSERT INTO ai_insights (user_id, insight_type, title, content, score, is_bookmarked) VALUES (?, ?, ?, ?, ?, ?)',
    [
      userId,
      'budget_optimization',
      'Balanced Lifestyle & Wellness Allocation',
      'Mindfulness yoga and specialty food spending are tracking at optimal health ratios. Your reserve surplus allows ₹35,000 to be redirected to your High-Yield Index SIP.',
      89,
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
