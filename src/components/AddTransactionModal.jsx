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
      transaction_date: today,
      merchant: '',
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
      if (!t.transaction_date) errors.push(`Transaction ${index + 1}: Date required`);
      if (!t.merchant || t.merchant.trim() === '') errors.push(`Transaction ${index + 1}: Merchant required`);
      if (!t.amount || parseFloat(t.amount) <= 0) errors.push(`Transaction ${index + 1}: Valid amount required`);
    });
    
    return errors;
  }
  
  async function handleSave() {
    const errors = validateTransactions();
    
    if (errors.length > 0) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return;
    }
    
    setSaving(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      
      // Prepare transactions for insert
      const expensesToInsert = transactions.map(t => ({
        user_id: user.user.id,
        transaction_date: t.transaction_date,
        merchant: t.merchant.trim(),
        amount: parseFloat(t.amount),
        main_category: t.main_category || null,
        sub_category: t.sub_category || null,
        notes: t.notes || null,
        is_exceptional: t.is_exceptional,
        is_auto_tagged: false
      }));
      
      const { error } = await supabase
        .from('expenses')
        .insert(expensesToInsert);
      
      if (error) throw error;
      
      // Success
      onSuccess();
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
              <div
                key={transaction.id}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-teal-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900">
                    Transaction #{index + 1}
                  </span>
                  {transactions.length > 1 && (
                    <button
                      onClick={() => removeTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={transaction.transaction_date}
                      onChange={(e) => updateTransaction(transaction.id, 'transaction_date', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      required
                    />
                  </div>
                  
                  {/* Merchant */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Merchant *
                    </label>
                    <input
                      type="text"
                      value={transaction.merchant}
                      onChange={(e) => updateTransaction(transaction.id, 'merchant', e.target.value)}
                      placeholder="e.g., Rami Levy"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      required
                    />
                  </div>
                  
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₪) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={transaction.amount}
                      onChange={(e) => updateTransaction(transaction.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      required
                    />
                  </div>
                  
                  {/* Main Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Main Category
                    </label>
                    <select
                      value={transaction.main_category}
                      onChange={(e) => {
                        updateTransaction(transaction.id, 'main_category', e.target.value);
                        updateTransaction(transaction.id, 'sub_category', ''); // Reset sub
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    >
                      <option value="">Select...</option>
                      {categories.mains.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Sub Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sub Category
                    </label>
                    <select
                      value={transaction.sub_category}
                      onChange={(e) => updateTransaction(transaction.id, 'sub_category', e.target.value)}
                      disabled={!transaction.main_category}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select...</option>
                      {transaction.main_category && categories.subs[transaction.main_category]?.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={transaction.notes}
                      onChange={(e) => updateTransaction(transaction.id, 'notes', e.target.value)}
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
                      onChange={(e) => updateTransaction(transaction.id, 'is_exceptional', e.target.checked)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">
                      Mark as exceptional (one-time expense)
                    </span>
                  </label>
                </div>
              </div>
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
