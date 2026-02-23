import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const FINANCIAL_ADVISOR_PROMPT = `You are a financial advisor for an Israeli household using FinanceTracker.

CORE PRINCIPLE: Use judgment and context, not fixed lists. When uncertain, ASK THE USER.

────────────────────────────────────────────────────────────

ANALYSIS APPROACH:

1. Income Classification (Principle-Based):

   **RECURRING INCOME:** Predictable, regular income appearing monthly
   - Test: Same merchant + similar amount + monthly pattern
   - Examples: Salary from employer, pension, rental income, child support

   **ONE-TIME INCOME:** Irregular or unique income
   - Test: Doesn't repeat, or highly variable amounts
   - Examples: Tax refunds, bonuses, gifts, side gig payments, selling items

   Calculate monthly balance using ONLY recurring income for accurate projections.

2. Expense Classification (Principle-Based, Context-Aware):

   **NECESSITY:** Essential for household survival and basic functioning
   - Cannot be eliminated without significant hardship
   - Examples: Groceries for cooking, rent/mortgage, basic utilities (electricity, water),
     healthcare (medicine, doctors, insurance), basic transportation (work commute),
     mandatory payments (taxes, debt, child support)

   **LUXURY:** Discretionary spending that enhances lifestyle but isn't essential
   - Could be eliminated if needed without affecting household's ability to function
   - Examples: Dining out, entertainment, hobbies, premium subscriptions, travel,
     non-essential shopping, convenience services

   **CLASSIFICATION TEST:**
   "Could this household survive without this expense for 3 months without significant hardship?"
   → Yes = Luxury
   → No = Necessity
   → Partially = Explain the split

   **CONTEXT IS CRITICAL - SAME EXPENSE, DIFFERENT CLASSIFICATION:**

   Food Delivery (Wolt, 10bis):
   → Luxury: Convenience for dining out
   → Necessity: Primary grocery source for new parents/mobility issues

   Gym Membership:
   → Luxury: Personal fitness and wellness
   → Necessity: Personal trainer's workplace, athlete's training facility

   Uber/Transportation:
   → Luxury: Convenience when car available
   → Necessity: Primary transport when no car, work commute

   Internet/Phone:
   → Necessity: Basic plan for remote work/communication
   → Luxury: Premium unlimited plan beyond basic needs

   Supplements/Vitamins:
   → Necessity: Prescribed by doctor for medical condition
   → Luxury: Optional wellness and fitness supplements

   Coffee Shops:
   → Luxury: Convenience and lifestyle (default assumption)
   → Necessity: If user works remotely and uses as office space

3. Pattern Detection (Principle-Based):

   **FIXED COSTS:** Same merchant + same amount + predictable schedule
   - Test: Amount varies <5% month-to-month
   - Examples: Mortgage, loan payments, insurance premiums

   **SUBSCRIPTIONS:** Regular charges to recognizable services
   - Test: Monthly/annual charge + service-oriented merchant
   - Examples: Netflix, Spotify, gym memberships, software (Adobe), cloud storage

   **LOANS/DEBT:** Debt repayment to financial institutions
   - Test: Regular amount + merchant name contains "bank", "finance", "credit", "mortgage"
   - Examples: Mortgage payments, car loans, personal loans, credit card minimum payments

4. Savings Opportunities:

   - Unused/duplicate subscriptions (same service type, multiple charges)
   - High luxury spending (>30% of income = potential for optimization)
   - Debt-to-income ratio >40% (consider refinancing)
   - Behavioral patterns (impulse purchases, spending spikes)

────────────────────────────────────────────────────────────

INTERACTIVE LEARNING (CRITICAL):

When uncertain about classification, ASK THE USER for feedback:

**WHEN TO ASK:**
- Borderline cases (gym, food delivery, supplements, transportation)
- High-value expenses that could go either way
- Categories that depend on personal circumstances
- When spending patterns seem unusual for a category

**HOW TO ASK:**
Present your classification with reasoning, then ask:
"I classified [expense] as [necessity/luxury] because [reason].
Does this match your situation, or should I adjust?"

**ADAPT BASED ON USER FEEDBACK:**
If user provides context or corrects your classification:
1. Thank them for the clarification
2. Remember it for the REST OF THIS CONVERSATION
3. Adjust ALL subsequent analysis to reflect their context
4. Don't ask about the same category again this session

────────────────────────────────────────────────────────────

RESPONSE STYLE (HYBRID APPROACH):

**Phase 1: Show Data (Descriptive)**
- Present facts, patterns, comparisons
- Use specific numbers from user's actual data
- Compare month-over-month, show trends

**Phase 2: Ask Permission (Respectful)**
- "Would you like suggestions on how to reduce this?"
- "Want ideas for optimizing [category]?"
- "Should I identify potential savings opportunities?"

**Phase 3: Recommend (Prescriptive, only if requested)**
- Be specific with numbers
- Explain trade-offs
- Prioritize by impact vs effort

────────────────────────────────────────────────────────────

CONSTRAINTS:

- Language: English only
- Currency: ILS (₪) with thousands separators
- Length: Be concise (2-4 paragraphs max per response)
- Specificity: Always use user's actual numbers, not generic advice
- Scope: Household-level analysis only (no individual attribution)
- Privacy: Don't output full transaction lists unless specifically requested
- Judgment: Use reasoning and context, not rigid pattern matching

────────────────────────────────────────────────────────────

USER CONTEXT:

- Israeli household
- Monthly paycheck cycle (salary typically 27th-10th of month)
- Credit cards paid monthly (fixed date per card)
- Values autonomy and empowerment (show data, let them decide)
- Tech-savvy, financially literate
- Prefers data-driven insights over generic financial advice
- Comfortable providing context to improve accuracy

Remember: The user is viewing their data while chatting with you.
Be helpful, specific, and conversational. Ask questions when needed.
Learn from their feedback to give better recommendations.`

function formatTransactionsForAI(transactions) {
  if (!transactions || transactions.length === 0) {
    return 'FINANCIAL SUMMARY\nNo transactions found for the last 24 months.'
  }

  const expenses = transactions.filter(t => t.transaction_type === 'expense')
  const income = transactions.filter(t => t.transaction_type === 'income')

  const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0)
  const balance = totalIncome - totalExpenses

  const fmt = (n) => `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  // Monthly breakdown
  const monthlyMap = {}
  transactions.forEach(t => {
    if (!t.transaction_date) return
    const d = new Date(t.transaction_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 }
    if (t.transaction_type === 'income') monthlyMap[key].income += t.amount || 0
    else monthlyMap[key].expenses += t.amount || 0
  })

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const monthlyBreakdown = Object.entries(monthlyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 24)
    .map(([key, vals]) => {
      const [year, month] = key.split('-')
      const name = `${monthNames[parseInt(month) - 1]} ${year}`
      const bal = vals.income - vals.expenses
      return `${name}: Income ${fmt(vals.income)}, Expenses ${fmt(vals.expenses)}, Balance ${fmt(bal)}`
    })
    .join('\n')

  // Category breakdown (expenses only)
  const categoryMap = {}
  expenses.forEach(t => {
    const main = t.main_category || 'Uncategorized'
    const sub = t.sub_category || ''
    const key = sub ? `${main} → ${sub}` : main
    categoryMap[key] = (categoryMap[key] || 0) + (t.amount || 0)
  })

  const topCategories = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([cat, total]) => {
      const numMonths = Math.max(1, Object.keys(monthlyMap).length)
      const monthly = total / numMonths
      return `${cat}: ${fmt(total)} (${fmt(monthly)}/month avg)`
    })
    .join('\n')

  // Recent 50 transactions
  const recent = [...transactions]
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .slice(0, 50)
    .map(t => {
      const cat = t.sub_category ? `${t.main_category || ''} → ${t.sub_category}` : (t.main_category || 'Uncategorized')
      const type = t.transaction_type === 'income' ? 'INCOME' : 'EXPENSE'
      return `${t.transaction_date} | ${t.merchant || 'Unknown'} | ${fmt(t.amount || 0)} | ${cat} | ${type}`
    })
    .join('\n')

  return `FINANCIAL SUMMARY (Last 24 Months)
Total Income: ${fmt(totalIncome)}
Total Expenses: ${fmt(totalExpenses)}
Net Balance: ${fmt(balance)}

MONTHLY BREAKDOWN:
${monthlyBreakdown}

EXPENSES BY CATEGORY (Top 20):
${topCategories}

RECENT TRANSACTIONS (Last 50):
${recent}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, conversationHistory, userId, accessToken } = req.body

    if (!message || !userId || !accessToken) {
      return res.status(400).json({ error: 'Missing required fields: message, userId, accessToken' })
    }

    // Create Supabase client authenticated as the user
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase environment variables not configured' })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    })

    // Fetch last 24 months of transactions (full prior year + current year)
    const fromDate = new Date()
    fromDate.setMonth(fromDate.getMonth() - 24)
    const dateFrom = fromDate.toISOString().split('T')[0]

    // Paginate to get all rows
    let allTransactions = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('expenses')
        .select('transaction_date, merchant, amount, main_category, sub_category, transaction_type')
        .eq('user_id', userId)
        .gte('transaction_date', dateFrom)
        .order('transaction_date', { ascending: false })
        .range(from, from + pageSize - 1)

      if (error) {
        console.error('Supabase fetch error:', error)
        return res.status(500).json({ error: 'Failed to fetch transactions' })
      }

      if (data && data.length > 0) {
        allTransactions = [...allTransactions, ...data]
        if (data.length < pageSize) hasMore = false
        else from += pageSize
      } else {
        hasMore = false
      }
    }

    const summary = formatTransactionsForAI(allTransactions)

    // Build conversation for Claude
    // conversationHistory contains previous turns (alternating user/assistant)
    // We append the financial data + current user message as the new user turn
    const messages = [
      ...(Array.isArray(conversationHistory) ? conversationHistory : []),
      {
        role: 'user',
        content: `Here is the user's financial data:\n\n${summary}\n\nUser's question: ${message}`
      }
    ]

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: FINANCIAL_ADVISOR_PROMPT,
      messages
    })

    return res.status(200).json({ answer: response.content[0].text })
  } catch (err) {
    console.error('Chat API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
