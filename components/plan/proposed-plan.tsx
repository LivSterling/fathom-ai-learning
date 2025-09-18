"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Target, Edit } from "lucide-react"

interface ProposedPlanProps {
  planData: any
  onEdit: () => void
  onPublish: () => void
}

const mockProposedPlan = {
  title: "Full-Stack JavaScript Development",
  totalDuration: "3 months",
  dailyTime: "1 hour",
  modules: [
    {
      id: "1",
      title: "JavaScript Fundamentals",
      duration: "3 weeks",
      outcomes: ["Master ES6+ syntax", "Understand closures and scope", "Work with async/await"],
      lessons: [
        {
          id: "1",
          title: "Variables and Data Types",
          resources: [
            { title: "MDN JavaScript Guide", source: "MDN", length: "30 min", difficulty: "Beginner" },
            { title: "JavaScript Basics Video", source: "YouTube", length: "45 min", difficulty: "Beginner" },
          ],
        },
        {
          id: "2",
          title: "Functions and Scope",
          resources: [
            { title: "Function Fundamentals", source: "FreeCodeCamp", length: "60 min", difficulty: "Beginner" },
            { title: "Scope Deep Dive", source: "JavaScript.info", length: "40 min", difficulty: "Intermediate" },
          ],
        },
      ],
    },
    {
      id: "2",
      title: "React Development",
      duration: "4 weeks",
      outcomes: ["Build interactive UIs", "Manage component state", "Handle user events"],
      lessons: [
        {
          id: "3",
          title: "Components and JSX",
          resources: [
            { title: "React Official Tutorial", source: "React.dev", length: "90 min", difficulty: "Beginner" },
            { title: "JSX in Depth", source: "React.dev", length: "30 min", difficulty: "Intermediate" },
          ],
        },
        {
          id: "4",
          title: "State and Props",
          resources: [
            { title: "State Management Guide", source: "React.dev", length: "75 min", difficulty: "Intermediate" },
          ],
        },
      ],
    },
    {
      id: "3",
      title: "Backend with Node.js",
      duration: "5 weeks",
      outcomes: ["Create REST APIs", "Work with databases", "Handle authentication"],
      lessons: [
        {
          id: "5",
          title: "Express.js Basics",
          resources: [
            { title: "Express.js Guide", source: "Express.js", length: "120 min", difficulty: "Intermediate" },
          ],
        },
      ],
    },
  ],
}

export function ProposedPlan({ planData, onEdit, onPublish }: ProposedPlanProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Your Learning Plan</h2>
          <p className="text-muted-foreground">AI-generated curriculum based on your goals</p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            {mockProposedPlan.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{mockProposedPlan.modules.length}</div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">{mockProposedPlan.totalDuration}</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{mockProposedPlan.dailyTime}</div>
              <div className="text-sm text-muted-foreground">Daily</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      <div className="space-y-4">
        {mockProposedPlan.modules.map((module, index) => (
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
                              <div className="text-muted-foreground">{resource.source}</div>
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

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onEdit} className="flex-1 bg-transparent">
          Edit Plan
        </Button>
        <Button onClick={onPublish} className="flex-1">
          Publish Plan
        </Button>
      </div>
    </div>
  )
}
