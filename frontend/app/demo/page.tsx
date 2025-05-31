"use client"

import { useState } from "react"
import Link from "next/link"

export default function Demo() {
  const [activeDemo, setActiveDemo] = useState("resume")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleResumeAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/parse-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume_text: `John Doe
Software Engineer
Email: john.doe@example.com
Phone: +1-555-123-4567

Experience:
Senior Software Engineer at Tech Corp (2020-2023)
- Led development of web applications using React and Node.js
- Implemented microservices architecture with Docker and Kubernetes
- Managed team of 5 developers

Education:
Bachelor of Science in Computer Science
University of Technology (2016-2020)

Skills:
Python, JavaScript, React, Node.js, Docker, Kubernetes, AWS`
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error:", error)
      setResult({ error: "Failed to analyze resume" })
    }
    setLoading(false)
  }

  const handleSkillExtraction = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:8000/api/v1/ai/extract-skills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "I am a Python developer with 5 years of experience in Django, React, and PostgreSQL. I have worked with AWS and Docker.",
          max_skills: 10
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error:", error)
      setResult({ error: "Failed to extract skills" })
    }
    setLoading(false)
  }

  const handleJobMatching = async () => {
    setLoading(true)
    try {
      const response = await fetch("http://localhost:8000/api/v1/jobs/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_profile: {
            user_id: "demo_user",
            skills: [
              { skill: "Python", category: "programming_languages", confidence: 0.9 },
              { skill: "React", category: "frameworks", confidence: 0.8 },
              { skill: "PostgreSQL", category: "databases", confidence: 0.7 }
            ],
            experience_years: 5,
            education_level: "Bachelor's Degree",
            preferred_locations: ["San Francisco", "Remote"],
            preferred_salary_min: 90000,
            preferred_salary_max: 130000,
            preferred_industries: ["Technology"],
            career_level: "senior",
            work_preferences: { remote_work: true },
            bio: "Experienced full-stack developer",
            resume_text: "Senior Software Engineer with 5 years of experience"
          },
          job_postings: [
            {
              job_id: "demo_job_1",
              title: "Senior Full Stack Developer",
              company: "TechCorp Inc",
              description: "We are looking for a Senior Full Stack Developer to join our team.",
              required_skills: ["Python", "React", "PostgreSQL"],
              preferred_skills: ["AWS", "Docker"],
              experience_required: "5+ years",
              education_required: "Bachelor's degree",
              location: "San Francisco",
              salary_min: 100000,
              salary_max: 140000,
              industry: "Technology",
              job_type: "full-time",
              remote_allowed: true,
              posted_date: new Date().toISOString()
            }
          ],
          strategy: "hybrid",
          max_results: 5
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error:", error)
      setResult({ error: "Failed to match jobs" })
    }
    setLoading(false)
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
              <span className="text-blue-600 font-medium">Demo</span>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Services Demo</h1>
          <p className="mt-2 text-gray-600">Experience our AI-powered career development tools in action</p>
        </div>

        {/* Demo Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveDemo("resume")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeDemo === "resume"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Resume Analysis
            </button>
            <button
              onClick={() => setActiveDemo("skills")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeDemo === "skills"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Skill Extraction
            </button>
            <button
              onClick={() => setActiveDemo("jobs")}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeDemo === "jobs"
                  ? "bg-white text-blue-600 shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Job Matching
            </button>
          </div>
        </div>

        {/* Demo Content */}
        <div className="max-w-4xl mx-auto">
          {activeDemo === "resume" && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">📄</div>
                <h2 className="text-2xl font-bold mb-2">Resume Analysis Demo</h2>
                <p className="text-gray-600">
                  Our AI analyzes resumes to extract skills, experience, and provide insights
                </p>
              </div>
              
              <div className="text-center mb-6">
                <button
                  onClick={handleResumeAnalysis}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Analyzing..." : "Analyze Sample Resume"}
                </button>
              </div>

              {result && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Analysis Result:</h3>
                  <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {activeDemo === "skills" && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-2xl font-bold mb-2">Skill Extraction Demo</h2>
                <p className="text-gray-600">
                  Extract and categorize skills from any text using advanced NLP
                </p>
              </div>
              
              <div className="text-center mb-6">
                <button
                  onClick={handleSkillExtraction}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Extracting..." : "Extract Skills from Text"}
                </button>
              </div>

              {result && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Extracted Skills:</h3>
                  <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {activeDemo === "jobs" && (
            <div className="bg-white rounded-lg shadow p-8">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold mb-2">Job Matching Demo</h2>
                <p className="text-gray-600">
                  Intelligent job matching using semantic search and AI algorithms
                </p>
              </div>
              
              <div className="text-center mb-6">
                <button
                  onClick={handleJobMatching}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Matching..." : "Find Job Matches"}
                </button>
              </div>

              {result && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Job Matches:</h3>
                  <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* API Status */}
        <div className="mt-12 max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Live API Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Backend API</p>
                <p className="text-sm text-gray-500">http://localhost:8000</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">AI Services</p>
                <p className="text-sm text-gray-500">Ready for requests</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Job Matching</p>
                <p className="text-sm text-gray-500">Algorithm operational</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View Full API Documentation
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
