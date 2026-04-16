"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search, BookOpen, ThumbsUp, ThumbsDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  helpful_count: number
  unhelpful_count: number
  created_at: string
}

const categories = [
  { value: "pricing", label: "Pricing" },
  { value: "features", label: "Features" },
  { value: "billing", label: "Billing" },
  { value: "security", label: "Security" },
  { value: "support", label: "Support" },
  { value: "affiliate", label: "Affiliate" },
  { value: "general", label: "General" },
]

export default function KnowledgeBasePage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ question: "", answer: "", category: "general" })

  useEffect(() => {
    fetchFAQs()
  }, [])

  async function fetchFAQs() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("faq_knowledge_base")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setFaqs(data)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!formData.question || !formData.answer) {
      toast.error("Please fill in all fields")
      return
    }

    const supabase = createClient()

    if (editingId) {
      const { error } = await supabase
        .from("faq_knowledge_base")
        .update({
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingId)

      if (error) {
        toast.error("Failed to update FAQ")
      } else {
        toast.success("FAQ updated")
        setEditingId(null)
      }
    } else {
      const { error } = await supabase
        .from("faq_knowledge_base")
        .insert({
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          source: "admin"
        })

      if (error) {
        toast.error("Failed to add FAQ")
      } else {
        toast.success("FAQ added to knowledge base")
        setIsAdding(false)
      }
    }

    setFormData({ question: "", answer: "", category: "general" })
    fetchFAQs()
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this FAQ?")) return

    const supabase = createClient()
    const { error } = await supabase
      .from("faq_knowledge_base")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("Failed to delete FAQ")
    } else {
      toast.success("FAQ deleted")
      fetchFAQs()
    }
  }

  function startEdit(faq: FAQItem) {
    setEditingId(faq.id)
    setFormData({ question: faq.question, answer: faq.answer, category: faq.category })
    setIsAdding(true)
  }

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(search.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = filterCategory === "all" || faq.category === filterCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground">Manage FAQ entries for AI support chat</p>
        </div>
        <Button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ question: "", answer: "", category: "general" }) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>{editingId ? "Edit FAQ" : "Add New FAQ"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="What question will this answer?"
              />
            </div>
            <div className="space-y-2">
              <Label>Answer</Label>
              <Textarea
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Provide a detailed answer..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}>{editingId ? "Update" : "Add"} FAQ</Button>
              <Button variant="outline" onClick={() => { setIsAdding(false); setEditingId(null) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                FAQ Entries ({filteredFaqs.length})
              </CardTitle>
              <CardDescription>These entries power the AI support chat</CardDescription>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredFaqs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No FAQs found</p>
          ) : (
            <div className="space-y-4">
              {filteredFaqs.map(faq => (
                <div key={faq.id} className="p-4 rounded-lg border border-border bg-background">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{faq.category}</Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ThumbsUp className="h-3 w-3" /> {faq.helpful_count}
                          <ThumbsDown className="h-3 w-3 ml-2" /> {faq.unhelpful_count}
                        </div>
                      </div>
                      <h4 className="font-medium text-foreground mb-1">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(faq)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
