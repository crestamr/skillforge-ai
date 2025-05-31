"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
  suggestions?: string[]
}

interface ConversationContext {
  id: string
  name: string
  description: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [contexts, setContexts] = useState<ConversationContext[]>([])
  const [selectedContext, setSelectedContext] = useState("career_guidance")
  const [isStarted, setIsStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Load conversation contexts
    loadContexts()
  }, [])

  const loadContexts = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/chat/contexts")
      const data = await response.json()
      setContexts(data.contexts)
    } catch (error) {
      console.error("Error loading contexts:", error)
    }
  }

  const startConversation = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:8000/api/v1/chat/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: "demo_user",
          context: selectedContext,
          user_profile: {
            name: "Demo User",
            experience_years: 5,
            skills: [
              { skill: "Python", category: "programming" },
              { skill: "React", category: "frontend" },
              { skill: "PostgreSQL", category: "database" }
            ],
            career_level: "senior"
          }
        })
      })

      const data = await response.json()
      setSessionId(data.session_id)
      setMessages([{
        role: "assistant",
        content: data.greeting,
        timestamp: data.timestamp,
        suggestions: data.suggestions
      }])
      setIsStarted(true)
    } catch (error) {
      console.error("Error starting conversation:", error)
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !sessionId || loading) return

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setLoading(true)

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: inputMessage,
          context: selectedContext
        })
      })

      const data = await response.json()
      
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: data.timestamp,
        suggestions: data.suggestions
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your message right now. Please try again.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    }
    setLoading(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const resetConversation = () => {
    setMessages([])
    setSessionId(null)
    setIsStarted(false)
    setInputMessage("")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🎯</span>
              <span className="text-xl font-bold">SkillForge AI</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/" className="text-gray-500 hover:text-gray-700">Home</Link>
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">Dashboard</Link>
              <Link href="/demo" className="text-gray-500 hover:text-gray-700">Demo</Link>
              <span className="text-blue-600 font-medium">AI Coach</span>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Career Coach</h1>
          <p className="text-gray-600">Get personalized career guidance from our advanced AI coach</p>
        </div>

        {!isStarted ? (
          /* Conversation Setup */
          <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold mb-2">Start Your Coaching Session</h2>
              <p className="text-gray-600">Choose a topic to get personalized career guidance</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation Topic
              </label>
              <select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {contexts.map((context) => (
                  <option key={context.id} value={context.id}>
                    {context.name}
                  </option>
                ))}
              </select>
              {contexts.find(c => c.id === selectedContext) && (
                <p className="text-sm text-gray-500 mt-1">
                  {contexts.find(c => c.id === selectedContext)?.description}
                </p>
              )}
            </div>

            <button
              onClick={startConversation}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Starting..." : "Start Conversation"}
            </button>
          </div>
        ) : (
          /* Chat Interface */
          <div className="bg-white rounded-lg shadow h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-medium">AI Career Coach</h3>
                <p className="text-sm text-gray-500">
                  {contexts.find(c => c.id === selectedContext)?.name}
                </p>
              </div>
              <button
                onClick={resetConversation}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                New Conversation
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Suggestions */}
              {messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].suggestions && (
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md">
                    <p className="text-xs text-gray-500 mb-2">Suggested responses:</p>
                    <div className="space-y-1">
                      {messages[messages.length - 1].suggestions?.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t">
              <div className="flex space-x-4">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="font-medium mb-2">Intelligent Responses</h3>
            <p className="text-sm text-gray-600">
              Powered by DialoGPT and career expertise for contextual guidance
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-medium mb-2">Personalized Advice</h3>
            <p className="text-sm text-gray-600">
              Tailored recommendations based on your skills and experience
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="font-medium mb-2">Career Growth</h3>
            <p className="text-sm text-gray-600">
              Strategic guidance for advancing your professional development
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
