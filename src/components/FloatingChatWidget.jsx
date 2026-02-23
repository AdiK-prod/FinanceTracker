import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const SUGGESTED_QUESTIONS = [
  'Where can I save money this month?',
  'Why is my spending higher than last month?',
  'What are my biggest expenses?',
  'Do I have any unused subscriptions?',
  'How much do I spend on dining vs groceries?',
  'Analyze my necessity vs luxury spending',
]

const TypingIndicator = () => (
  <div className="flex items-end gap-2 mb-4">
    <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-black text-white">AI</span>
    </div>
    <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
      <div className="flex gap-1 items-center h-4">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
)

const Message = ({ msg }) => {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-white">AI</span>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function FloatingChatWidget() {
  const { user, session } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasStarted, setHasStarted] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      // Small delay to let the widget animate open before focusing
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages])

  if (!user) return null

  const sendMessage = async (text) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    setError('')
    setInput('')
    setHasStarted(true)

    const userMessage = { role: 'user', content: messageText }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      // Get the current session access token
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      const accessToken = currentSession?.access_token

      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      // Build conversation history to send (all previous turns, not including current user message)
      // The API appends the current user message itself
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationHistory,
          userId: user.id,
          accessToken
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${response.status}`)
      }

      const data = await response.json()
      const assistantMessage = { role: 'assistant', content: data.answer }
      setMessages([...updatedMessages, assistantMessage])
    } catch (err) {
      console.error('Chat error:', err)
      setError(err.message || 'Failed to get response. Please try again.')
      // Remove the optimistic user message on error
      setMessages(messages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleOpen = () => {
    setIsOpen(true)
  }

  return (
    <>
      {/* Floating bubble button */}
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        }`}
        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
        aria-label="Open financial advisor chat"
      >
        <MessageCircle size={24} className="text-white" />
      </button>

      {/* Chat overlay */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-75 pointer-events-none'
        } w-[calc(100vw-3rem)] max-w-[400px] h-[600px] max-h-[calc(100vh-7rem)] sm:w-[400px]`}
        style={{ border: '1px solid #e5e7eb' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xs font-black text-white">AI</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Financial Insights</p>
              <p className="text-xs text-blue-200 leading-tight">Powered by Claude</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus:outline-none"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {/* Welcome message */}
          {!hasStarted && messages.length === 0 && (
            <div className="mb-4">
              <div className="flex items-end gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white">AI</span>
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-800 max-w-[80%]">
                  Hi! I'm your financial advisor. I can analyze your spending, spot patterns, and help you save money. What would you like to know?
                </div>
              </div>

              {/* Suggested questions */}
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2 ml-9">Try asking:</p>
                <div className="flex flex-col gap-2 ml-9">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation messages */}
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {/* Loading indicator */}
          {isLoading && <TypingIndicator />}

          {/* Error message */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-3 pb-3 pt-2 border-t border-gray-100">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:opacity-50 leading-normal"
              style={{ maxHeight: '100px', overflowY: 'auto' }}
              onInput={(e) => {
                // Auto-resize textarea
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
              aria-label="Send message"
            >
              <Send size={15} className="text-white" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">
            Analyzes your last 6 months of transactions
          </p>
        </div>
      </div>
    </>
  )
}
