"use client"

import { useState } from "react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [selectedType, setSelectedType] = useState("all")

  const jobMatches = [
    {
      id: 1,
      title: "Senior Full Stack Developer",
      company: "TechCorp Inc",
      location: "San Francisco, CA",
      type: "Full-time",
      salary: "$120k - $160k",
      match: 95,
      skills: ["Python", "React", "PostgreSQL", "AWS"],
      description: "We're looking for a senior full stack developer to join our growing team...",
      posted: "2 days ago",
      applicants: 23,
      remote: true
    },
    {
      id: 2,
      title: "Python Backend Developer",
      company: "DataTech Solutions",
      location: "Remote",
      type: "Full-time",
      salary: "$100k - $140k",
      match: 88,
      skills: ["Python", "FastAPI", "PostgreSQL", "Docker"],
      description: "Join our backend team to build scalable APIs and microservices...",
      posted: "1 day ago",
      applicants: 15,
      remote: true
    },
    {
      id: 3,
      title: "Frontend React Developer",
      company: "StartupXYZ",
      location: "New York, NY",
      type: "Full-time",
      salary: "$95k - $125k",
      match: 82,
      skills: ["React", "TypeScript", "CSS", "JavaScript"],
      description: "Help us build the next generation of user interfaces...",
      posted: "3 days ago",
      applicants: 31,
      remote: false
    },
    {
      id: 4,
      title: "DevOps Engineer",
      company: "CloudFirst",
      location: "Austin, TX",
      type: "Full-time",
      salary: "$110k - $150k",
      match: 75,
      skills: ["AWS", "Docker", "Kubernetes", "Terraform"],
      description: "Lead our infrastructure automation and deployment processes...",
      posted: "1 week ago",
      applicants: 18,
      remote: true
    },
    {
      id: 5,
      title: "Full Stack Engineer",
      company: "InnovateLab",
      location: "Seattle, WA",
      type: "Contract",
      salary: "$80 - $120/hr",
      match: 78,
      skills: ["JavaScript", "Node.js", "React", "MongoDB"],
      description: "6-month contract to build innovative web applications...",
      posted: "4 days ago",
      applicants: 12,
      remote: true
    }
  ]

  const getMatchColor = (match: number) => {
    if (match >= 90) return "bg-green-500"
    if (match >= 80) return "bg-blue-500"
    if (match >= 70) return "bg-yellow-500"
    return "bg-gray-500"
  }

  const getMatchTextColor = (match: number) => {
    if (match >= 90) return "text-green-600"
    if (match >= 80) return "text-blue-600"
    if (match >= 70) return "text-yellow-600"
    return "text-gray-600"
  }

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Matching</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            AI-powered job recommendations based on your skills and preferences
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-green-600">+12 new today</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">High Match</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">90%+ match score</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-blue-600">3 pending responses</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-purple-600">Scheduled this week</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <Input
                    placeholder="Job title, company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Locations</option>
                    <option value="remote">Remote</option>
                    <option value="san-francisco">San Francisco</option>
                    <option value="new-york">New York</option>
                    <option value="seattle">Seattle</option>
                    <option value="austin">Austin</option>
                  </select>
                </div>

                {/* Job Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Job Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Types</option>
                    <option value="full-time">Full-time</option>
                    <option value="contract">Contract</option>
                    <option value="part-time">Part-time</option>
                  </select>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-medium mb-2">Salary Range</label>
                  <div className="space-y-2">
                    <Input placeholder="Min salary" type="number" />
                    <Input placeholder="Max salary" type="number" />
                  </div>
                </div>

                {/* Quick Filters */}
                <div>
                  <label className="block text-sm font-medium mb-2">Quick Filters</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Remote Only</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">High Match (90%+)</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Posted This Week</span>
                    </label>
                  </div>
                </div>

                <Button className="w-full">
                  Apply Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Job Listings */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {jobMatches.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {job.title}
                          </h3>
                          {job.remote && (
                            <Badge variant="outline" className="text-xs">
                              🌐 Remote
                            </Badge>
                          )}
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">{job.company}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <span>📍 {job.location}</span>
                          <span>💰 {job.salary}</span>
                          <span>⏰ {job.type}</span>
                          <span>👥 {job.applicants} applicants</span>
                        </div>
                      </div>
                      <div className="text-right ml-6">
                        <div className={`text-3xl font-bold ${getMatchTextColor(job.match)}`}>
                          {job.match}%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Match</div>
                        <div className={`w-16 h-2 rounded-full mt-2 ${getMatchColor(job.match)}`} />
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-4">{job.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Posted {job.posted}
                      </span>
                      <div className="space-x-3">
                        <Button variant="outline" size="sm">
                          Save Job
                        </Button>
                        <Button size="sm">
                          Apply Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More */}
              <div className="text-center py-8">
                <Button variant="outline" size="lg">
                  Load More Jobs
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
