const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const { formatTransactionsForAI } = require('./formatTransactionsForAI');
const FINANCIAL_ADVISOR_PROMPT = require('./FINANCIAL_ADVISOR_PROMPT');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function fetchUserTransactions(accessToken, userId) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 24); // 24 months so full prior year + current year
  const from = fromDate.toISOString().slice(0, 10);
  const to = toDate.toISOString().slice(0, 10);

  let all = [];
  let fromRow = 0;
  const pageSize = 1000;

  while (true) {
    let q = supabase
      .from('expenses')
      .select('id, transaction_date, merchant, amount, main_category, sub_category, transaction_type, is_exceptional')
      .eq('user_id', userId)
      .gte('transaction_date', from)
      .lte('transaction_date', to)
      .order('transaction_date', { ascending: false })
      .range(fromRow, fromRow + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    fromRow += pageSize;
  }

  return all;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured. Set ANTHROPIC_API_KEY.' });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase not configured.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { message, conversationHistory = [], userId, accessToken } = body;
  if (!message || !userId) {
    return res.status(400).json({ error: 'message and userId are required' });
  }

  try {
    const transactions = await fetchUserTransactions(accessToken || null, userId);
    const summary = formatTransactionsForAI(transactions);

    const Client = Anthropic.default || Anthropic;
    const client = new Client({ apiKey });
    const systemContent = `${FINANCIAL_ADVISOR_PROMPT}\n\nBelow is the user's transaction summary. Use it to answer their question. Do not output the raw summary.\n\n---\n${summary}`;

    const messages = [
      ...conversationHistory.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemContent,
      messages,
    });

    const text = response.content && response.content[0] && response.content[0].text ? response.content[0].text : '';
    return res.status(200).json({ answer: text });
  } catch (err) {
    console.error('Chat API error:', err);
    const message = err.message || 'Failed to get AI response';
    return res.status(500).json({ error: message });
  }
}
