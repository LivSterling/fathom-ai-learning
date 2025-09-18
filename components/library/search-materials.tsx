"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, FileText, ExternalLink } from "lucide-react"

export function SearchMaterials() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    // Simulate search
    setTimeout(() => {
      setSearchResults([
        {
          id: "1",
          title: "JavaScript Closures Explained",
          snippet: "A closure is a function that has access to variables in its outer scope even after...",
          source: "JavaScript Fundamentals.pdf",
          page: 15,
        },
        {
          id: "2",
          title: "Array Methods Overview",
          snippet: "The push() method adds one or more elements to the end of an array and returns...",
          source: "Modern JavaScript Guide.pdf",
          page: 8,
        },
        {
          id: "3",
          title: "Object Property Access",
          snippet: "There are two ways to access object properties: dot notation and bracket notation...",
          source: "JavaScript Fundamentals.pdf",
          page: 22,
        },
      ])
      setIsSearching(false)
    }, 1000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your materials..."
                className="pl-10"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Search Results ({searchResults.length})</h3>
          {searchResults.map((result) => (
            <Card key={result.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground mb-1">{result.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{result.snippet}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{result.source}</span>
                      <span>•</span>
                      <span>Page {result.page}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="p-1">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
