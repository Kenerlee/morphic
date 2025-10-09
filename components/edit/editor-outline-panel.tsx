'use client'

import { useEffect, useState } from 'react'

import { Editor } from '@tiptap/react'
import { ChevronRight, List } from 'lucide-react'

import { cn } from '@/lib/utils'

import { Button } from '../ui/button'

interface HeadingItem {
  id: string
  level: number
  text: string
  position: number
}

interface EditorOutlinePanelProps {
  editor: Editor | null
}

export function EditorOutlinePanel({ editor }: EditorOutlinePanelProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!editor) return

    const updateHeadings = () => {
      const items: HeadingItem[] = []

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          // Generate a unique ID based on position and content (no side effects)
          const id = `heading-${pos}-${node.textContent.slice(0, 20).replace(/\s+/g, '-')}`

          items.push({
            id,
            level: node.attrs.level,
            text: node.textContent,
            position: pos
          })
        }
      })

      setHeadings(items)
    }

    // Initial update
    updateHeadings()

    // Listen to editor updates
    editor.on('update', updateHeadings)
    editor.on('selectionUpdate', updateHeadings)

    return () => {
      editor.off('update', updateHeadings)
      editor.off('selectionUpdate', updateHeadings)
    }
  }, [editor])

  const scrollToHeading = (position: number, id: string) => {
    if (!editor) return

    // Set cursor position
    editor.commands.focus()
    editor.commands.setTextSelection(position)

    // Scroll to the heading element
    const headingElement = document.querySelector(`[data-id="${id}"]`)
    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    setActiveHeadingId(id)
  }

  if (!editor) return null

  return (
    <div
      className={cn(
        'border-r bg-muted/30 transition-all duration-300',
        isCollapsed ? 'w-12' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-full justify-start gap-2"
        >
          <List className="h-4 w-4" />
          {!isCollapsed && <span className="text-sm font-medium">大纲</span>}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="p-3">
            {headings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                暂无标题
                <br />
                <span className="text-[10px]">使用 H1-H3 创建标题</span>
              </p>
            ) : (
              <div className="space-y-1">
                {headings.map((heading, index) => (
                  <button
                    key={heading.id || index}
                    onClick={() =>
                      scrollToHeading(heading.position, heading.id)
                    }
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-accent',
                      'line-clamp-2 leading-relaxed',
                      activeHeadingId === heading.id &&
                        'bg-accent text-accent-foreground font-medium',
                      heading.level === 1 && 'font-semibold',
                      heading.level === 2 && 'pl-4 text-sm',
                      heading.level === 3 &&
                        'pl-8 text-xs text-muted-foreground'
                    )}
                  >
                    <div className="flex items-start gap-1">
                      {heading.level > 1 && (
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                      )}
                      <span className="break-words">
                        {heading.text || '(空标题)'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
