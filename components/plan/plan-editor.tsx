"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { GripVertical, X, Plus, Clock } from "lucide-react"

interface PlanEditorProps {
  planData: any
  onSave: (data: any) => void
  onPublish: () => void
}

export function PlanEditor({ planData, onSave, onPublish }: PlanEditorProps) {
  const [editingPlan, setEditingPlan] = useState({
    title: "Full-Stack JavaScript Development",
    modules: [
      {
        id: "1",
        title: "JavaScript Fundamentals",
        lessons: [
          { id: "1", title: "Variables and Data Types", duration: "30 min" },
          { id: "2", title: "Functions and Scope", duration: "45 min" },
          { id: "3", title: "Objects and Arrays", duration: "60 min" },
        ],
      },
      {
        id: "2",
        title: "React Development",
        lessons: [
          { id: "4", title: "Components and JSX", duration: "90 min" },
          { id: "5", title: "State and Props", duration: "75 min" },
        ],
      },
    ],
  })

  const handleSave = () => {
    onSave(editingPlan)
  }

  const removeLesson = (moduleId: string, lessonId: string) => {
    setEditingPlan((prev) => ({
      ...prev,
      modules: prev.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: module.lessons.filter((lesson) => lesson.id !== lessonId),
            }
          : module,
      ),
    }))
  }

  const addLesson = (moduleId: string) => {
    const newLesson = {
      id: Date.now().toString(),
      title: "New Lesson",
      duration: "30 min",
    }

    setEditingPlan((prev) => ({
      ...prev,
      modules: prev.modules.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons: [...module.lessons, newLesson],
            }
          : module,
      ),
    }))
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Edit Learning Plan</h2>
          <p className="text-muted-foreground">Customize your curriculum</p>
        </div>
        <Button onClick={handleSave} variant="outline" size="sm">
          Save Changes
        </Button>
      </div>

      {/* Plan Title */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={editingPlan.title}
            onChange={(e) => setEditingPlan((prev) => ({ ...prev, title: e.target.value }))}
            className="text-lg font-medium"
          />
        </CardContent>
      </Card>

      {/* Modules */}
      <div className="space-y-4">
        {editingPlan.modules.map((module, moduleIndex) => (
          <Card key={module.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                <Input
                  value={module.title}
                  onChange={(e) =>
                    setEditingPlan((prev) => ({
                      ...prev,
                      modules: prev.modules.map((m) => (m.id === module.id ? { ...m, title: e.target.value } : m)),
                    }))
                  }
                  className="font-medium border-none p-0 h-auto text-lg"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Lessons */}
              <div className="space-y-2">
                {module.lessons.map((lesson, lessonIndex) => (
                  <div key={lesson.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <Input
                      value={lesson.title}
                      onChange={(e) =>
                        setEditingPlan((prev) => ({
                          ...prev,
                          modules: prev.modules.map((m) =>
                            m.id === module.id
                              ? {
                                  ...m,
                                  lessons: m.lessons.map((l) =>
                                    l.id === lesson.id ? { ...l, title: e.target.value } : l,
                                  ),
                                }
                              : m,
                          ),
                        }))
                      }
                      className="flex-1 border-none p-0 h-auto"
                    />
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.duration}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() => removeLesson(module.id, lesson.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={() => addLesson(module.id)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Lesson
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleSave} className="flex-1 bg-transparent">
          Save Draft
        </Button>
        <Button onClick={onPublish} className="flex-1">
          Publish Plan
        </Button>
      </div>
    </div>
  )
}
