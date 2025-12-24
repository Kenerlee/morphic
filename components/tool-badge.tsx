import React from 'react'

import { FileBarChart, FileCode, Film, Home, Link, Search } from 'lucide-react'

import { Badge } from './ui/badge'

type ToolBadgeProps = {
  tool: string
  children: React.ReactNode
  className?: string
}

export const ToolBadge: React.FC<ToolBadgeProps> = ({
  tool,
  children,
  className
}) => {
  const icon: Record<string, React.ReactNode> = {
    search: <Search size={14} />,
    retrieve: <Link size={14} />,
    videoSearch: <Film size={14} />,
    market_due_diligence: <FileBarChart size={14} />,
    homestay_skill: <Home size={14} />,
    skill_execution: <FileCode size={14} />
  }

  return (
    <Badge className={className} variant={'secondary'}>
      {icon[tool]}
      <span className="ml-1">{children}</span>
    </Badge>
  )
}
