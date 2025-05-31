"use client"

import { useState } from "react"
import Link from "next/link"
import { ImprovedDashboardLayout } from "@/components/layout/improved-dashboard-layout"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <ImprovedDashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Welcome back! Here's what's happening with your career development.</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("skills")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "skills"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Skills
              </button>
              <button
                onClick={() => setActiveTab("jobs")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "jobs"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Job Matching
              </button>
              <button
                onClick={() => setActiveTab("ai")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "ai"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                AI Services
              </button>
            </nav>
          </div>
        </div>
        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-8">

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🧠</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Skills Analyzed</p>
                    <p className="text-2xl font-bold text-gray-900">24</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🎯</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Job Matches</p>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">📈</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Skill Score</p>
                    <p className="text-2xl font-bold text-gray-900">85%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">🚀</div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                    <p className="text-2xl font-bold text-gray-900">+15%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">✅</div>
                    <div>
                      <p className="text-sm font-medium">Resume analyzed successfully</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🎯</div>
                    <div>
                      <p className="text-sm font-medium">New job matches found</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📚</div>
                    <div>
                      <p className="text-sm font-medium">Learning path updated</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Skill Assessment</h1>
              <p className="mt-2 text-gray-600">AI-powered analysis of your technical and soft skills</p>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium mb-4">Technical Skills</h3>
                <div className="space-y-4">
                  {[
                    { name: "Python", level: 90, category: "Programming" },
                    { name: "React", level: 85, category: "Frontend" },
                    { name: "PostgreSQL", level: 75, category: "Database" },
                    { name: "AWS", level: 70, category: "Cloud" },
                  ].map((skill, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{skill.name}</span>
                        <span className="text-sm text-gray-500">{skill.level}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${skill.level}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{skill.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium mb-4">Soft Skills</h3>
                <div className="space-y-4">
                  {[
                    { name: "Leadership", level: 80, category: "Management" },
                    { name: "Communication", level: 85, category: "Interpersonal" },
                    { name: "Problem Solving", level: 90, category: "Analytical" },
                    { name: "Teamwork", level: 88, category: "Collaboration" },
                  ].map((skill, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{skill.name}</span>
                        <span className="text-sm text-gray-500">{skill.level}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${skill.level}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{skill.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Skill Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Recommended Skills to Learn</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: "Kubernetes", demand: "High", timeToLearn: "2-3 months" },
                  { name: "Machine Learning", demand: "Very High", timeToLearn: "4-6 months" },
                  { name: "TypeScript", demand: "High", timeToLearn: "1-2 months" },
                ].map((skill, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium">{skill.name}</h4>
                    <p className="text-sm text-gray-600">Market Demand: {skill.demand}</p>
                    <p className="text-sm text-gray-600">Time to Learn: {skill.timeToLearn}</p>
                    <button className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      Start Learning
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Matching</h1>
              <p className="mt-2 text-gray-600">AI-powered job recommendations based on your skills and preferences</p>
            </div>

            {/* Job Matches */}
            <div className="space-y-6">
              {[
                {
                  title: "Senior Full Stack Developer",
                  company: "TechCorp Inc",
                  location: "San Francisco, CA",
                  salary: "$120k - $160k",
                  match: 95,
                  skills: ["Python", "React", "PostgreSQL"],
                  type: "Full-time"
                },
                {
                  title: "Python Developer",
                  company: "DataTech Solutions",
                  location: "Remote",
                  salary: "$100k - $140k",
                  match: 88,
                  skills: ["Python", "SQL", "AWS"],
                  type: "Full-time"
                },
                {
                  title: "Frontend React Developer",
                  company: "StartupXYZ",
                  location: "New York, NY",
                  salary: "$95k - $125k",
                  match: 82,
                  skills: ["React", "JavaScript", "CSS"],
                  type: "Full-time"
                },
              ].map((job, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{job.title}</h3>
                      <p className="text-gray-600">{job.company}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span>📍 {job.location}</span>
                        <span>💰 {job.salary}</span>
                        <span>⏰ {job.type}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.skills.map((skill, skillIndex) => (
                          <span
                            key={skillIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-6 text-right">
                      <div className="text-2xl font-bold text-green-600">{job.match}%</div>
                      <div className="text-sm text-gray-500">Match</div>
                      <button className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Services</h1>
              <p className="mt-2 text-gray-600">Explore our AI-powered career development tools</p>
            </div>

            {/* AI Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-4xl mb-4">🧠</div>
                <h3 className="text-lg font-medium mb-2">Resume Analysis</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Upload your resume for AI-powered analysis and skill extraction
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Analyze Resume
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-medium mb-2">Job Matching</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Find jobs that match your skills using semantic search algorithms
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Find Jobs
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-lg font-medium mb-2">Career Coach</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get personalized career advice from our AI coach
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Chat with AI
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">Market Analysis</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Analyze job market trends and salary insights
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  View Trends
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-medium mb-2">Learning Paths</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get personalized learning recommendations
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Create Path
                </button>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-lg font-medium mb-2">Portfolio Analysis</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Analyze your projects and portfolio with computer vision
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Analyze Portfolio
                </button>
              </div>
            </div>

            {/* API Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">API Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Backend API</p>
                    <p className="text-sm text-gray-500">Operational</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">AI Services</p>
                    <p className="text-sm text-gray-500">Ready</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium">Job Matching</p>
                    <p className="text-sm text-gray-500">Operational</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-x-4">
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Backend API Docs
                </a>
                <a
                  href="http://localhost:8000/api/v1/ai/status"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  AI Services Status
                </a>
                <a
                  href="http://localhost:8000/api/v1/jobs/status"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  Job Matching Status
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </ImprovedDashboardLayout>
  )
}
