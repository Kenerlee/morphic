'use client'

import type { ToolInvocation } from 'ai'

import { MarketDueDiligenceReport } from '@/lib/types'

import { MarketDueDiligenceArtifact } from '@/components/artifact/market-due-diligence-artifact'
import { RetrieveArtifactContent } from '@/components/artifact/retrieve-artifact-content'
import { SearchArtifactContent } from '@/components/artifact/search-artifact-content'
import { VideoSearchArtifactContent } from '@/components/artifact/video-search-artifact-content'

export function ToolInvocationContent({
  toolInvocation
}: {
  toolInvocation: ToolInvocation
}) {
  switch (toolInvocation.toolName) {
    case 'search':
      return <SearchArtifactContent tool={toolInvocation} />
    case 'retrieve':
      return <RetrieveArtifactContent tool={toolInvocation} />
    case 'videoSearch':
      return <VideoSearchArtifactContent tool={toolInvocation} />
    case 'market_due_diligence':
      if (toolInvocation.state === 'result' && toolInvocation.result) {
        return (
          <MarketDueDiligenceArtifact
            report={toolInvocation.result as MarketDueDiligenceReport}
          />
        )
      }
      return (
        <div className="p-4 text-sm text-muted-foreground">
          Generating market due diligence report...
        </div>
      )
    default:
      return <div className="p-4">Details for this tool are not available</div>
  }
}
