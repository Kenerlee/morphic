'use client'

import { useState } from 'react'

import { ExternalLink,Maximize2, Minimize2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface PdfViewerProps {
  pdfUrl: string
  title: string
}

export function PdfViewer({ pdfUrl, title }: PdfViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[800px]'}`}>
      {/* 工具栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 bg-background/90 backdrop-blur border-b">
        <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* PDF iframe */}
      <iframe
        src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
        className={`w-full border-0 ${isFullscreen ? 'h-[calc(100%-48px)] mt-12' : 'h-full pt-12'}`}
        title={title}
      />

      {/* 全屏遮罩关闭按钮 */}
      {isFullscreen && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-4 right-4 z-50"
          onClick={toggleFullscreen}
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          退出全屏
        </Button>
      )}
    </div>
  )
}
