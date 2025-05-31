"use client"

import { useState } from "react"
import { ImprovedDashboardLayout } from "@/components/layout/improved-dashboard-layout"
import { Progress } from "@/components/ui/progress-simple"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function SkillsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all")

  const skillCategories = [
    { id: "all", name: "All Skills", count: 24 },
    { id: "programming", name: "Programming", count: 8 },
    { id: "frontend", name: "Frontend", count: 6 },
    { id: "backend", name: "Backend", count: 5 },
    { id: "database", name: "Database", count: 3 },
    { id: "cloud", name: "Cloud", count: 2 },
  ]

  const skills = [
    { name: "Python", category: "programming", level: 90, experience: "5+ years", trending: true },
    { name: "React", category: "frontend", level: 85, experience: "3+ years", trending: true },
    { name: "TypeScript", category: "programming", level: 80, experience: "2+ years", trending: true },
    { name: "PostgreSQL", category: "database", level: 75, experience: "3+ years", trending: false },
    { name: "AWS", category: "cloud", level: 70, experience: "2+ years", trending: true },
    { name: "Node.js", category: "backend", level: 85, experience: "3+ years", trending: false },
    { name: "Docker", category: "backend", level: 75, experience: "2+ years", trending: true },
    { name: "JavaScript", category: "programming", level: 90, experience: "5+ years", trending: false },
    { name: "CSS", category: "frontend", level: 80, experience: "4+ years", trending: false },
    { name: "MongoDB", category: "database", level: 65, experience: "1+ years", trending: false },
    { name: "Redis", category: "database", level: 60, experience: "1+ years", trending: false },
    { name: "FastAPI", category: "backend", level: 80, experience: "2+ years", trending: true },
  ]

  const recommendedSkills = [
    { name: "Kubernetes", demand: "Very High", timeToLearn: "2-3 months", marketValue: "+25%" },
    { name: "Machine Learning", demand: "High", timeToLearn: "4-6 months", marketValue: "+35%" },
    { name: "GraphQL", demand: "High", timeToLearn: "1-2 months", marketValue: "+15%" },
    { name: "Terraform", demand: "High", timeToLearn: "2-3 months", marketValue: "+20%" },
  ]

  const filteredSkills = selectedCategory === "all" 
    ? skills 
    : skills.filter(skill => skill.category === selectedCategory)

  const getSkillColor = (level: number) => {
    if (level >= 80) return "bg-green-500"
    if (level >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <ImprovedDashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skills Assessment</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Track your technical skills and discover new learning opportunities
          </p>
        </div>

        {/* Skills Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-green-600">+3 this month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <p className="text-xs text-green-600">+5% improvement</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Expert Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">80%+ proficiency</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
              <p className="text-xs text-blue-600">Skills in progress</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skills List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Skills</CardTitle>
                <CardDescription>
                  Skills assessed through AI analysis of your resume and projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {skillCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      }`}
                    >
                      {category.name} ({category.count})
                    </button>
                  ))}
                </div>

                {/* Skills Grid */}
                <div className="space-y-4">
                  {filteredSkills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{skill.name}</h3>
                          {skill.trending && (
                            <Badge variant="success" className="text-xs">
                              📈 Trending
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {skill.category}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Proficiency</span>
                              <span>{skill.level}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getSkillColor(skill.level)}`}
                                style={{ width: `${skill.level}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Experience: {skill.experience}
                        </p>
                      </div>
                      <div className="ml-4">
                        <Button variant="outline" size="sm">
                          Improve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations Sidebar */}
          <div className="space-y-6">
            {/* Skill Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Skills</CardTitle>
                <CardDescription>
                  High-demand skills that match your career path
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recommendedSkills.map((skill, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{skill.name}</h4>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>Market Demand: <span className="font-medium text-green-600">{skill.demand}</span></p>
                        <p>Time to Learn: <span className="font-medium">{skill.timeToLearn}</span></p>
                        <p>Market Value: <span className="font-medium text-blue-600">{skill.marketValue}</span></p>
                      </div>
                      <Button className="w-full mt-3" size="sm">
                        Start Learning
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>
                  Skills you're currently developing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Kubernetes</span>
                      <span>65%</span>
                    </div>
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      3 weeks remaining
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">Machine Learning</span>
                      <span>30%</span>
                    </div>
                    <Progress value={30} className="h-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      12 weeks remaining
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">GraphQL</span>
                      <span>80%</span>
                    </div>
                    <Progress value={80} className="h-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      1 week remaining
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  📄 Upload New Resume
                </Button>
                <Button className="w-full" variant="outline">
                  🎯 Take Skill Assessment
                </Button>
                <Button className="w-full" variant="outline">
                  📚 Browse Courses
                </Button>
                <Button className="w-full" variant="outline">
                  🏆 View Certifications
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ImprovedDashboardLayout>
  )
}
