import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Tags } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchAllCategories } from '../utils/fetchAllRows'

const CategoryManagement = () => {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [addingMain, setAddingMain] = useState(false)
  const [addingSub, setAddingSub] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  const fetchCategories = async () => {
    if (!user) return
    setIsLoading(true)
    setError('')

    try {
      const data = await fetchAllCategories(supabase, user.id)
      const grouped = (data || []).reduce((acc, row) => {
      if (!acc[row.main_category]) {
        acc[row.main_category] = {
          main: row.main_category,
          mainRowId: row.sub_category ? null : row.id,
          subs: [],
        }
      }
      if (row.sub_category) {
        acc[row.main_category].subs.push({
          id: row.id,
          name: row.sub_category,
          isDefault: row.is_default,
        })
      }
      return acc
    }, {})

      setCategories(Object.values(grouped))
    } catch (fetchError) {
      setError(fetchError.message || 'Failed to fetch categories')
      setCategories([])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [user])

  const handleAddMainCategory = async () => {
    if (!user || !newCategoryName.trim()) return
    const name = newCategoryName.trim()
    const { error: insertError } = await supabase
      .from('expense_categories')
      .insert({
        user_id: user.id,
        main_category: name,
        sub_category: null,
        display_order: categories.length + 1,
      })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setNewCategoryName('')
    setAddingMain(false)
    fetchCategories()
  }

  const handleAddSubCategory = async (mainCategory) => {
    if (!user || !newCategoryName.trim()) return
    const name = newCategoryName.trim()
    const { error: insertError } = await supabase
      .from('expense_categories')
      .insert({
        user_id: user.id,
        main_category: mainCategory,
        sub_category: name,
      })

    if (insertError) {
      setError(insertError.message)
      return
    }

    setNewCategoryName('')
    setAddingSub(null)
    fetchCategories()
  }

  const handleEditCategory = async () => {
    if (!user || !editing || !editValue.trim()) return
    const newName = editValue.trim()

    if (editing.type === 'main') {
      const { error: updateError } = await supabase
        .from('expense_categories')
        .update({ main_category: newName })
        .eq('user_id', user.id)
        .eq('main_category', editing.mainCategory)

      if (updateError) {
        setError(updateError.message)
        return
      }

      const { error: expensesError } = await supabase
        .from('expenses')
        .update({ main_category: newName })
        .eq('user_id', user.id)
        .eq('main_category', editing.mainCategory)

      if (expensesError) {
        setError(expensesError.message)
        return
      }
    } else {
      const { error: updateError } = await supabase
        .from('expense_categories')
        .update({ sub_category: newName })
        .eq('id', editing.id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      const { error: expensesError } = await supabase
        .from('expenses')
        .update({ sub_category: newName })
        .eq('user_id', user.id)
        .eq('main_category', editing.mainCategory)
        .eq('sub_category', editing.subCategory)

      if (expensesError) {
        setError(expensesError.message)
        return
      }
    }

    setEditing(null)
    setEditValue('')
    fetchCategories()
  }

  const handleDeleteCategory = async (target) => {
    if (!user) return
    setError('')

    if (target.type === 'main') {
      const { data: expensesUsing } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', user.id)
        .eq('main_category', target.mainCategory)
        .limit(1)

      if (expensesUsing?.length) {
        setError('Cannot delete a main category that is used by expenses.')
        return
      }

      if (!window.confirm(`Delete "${target.mainCategory}" and all its sub-categories?`)) return

      const { error: deleteError } = await supabase
        .from('expense_categories')
        .delete()
        .eq('user_id', user.id)
        .eq('main_category', target.mainCategory)

      if (deleteError) {
        setError(deleteError.message)
        return
      }
    } else {
      const { data: expensesUsing } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', user.id)
        .eq('main_category', target.mainCategory)
        .eq('sub_category', target.subCategory)
        .limit(1)

      if (expensesUsing?.length) {
        setError('Cannot delete a sub-category that is used by expenses.')
        return
      }

      if (!window.confirm(`Delete "${target.subCategory}"?`)) return

      const { error: deleteError } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', target.id)

      if (deleteError) {
        setError(deleteError.message)
        return
      }
    }

    fetchCategories()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
        <p className="text-gray-600 mt-1">Customize your expense categories</p>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-48" />
      ) : categories.length === 0 ? (
        <>
          <div className="card text-center py-12">
            <Tags className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-600 mb-4">Add your first main category to start organizing expenses.</p>
            <button
              onClick={() => setAddingMain(true)}
              className="btn-primary inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              Add first category
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            {addingMain && (
              <div className="card flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New main category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal focus:border-teal"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMainCategory()
                    if (e.key === 'Escape') setAddingMain(false)
                  }}
                />
                <button onClick={handleAddMainCategory} className="btn-primary">
                  Add Category
                </button>
                <button
                  onClick={() => { setAddingMain(false); setNewCategoryName('') }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.main} className="border-b border-gray-200 pb-6 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {editing?.type === 'main' && editing.mainCategory === category.main ? (
                      <>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-3 py-1 border rounded-md"
                          autoFocus
                        />
                        <button
                          onClick={handleEditCategory}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900">{category.main}</h3>
                        <button
                          onClick={() => {
                            setEditing({ type: 'main', mainCategory: category.main })
                            setEditValue(category.main)
                          }}
                          className="p-1 text-gray-400 hover:text-teal rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory({ type: 'main', mainCategory: category.main })}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setAddingSub(category.main)}
                    className="text-sm text-teal hover:text-teal-600 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Sub-category
                  </button>
                </div>

                <div className="ml-6 space-y-2">
                  {category.subs.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg">
                      {editing?.type === 'sub' && editing.id === sub.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-3 py-1 border rounded-md"
                            autoFocus
                          />
                          <button
                            onClick={handleEditCategory}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-700">{sub.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditing({
                                  type: 'sub',
                                  id: sub.id,
                                  mainCategory: category.main,
                                  subCategory: sub.name,
                                })
                                setEditValue(sub.name)
                              }}
                              className="p-1 text-gray-400 hover:text-teal rounded"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory({
                                type: 'sub',
                                id: sub.id,
                                mainCategory: category.main,
                                subCategory: sub.name,
                              })}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {addingSub === category.main && (
                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="text"
                        placeholder="New sub-category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSubCategory(category.main)
                          if (e.key === 'Escape') setAddingSub(null)
                        }}
                      />
                      <button
                        onClick={() => handleAddSubCategory(category.main)}
                        className="px-3 py-2 bg-teal text-white rounded-md hover:bg-teal-600"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingSub(null)
                          setNewCategoryName('')
                        }}
                        className="px-3 py-2 border rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            {addingMain ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New main category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMainCategory()
                    if (e.key === 'Escape') setAddingMain(false)
                  }}
                />
                <button
                  onClick={handleAddMainCategory}
                  className="px-4 py-2 bg-teal text-white rounded-md hover:bg-teal-600"
                >
                  Add Category
                </button>
                <button
                  onClick={() => {
                    setAddingMain(false)
                    setNewCategoryName('')
                  }}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingMain(true)}
                className="flex items-center gap-2 text-teal hover:text-teal-600 font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Main Category
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
    </div>
  )
}

export default CategoryManagement
