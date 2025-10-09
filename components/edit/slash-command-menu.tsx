'use client'

import { useEffect, useRef, useState } from 'react'

import { Editor } from '@tiptap/react'
import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table} from 'lucide-react'

import { cn } from '@/lib/utils'

interface SlashCommandItem {
  title: string
  description: string
  icon: React.ReactNode
  command: () => void
}

interface SlashCommandMenuProps {
  editor: Editor
  position: { x: number; y: number }
  onClose: () => void
}

export function SlashCommandMenu({
  editor,
  position,
  onClose
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const items: SlashCommandItem[] = [
    {
      title: '标题 1',
      description: '大号标题',
      icon: <Heading1 className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().setHeading({ level: 1 }).run()
        onClose()
      }
    },
    {
      title: '标题 2',
      description: '中号标题',
      icon: <Heading2 className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().setHeading({ level: 2 }).run()
        onClose()
      }
    },
    {
      title: '标题 3',
      description: '小号标题',
      icon: <Heading3 className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().setHeading({ level: 3 }).run()
        onClose()
      }
    },
    {
      title: '无序列表',
      description: '创建一个简单的无序列表',
      icon: <List className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().toggleBulletList().run()
        onClose()
      }
    },
    {
      title: '有序列表',
      description: '创建一个带编号的列表',
      icon: <ListOrdered className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().toggleOrderedList().run()
        onClose()
      }
    },
    {
      title: '任务列表',
      description: '创建待办事项列表',
      icon: <CheckSquare className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().toggleTaskList().run()
        onClose()
      }
    },
    {
      title: '引用',
      description: '插入引用块',
      icon: <Quote className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().toggleBlockquote().run()
        onClose()
      }
    },
    {
      title: '代码块',
      description: '插入代码片段',
      icon: <Code className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().toggleCodeBlock().run()
        onClose()
      }
    },
    {
      title: '分割线',
      description: '插入水平分割线',
      icon: <Minus className="h-4 w-4" />,
      command: () => {
        editor.chain().focus().setHorizontalRule().run()
        onClose()
      }
    },
    {
      title: '图片',
      description: '插入图片',
      icon: <Image className="h-4 w-4" />,
      command: () => {
        const url = window.prompt('请输入图片URL:')
        if (url) {
          editor.chain().focus().setImage({ src: url }).run()
        }
        onClose()
      }
    },
    {
      title: '表格',
      description: '插入表格',
      icon: <Table className="h-4 w-4" />,
      command: () => {
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run()
        onClose()
      }
    },
    {
      title: '链接',
      description: '插入超链接',
      icon: <LinkIcon className="h-4 w-4" />,
      command: () => {
        const url = window.prompt('请输入链接URL:')
        if (url) {
          editor.chain().focus().setLink({ href: url }).run()
        }
        onClose()
      }
    }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % items.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        items[selectedIndex].command()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, items, onClose])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-80 rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{
        top: position.y,
        left: position.x
      }}
    >
      <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
        {items.map((item, index) => (
          <button
            key={item.title}
            onClick={item.command}
            className={cn(
              'w-full flex items-start gap-3 px-3 py-2 rounded-md transition-colors',
              'hover:bg-accent text-left',
              selectedIndex === index && 'bg-accent'
            )}
          >
            <div className="mt-0.5 text-muted-foreground">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{item.title}</div>
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="px-3 py-2 border-t text-xs text-muted-foreground">
        ↑↓ 导航 · ↵ 选择 · ESC 关闭
      </div>
    </div>
  )
}
