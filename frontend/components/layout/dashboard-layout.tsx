"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClientOnly } from "@/components/client-only"
import { 
  Menu, 
  X, 
  Home, 
  User, 
  Brain, 
  Target, 
  BookOpen, 
  MessageSquare,
  BarChart3,
  Settings,
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  LogOut
} from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navigation: NavigationItem[] = [
  { name: "Overview", href: "/dashboard", icon: Home },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "Skills", href: "/dashboard/skills", icon: Brain },
  { name: "Job Matching", href: "/dashboard/jobs", icon: Target },
  { name: "Learning", href: "/dashboard/learning", icon: BookOpen },
  { name: "AI Coach", href: "/chat", icon: MessageSquare, badge: "New" },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState(3)
  const pathname = usePathname()

  // Initialize dark mode from system preference
  useEffect(() => {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // Check for saved preference first
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        const isDark = savedTheme === 'dark'
        setDarkMode(isDark)
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      } else {
        // Fall back to system preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setDarkMode(isDark)
        if (isDark) {
          document.documentElement.classList.add('dark')
        }
      }
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)

    if (typeof window !== 'undefined') {
      if (newDarkMode) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }
  }

  const isCurrentPage = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🎯</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">SkillForge AI</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const current = isCurrentPage(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    current
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-3 h-5 w-5 ${current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Quick Actions */}
        <div className="mt-auto p-3 border-t border-gray-200 dark:border-gray-700">
          <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              📄 Upload Resume
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              🎯 Find Jobs
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              📚 Start Learning
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search skills, jobs, courses..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Dark mode toggle */}
              <ClientOnly fallback={
                <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Moon className="h-5 w-5" />
                </button>
              }>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </ClientOnly>

              {/* Notifications */}
              <button className="relative p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800" />
                )}
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">JD</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">John Doe</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">john@example.com</p>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link
                        href="/dashboard/profile"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Your Profile
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LogOut className="inline h-4 w-4 mr-2" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumbs */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8 py-3">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <Link href="/dashboard" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    Dashboard
                  </Link>
                </li>
                {pathname !== "/dashboard" && (
                  <>
                    <span className="text-gray-400">/</span>
                    <li className="text-gray-900 dark:text-white font-medium">
                      {pathname.split('/').pop()?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </li>
                  </>
                )}
              </ol>
            </nav>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Notification center (hidden by default) */}
      <div className="hidden fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl z-40">
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Notification items would go here */}
          </div>
        </div>
      </div>
    </div>
  )
}
