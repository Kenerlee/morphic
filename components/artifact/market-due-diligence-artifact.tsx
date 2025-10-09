'use client'

import {
  AlertTriangle,
  Building2,
  FileText,
  Globe,
  TrendingUp,
  Users
} from 'lucide-react'

import { MarketDueDiligenceReport } from '@/lib/types'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function MarketDueDiligenceArtifact({
  report
}: {
  report: MarketDueDiligenceReport
}) {
  const { metadata, sections } = report

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Globe className="h-6 w-6" />
                Market Due Diligence Report
              </CardTitle>
              <CardDescription>
                {metadata.industry} in {metadata.targetMarket}
                {metadata.productCategory && ` - ${metadata.productCategory}`}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {metadata.dataPoints} data points
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Generated: {new Date(metadata.generatedAt).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {/* Market Size & Growth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Size & Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sections.marketSize.results.slice(0, 3).map((result, idx) => (
              <div key={idx} className="space-y-1">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                >
                  {result.title}
                </a>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.content}
                </p>
                {idx < sections.marketSize.results.slice(0, 3).length - 1 && (
                  <Separator className="mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitive Landscape */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Competitive Landscape
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sections.competition.results.slice(0, 3).map((result, idx) => (
              <div key={idx} className="space-y-1">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                >
                  {result.title}
                </a>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.content}
                </p>
                {idx < sections.competition.results.slice(0, 3).length - 1 && (
                  <Separator className="mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Consumer Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Consumer Trends & Target Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sections.consumerTrends.results.slice(0, 3).map((result, idx) => (
              <div key={idx} className="space-y-1">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                >
                  {result.title}
                </a>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.content}
                </p>
                {idx <
                  sections.consumerTrends.results.slice(0, 3).length - 1 && (
                  <Separator className="mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Environment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Legal & Regulatory Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sections.regulatory.results.slice(0, 3).map((result, idx) => (
              <div key={idx} className="space-y-1">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                >
                  {result.title}
                </a>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {result.content}
                </p>
                {idx < sections.regulatory.results.slice(0, 3).length - 1 && (
                  <Separator className="mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Distribution Channels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sections.distributionChannels.results
              .slice(0, 3)
              .map((result, idx) => (
                <div key={idx} className="space-y-1">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                  >
                    {result.title}
                  </a>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {result.content}
                  </p>
                  {idx <
                    sections.distributionChannels.results.slice(0, 3).length -
                      1 && <Separator className="mt-2" />}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Product Opportunities (if applicable) */}
      {sections.productOpportunities &&
        sections.productOpportunities.results &&
        sections.productOpportunities.results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Product-Specific Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sections.productOpportunities?.results
                  ?.slice(0, 3)
                  .map((result, idx) => (
                    <div key={idx} className="space-y-1">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {result.title}
                      </a>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.content}
                      </p>
                      {idx <
                        (sections.productOpportunities?.results?.slice(0, 3)
                          .length ?? 0) -
                          1 && <Separator className="mt-2" />}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}
