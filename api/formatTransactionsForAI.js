/**
 * Format transaction list into a text summary for Claude.
 * Used by /api/chat serverless function.
 */
function formatTransactionsForAI(transactions) {
  if (!transactions || transactions.length === 0) {
    return 'No transactions in the last 6 months.';
  }

  const income = transactions.filter((t) => t.transaction_type === 'income');
  const expenses = transactions.filter((t) => t.transaction_type === 'expense');
  const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const fmt = (n) => `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 2 })}`;

  // Monthly breakdown (last 6 months, most recent first)
  const byMonth = {};
  transactions.forEach((t) => {
    const d = (t.transaction_date || '').toString().slice(0, 7);
    if (!d) return;
    if (!byMonth[d]) byMonth[d] = { income: 0, expenses: 0 };
    if (t.transaction_type === 'income') byMonth[d].income += t.amount || 0;
    else byMonth[d].expenses += t.amount || 0;
  });
  const months = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);

  let monthlyText = months
    .map(([ym, v]) => {
      const [y, m] = ym.split('-');
      const monthName = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
      return `${monthName}: Income ${fmt(v.income)}, Expenses ${fmt(v.expenses)}, Balance ${fmt(v.income - v.expenses)}`;
    })
    .join('\n');

  // Top categories (expenses only): "Main → Sub: total (avg/month)"
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

  // Recent 50 transactions
  const sorted = [...transactions].sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''));
  const recent = sorted.slice(0, 50).map((t) => {
    const cat = [t.main_category, t.sub_category].filter(Boolean).join(' → ') || 'Uncategorized';
    const type = t.transaction_type === 'income' ? 'INCOME' : 'EXPENSE';
    return `${t.transaction_date || '?'} | ${(t.merchant || 'Unknown').slice(0, 40)} | ${fmt(t.amount)} | ${cat} | ${type}`;
  }).join('\n');

  return `
FINANCIAL SUMMARY (Last 6 months)
Total Income: ${fmt(totalIncome)}
Total Expenses: ${fmt(totalExpenses)}
Net Balance: ${fmt(balance)}

MONTHLY BREAKDOWN:
${monthlyText || 'No data'}

EXPENSES BY CATEGORY:
${topCategories || 'No categories'}

RECENT TRANSACTIONS (Last 50):
${recent || 'None'}
`.trim();
}

module.exports = { formatTransactionsForAI };
