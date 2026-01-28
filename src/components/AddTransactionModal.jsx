import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AddTransactionModal({ isOpen, onClose, onSuccess }) {
  const [transactions, setTransactions] = useState([createEmptyTransaction()]);
  const [categories, setCategories] = useState({ mains: [], subs: {} });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);
  
  async function fetchCategories() {
    const { data: user } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('expense_categories')
      .select('main_category, sub_category')
      .eq('user_id', user.user.id)
      .order('main_category')
      .order('sub_category');
    
    if (error) return;
    
    const mains = [...new Set(data.map(c => c.main_category))];
    const subs = data.reduce((acc, cat) => {
      if (cat.sub_category) {
        if (!acc[cat.main_category]) acc[cat.main_category] = [];
        acc[cat.main_category].push(cat.sub_category);
      }
      return acc;
    }, {});
    
    setCategories({ mains, subs });
  }
  
  function createEmptyTransaction() {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: Date.now() + Math.random(),
      transaction_type: 'expense',
      transaction_date: today,
      merchant: '',
      income_source: 'Salary',
      amount: '',
      main_category: '',
      sub_category: '',
      notes: '',
      is_exceptional: false
    };
  }
  
  function addTransaction() {
    setTransactions([...transactions, createEmptyTransaction()]);
  }
  
  function removeTransaction(id) {
    if (transactions.length === 1) return; // Keep at least one
    setTransactions(transactions.filter(t => t.id !== id));
  }
  
  function updateTransaction(id, field, value) {
    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  }
  
  function validateTransactions() {
    const errors = [];
    
    transactions.forEach((t, index) => {
      const num = index + 1;
      
      if (!t.transaction_date) {
        errors.push(`Transaction ${num}: Date required`);
      }
      
      if (t.transaction_type === 'expense') {
        if (!t.merchant || t.merchant.trim() === '') {
          errors.push(`Transaction ${num}: Merchant required`);
        }
        if (!t.main_category) {
          errors.push(`Transaction ${num}: Category required`);
        }
      } else {
        // Income validation
        if (t.income_source === 'Other' && (!t.merchant || t.merchant.trim() === '')) {
          errors.push(`Transaction ${num}: Income source description required`);
        }
      }
      
      if (!t.amount || parseFloat(t.amount) <= 0) {
        errors.push(`Transaction ${num}: Valid amount required`);
      }
      
      // Check for potential duplicates
      const duplicates = transactions.filter(other => 
        other.id !== t.id &&
        other.transaction_date === t.transaction_date &&
        other.merchant === t.merchant &&
        parseFloat(other.amount) === parseFloat(t.amount)
      );
      
      if (duplicates.length > 0) {
        errors.push(`Transaction ${num}: Possible duplicate detected (same date, merchant, amount)`);
      }
    });
    
    return errors;
  }
  
  async function handleSave() {
    const errors = validateTransactions();
    
    if (errors.length > 0) {
      alert('Please fix the following:\n\n• ' + errors.join('\n• '));
      return;
    }
    
    setSaving(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const expensesToInsert = transactions.map(t => {
        const baseData = {
          user_id: user.user.id,
          transaction_date: t.transaction_date,
          amount: parseFloat(t.amount),
          transaction_type: t.transaction_type,
          notes: t.notes || null,
          is_exceptional: t.is_exceptional,
          is_auto_tagged: false
        };
        
        if (t.transaction_type === 'expense') {
          return {
            ...baseData,
            merchant: t.merchant.trim(),
            main_category: t.main_category || null,
            sub_category: t.sub_category || null
          };
        } else {
          // Income
          const source = t.income_source === 'Other' ? t.merchant.trim() : t.income_source;
          return {
            ...baseData,
            merchant: source,
            main_category: null,
            sub_category: null
          };
        }
      });
      
      const { error } = await supabase
        .from('expenses')
        .insert(expensesToInsert);
      
      if (error) throw error;
      
      // Count income vs expense
      const incomeCount = transactions.filter(t => t.transaction_type === 'income').length;
      const expenseCount = transactions.filter(t => t.transaction_type === 'expense').length;
      
      // Success callback with counts
      onSuccess({ 
        total: transactions.length,
        income: incomeCount,
        expense: expenseCount
      });
      
      setTransactions([createEmptyTransaction()]);
      onClose();
      
    } catch (error) {
      console.error('Error saving transactions:', error);
      alert('Failed to save transactions: ' + error.message);
    } finally {
      setSaving(false);
    }
  }
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Transactions Manually</h2>
            <p className="text-sm text-gray-600 mt-1">Enter one or more transactions</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {transactions.map((transaction, index) => (
              <TransactionForm
                key={transaction.id}
                transaction={transaction}
                index={index}
                categories={categories}
                canDelete={transactions.length > 1}
                onUpdate={updateTransaction}
                onDelete={removeTransaction}
              />
            ))}
          </div>
          
          {/* Add Another Button */}
          <button
            onClick={addTransaction}
            className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-teal-500 hover:text-teal-700 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add Another Transaction
          </button>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} to save
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save {transactions.length} Transaction{transactions.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionForm({ transaction, index, categories, canDelete, onUpdate, onDelete }) {
  const isIncome = transaction.transaction_type === 'income';
  const showOtherInput = isIncome && transaction.income_source === 'Other';
  
  return (
    <div className={`border-2 rounded-lg p-4 transition-colors ${
      isIncome 
        ? 'border-green-200 bg-green-50/30' 
        : 'border-gray-200 hover:border-teal-300'
    }`}>
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">
          Transaction #{index + 1}
        </span>
        {canDelete && (
          <button
            onClick={() => onDelete(transaction.id)}
            className="text-red-600 hover:text-red-700 p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Transaction Type Selector */}
      <div className="mb-4 pb-3 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`type-${transaction.id}`}
              value="expense"
              checked={!isIncome}
              onChange={(e) => onUpdate(transaction.id, 'transaction_type', 'expense')}
              className="w-4 h-4 text-red-600"
            />
            <span className="text-sm font-semibold text-gray-900">
              💸 Expense
            </span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`type-${transaction.id}`}
              value="income"
              checked={isIncome}
              onChange={(e) => onUpdate(transaction.id, 'transaction_type', 'income')}
              className="w-4 h-4 text-green-600"
            />
            <span className="text-sm font-semibold text-gray-900">
              💰 Income
            </span>
          </label>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={transaction.transaction_date}
            onChange={(e) => onUpdate(transaction.id, 'transaction_date', e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            required
          />
        </div>
        
        {/* Merchant / Income Source */}
        {isIncome ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Source <span className="text-red-600">*</span>
              </label>
              <select
                value={transaction.income_source}
                onChange={(e) => onUpdate(transaction.id, 'income_source', e.target.value)}
                className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-white"
              >
                <option value="Salary">💼 Salary</option>
                <option value="Other">📝 Other (specify)</option>
              </select>
            </div>
            
            {showOtherInput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specify Source <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={transaction.merchant}
                  onChange={(e) => onUpdate(transaction.id, 'merchant', e.target.value)}
                  placeholder="e.g., Freelance project"
                  className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200"
                  required
                />
              </div>
            )}
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={transaction.merchant}
              onChange={(e) => onUpdate(transaction.id, 'merchant', e.target.value)}
              placeholder="e.g., Rami Levy"
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              required
            />
          </div>
        )}
        
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₪) <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="999999.99"
            value={transaction.amount}
            onChange={(e) => onUpdate(transaction.id, 'amount', e.target.value)}
            placeholder="0.00"
            className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 ${
              isIncome
                ? 'border-green-300 focus:border-green-500 focus:ring-green-200'
                : 'border-gray-300 focus:border-teal-500 focus:ring-teal-200'
            }`}
            required
          />
        </div>
        
        {/* Categories - Only for Expenses */}
        {!isIncome && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Main Category <span className="text-red-600">*</span>
              </label>
              <select
                value={transaction.main_category}
                onChange={(e) => {
                  onUpdate(transaction.id, 'main_category', e.target.value);
                  onUpdate(transaction.id, 'sub_category', '');
                }}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-white"
                required
              >
                <option value="">Select...</option>
                {categories.mains.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Category
              </label>
              <select
                value={transaction.sub_category}
                onChange={(e) => onUpdate(transaction.id, 'sub_category', e.target.value)}
                disabled={!transaction.main_category}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select...</option>
                {transaction.main_category && categories.subs[transaction.main_category]?.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </>
        )}
        
        {/* Notes */}
        <div className={!isIncome ? 'md:col-span-3' : 'md:col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <input
            type="text"
            value={transaction.notes}
            onChange={(e) => onUpdate(transaction.id, 'notes', e.target.value)}
            placeholder="Optional note..."
            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
        </div>
      </div>
      
      {/* Exceptional checkbox */}
      <div className="mt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={transaction.is_exceptional}
            onChange={(e) => onUpdate(transaction.id, 'is_exceptional', e.target.checked)}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700">
            Mark as exceptional (one-time {isIncome ? 'income' : 'expense'})
          </span>
        </label>
      </div>
    </div>
  );
}
