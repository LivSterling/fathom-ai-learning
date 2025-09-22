"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Target, Edit, MessageSquare } from "lucide-react"

interface OnboardingProposedPlanProps {
  planConfig: any
  onEdit: () => void
  onPublish: () => void
  onJumpToSession: () => void
}

const generateMockPlan = (config: any) => {
  const conceptTitle = config.concept.length > 50 ? config.concept.substring(0, 50) + "..." : config.concept

  return {
    title: conceptTitle,
    totalDuration: `${config.weeks} weeks`,
    dailyTime: `${config.minutesPerDay} min`,
    level: config.level,
    format: config.format,
    modules: [
      {
        id: "1",
        title: "Fundamentals & Core Concepts",
        duration: "Week 1-2",
        outcomes: ["Understand basic principles", "Learn key terminology", "Build foundation knowledge"],
        lessons: [
          {
            id: "1",
            title: "Introduction and Overview",
            resources: [
              {
                title: "Getting Started Guide",
                source: "Documentation",
                length: "20 min",
                difficulty: "Beginner",
                citation: "Official docs",
              },
              {
                title: "Overview Video",
                source: "YouTube",
                length: "15 min",
                difficulty: "Beginner",
                citation: "Educational channel",
              },
            ],
          },
          {
            id: "2",
            title: "Core Principles",
            resources: [
              {
                title: "Fundamental Concepts",
                source: "Article",
                length: "30 min",
                difficulty: "Beginner",
                citation: "Expert blog",
              },
              {
                title: "Interactive Tutorial",
                source: "Platform",
                length: "45 min",
                difficulty: "Intermediate",
                citation: "Learning platform",
              },
            ],
          },
        ],
      },
      {
        id: "2",
        title: "Practical Application",
        duration: "Week 2-3",
        outcomes: ["Apply concepts in practice", "Work through examples", "Build hands-on experience"],
        lessons: [
          {
            id: "3",
            title: "Hands-on Practice",
            resources: [
              {
                title: "Step-by-step Tutorial",
                source: "Guide",
                length: "60 min",
                difficulty: "Intermediate",
                citation: "Tutorial site",
              },
              {
                title: "Practice Exercises",
                source: "Workbook",
                length: "40 min",
                difficulty: "Intermediate",
                citation: "Exercise collection",
              },
            ],
          },
          {
            id: "4",
            title: "Real-world Examples",
            resources: [
              {
                title: "Case Studies",
                source: "Research",
                length: "35 min",
                difficulty: "Intermediate",
                citation: "Academic source",
              },
            ],
          },
        ],
      },
      {
        id: "3",
        title: "Advanced Topics & Integration",
        duration: `Week ${Math.max(3, config.weeks - 1)}-${config.weeks}`,
        outcomes: ["Master advanced concepts", "Integrate with other topics", "Develop expertise"],
        lessons: [
          {
            id: "5",
            title: "Advanced Techniques",
            resources: [
              {
                title: "Advanced Guide",
                source: "Documentation",
                length: "50 min",
                difficulty: "Advanced",
                citation: "Expert resource",
              },
              {
                title: "Deep Dive Video",
                source: "Course",
                length: "75 min",
                difficulty: "Advanced",
                citation: "Online course",
              },
            ],
          },
        ],
      },
    ],
  }
}

export function OnboardingProposedPlan({
  planConfig,
  onEdit,
  onPublish,
  onJumpToSession,
}: OnboardingProposedPlanProps) {
  // Use the generated learning plan if available, otherwise fall back to mock plan
  const proposedPlan = planConfig.learningPlan || generateMockPlan(planConfig)

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold">Your Learning Plan</h1>
      </div>

      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {proposedPlan.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-primary">{proposedPlan.modules.length}</div>
                <div className="text-sm text-muted-foreground">Modules</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">{proposedPlan.totalDuration}</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{proposedPlan.dailyTime}</div>
                <div className="text-sm text-muted-foreground">Daily</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{proposedPlan.level}</Badge>
              <Badge variant="outline">{proposedPlan.format}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {proposedPlan.modules.map((module, index) => (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Module {index + 1}: {module.title}
                  </CardTitle>
                  <Badge variant="outline">{module.duration}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Learning Outcomes */}
                <div>
                  <h4 className="font-medium mb-2">Learning Outcomes</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {module.outcomes.map((outcome, i) => (
                      <li key={i}>• {outcome}</li>
                    ))}
                  </ul>
                </div>

                {/* Lessons */}
                <div>
                  <h4 className="font-medium mb-2">Lessons ({module.lessons.length})</h4>
                  <div className="space-y-3">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="border border-border rounded-lg p-3">
                        <h5 className="font-medium mb-2">{lesson.title}</h5>
                        <div className="space-y-2">
                          {lesson.resources.map((resource, i) => (
                            <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                              <div>
                                <div className="font-medium">{resource.title}</div>
                                <div className="text-muted-foreground text-xs">
                                  {resource.source} • {resource.citation}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{resource.length}</span>
                                <Badge variant="outline" className="text-xs">
                                  {resource.difficulty}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onJumpToSession}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <CardTitle className="text-lg">Or Jump into a Session</CardTitle>
                <p className="text-sm text-muted-foreground">Start learning immediately with AI tutor guidance</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="pt-6 space-y-3">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onEdit} className="flex-1 bg-transparent">
            <Edit className="w-4 h-4 mr-2" />
            Edit Plan
          </Button>
          <Button onClick={onPublish} className="flex-1">
            Publish Plan
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">You can always modify your plan later in the app</p>
      </div>
    </div>
  )
}
