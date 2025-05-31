"use client"

import { useState } from "react"
import { ImprovedDashboardLayout } from "@/components/layout/improved-dashboard-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-simple"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress-simple"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    title: "Senior Full Stack Developer",
    location: "San Francisco, CA",
    bio: "Passionate full-stack developer with 5+ years of experience building scalable web applications. Expertise in React, Python, and cloud technologies.",
    experience: "5+ years",
    education: "Bachelor's in Computer Science",
    website: "https://johndoe.dev",
    linkedin: "https://linkedin.com/in/johndoe",
    github: "https://github.com/johndoe"
  })

  const topSkills = [
    { name: "Python", level: 90 },
    { name: "React", level: 85 },
    { name: "TypeScript", level: 80 },
    { name: "AWS", level: 75 },
    { name: "PostgreSQL", level: 70 }
  ]

  const achievements = [
    { title: "AI Skills Expert", description: "Completed advanced AI/ML certification", date: "2024-01-15", icon: "🏆" },
    { title: "Top Performer", description: "Ranked in top 5% of developers", date: "2023-12-01", icon: "⭐" },
    { title: "Open Source Contributor", description: "100+ contributions to open source projects", date: "2023-11-20", icon: "🌟" },
    { title: "Mentor", description: "Mentored 10+ junior developers", date: "2023-10-15", icon: "👨‍🏫" }
  ]

  const recentActivity = [
    { action: "Updated skills assessment", time: "2 hours ago", type: "skill" },
    { action: "Applied to Senior Developer position at TechCorp", time: "1 day ago", type: "application" },
    { action: "Completed React Advanced course", time: "3 days ago", type: "learning" },
    { action: "Updated portfolio with new project", time: "1 week ago", type: "portfolio" }
  ]

  const handleSave = () => {
    setIsEditing(false)
    // Here you would typically save to backend
  }

  return (
    <ImprovedDashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your professional profile and career information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Your core professional details</CardDescription>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                >
                  {isEditing ? "Save Changes" : "Edit Profile"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture and Basic Info */}
                <div className="flex items-start space-x-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src="/placeholder-avatar.jpg" alt={profileData.name} />
                      <AvatarFallback className="text-lg">
                        {profileData.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button size="sm" className="absolute -bottom-2 -right-2" variant="outline">
                        📷
                      </Button>
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        {isEditing ? (
                          <Input
                            value={profileData.name}
                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          />
                        ) : (
                          <p className="text-lg font-semibold">{profileData.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        {isEditing ? (
                          <Input
                            value={profileData.email}
                            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          />
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400">{profileData.email}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Job Title</label>
                        {isEditing ? (
                          <Input
                            value={profileData.title}
                            onChange={(e) => setProfileData({...profileData, title: e.target.value})}
                          />
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400">{profileData.title}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        {isEditing ? (
                          <Input
                            value={profileData.location}
                            onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                          />
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400">{profileData.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium mb-2">Professional Bio</label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">{profileData.bio}</p>
                  )}
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Experience</label>
                    {isEditing ? (
                      <Input
                        value={profileData.experience}
                        onChange={(e) => setProfileData({...profileData, experience: e.target.value})}
                      />
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">{profileData.experience}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Education</label>
                    {isEditing ? (
                      <Input
                        value={profileData.education}
                        onChange={(e) => setProfileData({...profileData, education: e.target.value})}
                      />
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">{profileData.education}</p>
                    )}
                  </div>
                </div>

                {/* Social Links */}
                <div>
                  <label className="block text-sm font-medium mb-2">Professional Links</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Website</label>
                      {isEditing ? (
                        <Input
                          value={profileData.website}
                          onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                          placeholder="https://..."
                        />
                      ) : (
                        <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {profileData.website}
                        </a>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">LinkedIn</label>
                      {isEditing ? (
                        <Input
                          value={profileData.linkedin}
                          onChange={(e) => setProfileData({...profileData, linkedin: e.target.value})}
                          placeholder="https://linkedin.com/in/..."
                        />
                      ) : (
                        <a href={profileData.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          LinkedIn Profile
                        </a>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">GitHub</label>
                      {isEditing ? (
                        <Input
                          value={profileData.github}
                          onChange={(e) => setProfileData({...profileData, github: e.target.value})}
                          placeholder="https://github.com/..."
                        />
                      ) : (
                        <a href={profileData.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          GitHub Profile
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="text-2xl">
                        {activity.type === 'skill' && '🧠'}
                        {activity.type === 'application' && '📄'}
                        {activity.type === 'learning' && '📚'}
                        {activity.type === 'portfolio' && '💼'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{activity.action}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Top Skills</CardTitle>
                <CardDescription>Your strongest technical abilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topSkills.map((skill, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{skill.name}</span>
                        <span>{skill.level}%</span>
                      </div>
                      <Progress value={skill.level} className="h-2" />
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Skills
                </Button>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
                <CardDescription>Your career milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{achievement.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(achievement.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profile Completion */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Completion</CardTitle>
                <CardDescription>Complete your profile to get better matches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Overall Progress</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span>Basic information</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span>Skills assessment</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500">✓</span>
                      <span>Professional links</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-500">○</span>
                      <span>Portfolio projects</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-500">○</span>
                      <span>Work experience</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Complete Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ImprovedDashboardLayout>
  )
}
