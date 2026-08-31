/**
 * Gemini AI Service
 * Powered by @google/genai SDK (server-side only)
 */

import { GoogleGenAI, Type } from '@google/genai';
import { CATEGORIES } from '../utils/helpers.js';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * 1. AI Expense Categorization
 */
export async function categorizeExpense(description: string, notes?: string): Promise<{
  category: string;
  confidence: number;
  explanation: string;
}> {
  const ai = getAIClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `You are an expert expense classifier. Categorize this expense into exactly one of the following categories:
${CATEGORIES.join(', ')}.

Expense Description: "${description}"
${notes ? `Additional Notes: "${notes}"` : ''}

Respond in strict JSON with keys:
category (string, must be one of the listed categories),
confidence (number between 0 and 1),
explanation (short 1-sentence reason)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              explanation: { type: Type.STRING },
            },
            required: ['category', 'confidence', 'explanation'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.category && CATEGORIES.includes(parsed.category)) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini categorization error, falling back to smart heuristic:', err);
    }
  }

  // Smart heuristic fallback
  return ruleBasedCategorize(description, notes);
}

function ruleBasedCategorize(desc: string, notes: string = ''): { category: string; confidence: number; explanation: string } {
  const text = `${desc} ${notes}`.toLowerCase();
  
  if (/pizza|burger|swiggy|zomato|coffee|tea|dinner|lunch|breakfast|grocery|groceries|supermarket|restaurant|cafe|snack|mcdonald|starbucks|subway|food|kfc|bread|milk|vegetable|fruit/i.test(text)) {
    return { category: 'Food', confidence: 0.95, explanation: 'Matches dining, groceries, and food keywords.' };
  }
  if (/uber|ola|rapido|metro|bus|train|flight|auto|taxi|petrol|diesel|fuel|parking|toll|cab|ticket/i.test(text)) {
    return { category: 'Transport', confidence: 0.95, explanation: 'Matches transit, ride-hail, and fuel terms.' };
  }
  if (/electricity|water|wifi|broadband|recharge|mobile|airtel|jio|gas|cylinder|dth|utility|bills|power/i.test(text)) {
    return { category: 'Bills', confidence: 0.95, explanation: 'Matches recurring utility and recharge services.' };
  }
  if (/amazon|flipkart|myntra|clothes|shoes|dress|shirt|jeans|watch|shopping|mall|electronics|gadget|zara|h&m/i.test(text)) {
    return { category: 'Shopping', confidence: 0.9, explanation: 'Matches retail, fashion, and online shopping items.' };
  }
  if (/netflix|spotify|prime|hotstar|movie|cinema|game|steam|playstation|concert|club|party|theatre/i.test(text)) {
    return { category: 'Entertainment', confidence: 0.9, explanation: 'Matches streaming, games, and entertainment.' };
  }
  if (/doctor|hospital|medicine|pharmacy|clinic|dental|dentist|health|test|lab|apollo|chemist/i.test(text)) {
    return { category: 'Healthcare', confidence: 0.95, explanation: 'Matches medical, healthcare, and prescription terms.' };
  }
  if (/college|school|tuition|course|udemy|coursera|book|exam|fees|stationery|class|training/i.test(text)) {
    return { category: 'Education', confidence: 0.9, explanation: 'Matches learning, tuition, and academic purchases.' };
  }
  if (/hotel|airbnb|resort|vacation|trip|tour|holiday|stay|sightseeing/i.test(text)) {
    return { category: 'Travel', confidence: 0.9, explanation: 'Matches hotel reservations and vacation travel.' };
  }
  if (/rent|flat|pg|hostel|landlord|maintenance|society|housing/i.test(text)) {
    return { category: 'Rent', confidence: 0.95, explanation: 'Matches property rental and accommodation fees.' };
  }

  return { category: 'Other', confidence: 0.7, explanation: 'General expense record.' };
}

/**
 * 2. AI Spending Analysis
 */
export async function analyzeSpending(userData: {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  categories: { category: string; total: number; percentage: number }[];
  monthlyTrends: { month: string; income: number; expense: number }[];
  budgetUsage: { category: string; budget: number; spent: number; usage: number }[];
}): Promise<{
  summary: string;
  insights: { type: string; title: string; message: string; severity: 'info' | 'warning' | 'positive' }[];
  recommendations: string[];
}> {
  const ai = getAIClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `You are an elite personal financial advisor. Analyze this user's financial profile:
Total Income: ₹${userData.totalIncome}
Total Expenses: ₹${userData.totalExpenses}
Balance: ₹${userData.balance}
Savings Rate: ${userData.savingsRate}%
Category Breakdown: ${JSON.stringify(userData.categories)}
Recent Monthly Trends: ${JSON.stringify(userData.monthlyTrends)}
Budget Utilization: ${JSON.stringify(userData.budgetUsage)}

Generate an expert analysis with:
1. summary (concise overview paragraph)
2. insights (array of objects with type, title, message, severity: 'info' | 'warning' | 'positive')
3. recommendations (array of 3-5 actionable financial tips)

Respond in strict JSON.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    title: { type: Type.STRING },
                    message: { type: Type.STRING },
                    severity: { type: Type.STRING },
                  },
                  required: ['type', 'title', 'message', 'severity'],
                },
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['summary', 'insights', 'recommendations'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.summary && parsed.insights) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini spending analysis error, using analytical fallback:', err);
    }
  }

  // Fallback analytical calculations
  const topCategory = userData.categories.length > 0 ? userData.categories[0] : null;
  const insights: any[] = [];

  if (topCategory && topCategory.percentage > 35) {
    insights.push({
      type: 'Overspending',
      title: `High ${topCategory.category} Expenditure`,
      message: `${topCategory.category} accounts for ${topCategory.percentage}% of total expenses (₹${topCategory.total}). Consider optimizing this category.`,
      severity: 'warning',
    });
  }

  if (userData.savingsRate >= 20) {
    insights.push({
      type: 'Positive Trend',
      title: 'Strong Savings Habit',
      message: `Your savings rate is ${userData.savingsRate}%, exceeding the benchmark 20% rule. Excellent wealth preservation.`,
      severity: 'positive',
    });
  } else if (userData.savingsRate < 10 && userData.totalIncome > 0) {
    insights.push({
      type: 'Saving Opportunity',
      title: 'Low Savings Margin',
      message: `Your current savings rate is ${userData.savingsRate}%. Trimming discretionary expenses like Shopping and Entertainment can boost emergency funds.`,
      severity: 'warning',
    });
  }

  const overBudgets = userData.budgetUsage.filter(b => b.usage >= 90);
  if (overBudgets.length > 0) {
    insights.push({
      type: 'Budget Alert',
      title: 'Budget Threshold Reached',
      message: `${overBudgets.map(b => `${b.category} (${b.usage}%)`).join(', ')} is near or above allocated limit.`,
      severity: 'warning',
    });
  }

  return {
    summary: `Your total income is ₹${userData.totalIncome.toLocaleString()} and expenses are ₹${userData.totalExpenses.toLocaleString()}, leaving a net balance of ₹${userData.balance.toLocaleString()} (${userData.savingsRate}% savings rate). ${topCategory ? `${topCategory.category} is your highest spending category.` : 'Start logging more transactions for deeper insights.'}`,
    insights,
    recommendations: [
      'Maintain the 50/30/20 rule: 50% on needs, 30% on wants, 20% on savings.',
      'Review recurring bills and subscriptions for potential discounts.',
      'Set automated monthly budget alerts to avoid month-end deficits.',
    ],
  };
}

/**
 * 3. AI Budget Recommendations
 */
export async function generateBudgetRecommendation(userData: {
  monthlyIncome: number;
  historicalExpenses: { category: string; amount: number; percentage: number }[];
  currentBudgets: { category: string; amount: number }[];
}): Promise<{
  totalRecommendedBudget: number;
  recommendedSavings: number;
  allocations: {
    category: string;
    recommendedAmount: number;
    percentageOfIncome: number;
    reasoning: string;
  }[];
  overview: string;
}> {
  const income = userData.monthlyIncome > 0 ? userData.monthlyIncome : 50000;
  const ai = getAIClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `You are an expert financial planner. Suggest realistic, tailored monthly budget allocations based on:
Monthly Income: ₹${income}
Historical Expenses by Category: ${JSON.stringify(userData.historicalExpenses)}
Existing Budgets: ${JSON.stringify(userData.currentBudgets)}

Allocations must cover: Food, Transport, Bills, Shopping, Entertainment, Healthcare, Education, Rent, Travel, Other, plus Emergency/Savings.
Make sure total allocations do not exceed 100% of income.

Respond in strict JSON with:
totalRecommendedBudget (number),
recommendedSavings (number),
allocations (array of objects with category, recommendedAmount, percentageOfIncome, reasoning),
overview (short summary paragraph)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalRecommendedBudget: { type: Type.NUMBER },
              recommendedSavings: { type: Type.NUMBER },
              allocations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    recommendedAmount: { type: Type.NUMBER },
                    percentageOfIncome: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING },
                  },
                  required: ['category', 'recommendedAmount', 'percentageOfIncome', 'reasoning'],
                },
              },
              overview: { type: Type.STRING },
            },
            required: ['totalRecommendedBudget', 'recommendedSavings', 'allocations', 'overview'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.allocations && parsed.allocations.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini budget recommendation error, using financial model fallback:', err);
    }
  }

  // Fallback 50/30/20 allocation model
  const ratios: { [key: string]: { percent: number; reason: string } } = {
    Rent: { percent: 25, reason: 'Essential housing accommodation target' },
    Food: { percent: 15, reason: 'Groceries, dining, and daily nourishment' },
    Bills: { percent: 10, reason: 'Utilities, electricity, broadband, recharges' },
    Transport: { percent: 8, reason: 'Commuting, fuel, and transit' },
    Shopping: { percent: 8, reason: 'Personal items, apparel, and supplies' },
    Healthcare: { percent: 5, reason: 'Prescriptions, wellness, and preventive care' },
    Entertainment: { percent: 5, reason: 'Leisure, subscriptions, outings' },
    Education: { percent: 4, reason: 'Courses, books, and self-improvement' },
    Travel: { percent: 0, reason: 'Occasional vacation fund' },
    Other: { percent: 0, reason: 'Buffer for miscellaneous expenses' },
  };

  const allocations = Object.keys(ratios).map(cat => {
    const pct = ratios[cat].percent;
    const amount = Math.round((income * pct) / 100);
    return {
      category: cat,
      recommendedAmount: amount,
      percentageOfIncome: pct,
      reasoning: ratios[cat].reason,
    };
  });

  const totalBudget = allocations.reduce((acc, a) => acc + a.recommendedAmount, 0);
  const savings = Math.max(0, income - totalBudget);

  return {
    totalRecommendedBudget: totalBudget,
    recommendedSavings: savings,
    allocations,
    overview: `Based on your monthly income of ₹${income.toLocaleString()}, this smart allocation dedicates ${Math.round((totalBudget / income) * 100)}% to living expenses and reserves ₹${savings.toLocaleString()} (${Math.round((savings / income) * 100)}%) for savings and emergency buffer.`,
  };
}

/**
 * 4. AI Financial Assistant Chatbot
 */
export async function chatWithAssistant(
  userMessage: string,
  financialContext: {
    userName: string;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    savingsRate: number;
    recentExpenses: any[];
    recentIncome: any[];
    budgets: any[];
    topCategories: any[];
  }
): Promise<string> {
  const ai = getAIClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `You are the built-in AI Financial Assistant for "${financialContext.userName}" in the AI Expense & Budget Manager.
Answer the user's question directly, concisely, and helpfully using STRICTLY their authentic financial data below:

FINANCIAL DATA:
- Total Income: ₹${financialContext.totalIncome}
- Total Expenses: ₹${financialContext.totalExpenses}
- Current Balance: ₹${financialContext.balance}
- Savings Rate: ${financialContext.savingsRate}%
- Active Budgets: ${JSON.stringify(financialContext.budgets)}
- Top Spending Categories: ${JSON.stringify(financialContext.topCategories)}
- Recent Expenses: ${JSON.stringify(financialContext.recentExpenses)}
- Recent Income: ${JSON.stringify(financialContext.recentIncome)}

GUIDELINES:
1. Always format monetary values with the rupee sign (₹) or standard Indian format.
2. Provide concrete numbers and actionable suggestions based on their real balance and spending.
3. Be professional, encouraging, analytical, and friendly.
4. Keep answers clean and well-structured with bullet points where appropriate.

User Question: "${userMessage}"`,
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini chat error, using conversational engine fallback:', err);
    }
  }

  // Intelligent conversational fallback
  return ruleBasedChatResponse(userMessage, financialContext);
}

function ruleBasedChatResponse(msg: string, ctx: any): string {
  const lower = msg.toLowerCase();

  if (lower.includes('spend') || lower.includes('expense') || lower.includes('how much did i spend')) {
    const top = ctx.topCategories?.[0];
    return `### 💸 Spending Summary\n\nYour total recorded expenses are **₹${ctx.totalExpenses.toLocaleString()}**.\n\n${top ? `* **Highest Spending Category:** ${top.category} (₹${top.total?.toLocaleString() || 0})\n` : ''}* **Current Balance:** ₹${ctx.balance.toLocaleString()}\n\nTip: You can set a monthly budget in the Budgets section to automatically detect when you reach 70% or 90% of your limit.`;
  }

  if (lower.includes('highest') || lower.includes('category') || lower.includes('where do i spend most')) {
    if (ctx.topCategories && ctx.topCategories.length > 0) {
      const topList = ctx.topCategories.slice(0, 3).map((c: any, i: number) => `${i + 1}. **${c.category}**: ₹${Number(c.total || 0).toLocaleString()}`).join('\n');
      return `### 📊 Highest Spending Categories\n\nHere are your top spending areas:\n\n${topList}\n\nConsider reviewing discretionary expenses in your top category to boost your monthly savings rate!`;
    }
    return `You haven't recorded enough expenses yet. Add a few expenses to see your top category analysis!`;
  }

  if (lower.includes('save') || lower.includes('savings') || lower.includes('savings rate')) {
    return `### 💰 Savings Performance\n\n* **Net Savings (Balance):** ₹${ctx.balance.toLocaleString()}\n* **Savings Rate:** ${ctx.savingsRate}%\n\n${ctx.savingsRate >= 20 ? '🌟 Outstanding work! Your savings rate exceeds the recommended 20% benchmark.' : '💡 Aim for a 20% savings rate by trimming non-essential purchases in dining or entertainment.'}`;
  }

  if (lower.includes('balance') || lower.includes('current balance') || lower.includes('money left')) {
    return `### 💳 Current Financial Balance\n\n* **Total Income:** ₹${ctx.totalIncome.toLocaleString()}\n* **Total Expenses:** ₹${ctx.totalExpenses.toLocaleString()}\n* **Current Net Balance:** **₹${ctx.balance.toLocaleString()}**\n\nAll calculations are synchronized with your real records in the database.`;
  }

  if (lower.includes('budget') || lower.includes('suggest') || lower.includes('recommend')) {
    return `### 🎯 Smart Budget Recommendation\n\nFor an income of **₹${ctx.totalIncome.toLocaleString()}**, here is the 50/30/20 standard guideline:\n\n* **Needs (50%):** ₹${(ctx.totalIncome * 0.5).toLocaleString()} *(Rent, Food, Bills, Transport)*\n* **Wants (30%):** ₹${(ctx.totalIncome * 0.3).toLocaleString()} *(Shopping, Entertainment, Travel)*\n* **Savings & Emergency (20%):** ₹${(ctx.totalIncome * 0.2).toLocaleString()}\n\nGo to the **Budgets** page to set active thresholds and get live warnings!`;
  }

  if (lower.includes('reduce') || lower.includes('cut') || lower.includes('save money')) {
    return `### 💡 Actionable Ways to Reduce Expenses\n\n1. **Audit Subscriptions:** Check monthly entertainment and streaming bills.\n2. **Batch Meal Planning:** Food and dining out is often the highest variable category.\n3. **Use 48-Hour Rule:** Wait 48 hours before non-essential purchases over ₹1,000.\n4. **Set Category Budgets:** Configure 70% and 90% alert triggers in the Budgets tab.`;
  }

  return `### 🤖 AI Financial Assistant\n\nHello ${ctx.userName || 'there'}! Here is a quick snapshot of your finances:\n\n* **Total Income:** ₹${ctx.totalIncome.toLocaleString()}\n* **Total Expenses:** ₹${ctx.totalExpenses.toLocaleString()}\n* **Net Balance:** ₹${ctx.balance.toLocaleString()}\n* **Savings Rate:** ${ctx.savingsRate}%\n\nYou can ask me:\n- *"How much did I spend this month?"*\n- *"What is my highest spending category?"*\n- *"Where can I reduce expenses?"*\n- *"Suggest a budget for me"*`;
}
