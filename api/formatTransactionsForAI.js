/**
 * Format transaction list into a text summary for Claude.
 * Used by /api/chat serverless function.
 */
function formatTransactionsForAI(transactions) {
  if (!transactions || transactions.length === 0) {
    return 'No transactions in the last 24 months.';
  }

  const income = transactions.filter((t) => t.transaction_type === 'income');
  const expenses = transactions.filter((t) => t.transaction_type === 'expense');
  const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const fmt = (n) => `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;

  // Monthly breakdown (last 24 months)
  const byMonth = {};
  transactions.forEach((t) => {
    const d = (t.transaction_date || '').toString().slice(0, 7);
    if (!d) return;
    if (!byMonth[d]) byMonth[d] = { income: 0, expenses: 0 };
    if (t.transaction_type === 'income') byMonth[d].income += t.amount || 0;
    else byMonth[d].expenses += t.amount || 0;
  });
  const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 24);

  let monthlyText = months
    .map(([ym, v]) => {
      const [y, m] = ym.split('-');
      const monthName = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      return `${monthName}: Income ${fmt(v.income)}, Expenses ${fmt(v.expenses)}, Balance ${fmt(v.income - v.expenses)}`;
    })
    .join('\n');

  // Expenses by category per month
  const byMonthCategory = {};
  expenses.forEach((t) => {
    const ym = (t.transaction_date || '').toString().slice(0, 7);
    if (!ym) return;
    const cat = [t.main_category || 'Uncategorized', t.sub_category].filter(Boolean).join(' → ');
    if (!byMonthCategory[ym]) byMonthCategory[ym] = {};
    byMonthCategory[ym][cat] = (byMonthCategory[ym][cat] || 0) + (t.amount || 0);
  });
  const monthlyCategoryLines = Object.entries(byMonthCategory)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 24)
    .map(([ym, cats]) => {
      const [y, m] = ym.split('-');
      const monthName = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      const top = Object.entries(cats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([c, amt]) => `${c}: ${fmt(amt)}`)
        .join('; ');
      return `${monthName}: ${top || 'No expenses'}`;
    })
    .join('\n');

  // Top categories (expenses only): overall
  const categorySums = {};
  expenses.forEach((t) => {
    const cat = [t.main_category || 'Uncategorized', t.sub_category].filter(Boolean).join(' → ');
    categorySums[cat] = (categorySums[cat] || 0) + (t.amount || 0);
  });
  const topCategories = Object.entries(categorySums)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, value]) => {
      const avg = months.length ? value / months.length : value;
      return `${name}: ${fmt(value)} (${fmt(avg)}/month avg)`;
    })
    .join('\n');

  // Amortized transactions (full parameters)
  const amortized = transactions.filter((t) => t.is_amortized === true);
  const amortizedLines = amortized.length === 0
    ? 'None'
    : amortized.map((t) => {
        const parts = [
          `Merchant: ${t.merchant || 'Unknown'}`,
          `Amount: ${fmt(t.amount || 0)}`,
          `Category: ${[t.main_category, t.sub_category].filter(Boolean).join(' → ') || 'Uncategorized'}`,
          `Start: ${t.amortization_start_date || '?'}`,
          `Months: ${t.amortization_months ?? '?'}`,
          `Monthly: ${t.amortization_monthly_amount != null ? fmt(t.amortization_monthly_amount) : '?'}`,
          `Status: ${t.amortization_status ?? 'active'}`,
          `Excluded from totals: ${t.excluded_from_totals === true ? 'Yes' : 'No'}`
        ];
        if (t.amortization_adjusted_months != null) parts.push(`Adjusted months: ${t.amortization_adjusted_months}`);
        if (t.notes) parts.push(`Notes: ${String(t.notes).slice(0, 80)}`);
        return parts.join(' | ');
      }).join('\n');

  // Recent transactions with full parameters
  const sorted = [...transactions].sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));
  const recent = sorted.slice(0, 80).map((t) => {
    const cat = [t.main_category, t.sub_category].filter(Boolean).join(' → ') || 'Uncategorized';
    const type = t.transaction_type === 'income' ? 'INCOME' : 'EXPENSE';
    const parts = [
      t.transaction_date || '?',
      (t.merchant || 'Unknown').slice(0, 35),
      fmt(t.amount || 0),
      cat,
      type
    ];
    if (t.is_exceptional) parts.push('EXCEPTIONAL');
    if (t.is_auto_tagged) parts.push('auto-tagged');
    if (t.notes) parts.push(`notes: ${String(t.notes).slice(0, 50)}`);
    if (t.is_amortized) {
      parts.push(`amortized: ${t.amortization_months ?? '?'}mo from ${t.amortization_start_date || '?'}, ${t.amortization_monthly_amount != null ? fmt(t.amortization_monthly_amount) + '/mo' : '?'}`);
      if (t.excluded_from_totals) parts.push('excluded_from_totals');
    }
    if (t.upload_id) parts.push(`upload: ${t.upload_id}`);
    return parts.join(' | ');
  }).join('\n');

  return `
FINANCIAL SUMMARY (Last 24 months)
Total Income: ${fmt(totalIncome)}
Total Expenses: ${fmt(totalExpenses)}
Net Balance: ${fmt(balance)}

MONTHLY BREAKDOWN:
${monthlyText || 'No data'}

EXPENSES BY CATEGORY BY MONTH (use for "spending in [Month Year]" or "categories for June 2025"):
${monthlyCategoryLines || 'No data'}

EXPENSES BY CATEGORY – OVERALL:
${topCategories || 'No categories'}

AMORTIZED TRANSACTIONS (full parameters per row):
${amortizedLines}

TRANSACTIONS SAMPLE (80 rows with full parameters: category, sub_category, notes, is_exceptional, is_auto_tagged, amortization, upload_id):
${recent || 'None'}

DATA GLOSSARY: transaction_date, merchant, amount, main_category, sub_category, transaction_type; notes; is_exceptional, is_auto_tagged; is_amortized, amortization_months, amortization_start_date, amortization_monthly_amount, amortization_status, excluded_from_totals; upload_id.
`.trim();
}

module.exports = { formatTransactionsForAI };
