"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Simplified icons using emojis
const icons = {
  brain: "🧠",
  target: "🎯",
  book: "📚",
  users: "👥",
  zap: "⚡",
  trending: "📈",
  arrow: "→",
  check: "✅",
  star: "⭐",
  sparkles: "✨"
}

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{icons.target}</span>
            <span className="text-xl font-bold">SkillForge AI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/features" className="text-sm font-medium hover:text-blue-600">Features</Link>
            <Link href="/pricing" className="text-sm font-medium hover:text-blue-600">Pricing</Link>
            <Link href="/about" className="text-sm font-medium hover:text-blue-600">About</Link>
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="mb-6">
              <Badge variant="outline" className="mb-4">
                <span className="mr-2">{icons.sparkles}</span>
                Powered by Advanced AI
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SkillForge AI
              </span>
              <br />
              <span className="text-gray-900 dark:text-white">
                Intelligent Career Development
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Transform your career with AI-powered skill assessment, personalized learning paths,
              and intelligent job matching. Your future starts here.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="text-lg px-8 py-6" asChild>
                <Link href="/dashboard">
                  Get Started Free
                  <span className="ml-2">{icons.arrow}</span>
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" asChild>
                <Link href="/demo">
                  Watch Demo
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-500">{icons.check}</span>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">{icons.check}</span>
                Free forever plan
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">{icons.check}</span>
                Setup in 2 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powered by Advanced AI Technology
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our cutting-edge AI models provide personalized insights and recommendations
              to accelerate your career growth.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {[
              {
                icon: icons.brain,
                title: "AI Skill Assessment",
                description: "Advanced NLP models analyze your resume and experience to provide comprehensive skill evaluation.",
                features: ["Resume parsing", "Skill gap analysis", "Confidence scoring", "Industry benchmarking"]
              },
              {
                icon: icons.target,
                title: "Intelligent Job Matching",
                description: "Semantic search algorithms match you with opportunities based on skills and career goals.",
                features: ["Semantic matching", "Market analysis", "Salary insights", "Location preferences"]
              },
              {
                icon: icons.book,
                title: "Personalized Learning",
                description: "AI-generated learning paths adapt to your goals and industry trends.",
                features: ["Custom paths", "Progress tracking", "Skill recommendations", "Industry trends"]
              },
              {
                icon: icons.users,
                title: "Career Coaching",
                description: "24/7 AI career coach provides personalized advice and strategic guidance.",
                features: ["Personalized advice", "Interview prep", "Career strategy", "Goal setting"]
              },
              {
                icon: icons.trending,
                title: "Market Intelligence",
                description: "Real-time analysis of job market trends and salary data.",
                features: ["Market trends", "Salary benchmarks", "Skill demand", "Industry insights"]
              },
              {
                icon: icons.zap,
                title: "Portfolio Analysis",
                description: "Computer vision models analyze your projects to extract skills.",
                features: ["Project analysis", "Skill extraction", "Portfolio optimization", "Impact measurement"]
              }
            ].map((feature, index) => (
              <div key={index}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 text-2xl">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item, i) => (
                        <li key={i} className="flex items-center text-sm">
                          <span className="text-green-500 mr-2">{icons.check}</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Development Status */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">Development Environment Status</h3>
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Backend API: Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>AI Services: Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Job Matching: Operational</span>
            </div>
          </div>
          <div className="mt-6 space-x-4">
            <Button variant="outline" asChild>
              <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer">
                Backend API Docs
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="http://localhost:8001/docs" target="_blank" rel="noopener noreferrer">
                AI Services Docs
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-2xl">{icons.target}</span>
                <span className="text-lg font-bold">SkillForge AI</span>
              </div>
              <p className="text-gray-400 text-sm">
                Intelligent career development platform powered by advanced AI technology.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/demo" className="hover:text-white">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white">API</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 SkillForge AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
