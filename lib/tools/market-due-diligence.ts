import { tool } from 'ai'
import { z } from 'zod'

import {
  createSearchProvider,
  DEFAULT_PROVIDER,
  SearchProviderType
} from './search/providers'

const SEARCH_API =
  (process.env.SEARCH_API as SearchProviderType) || DEFAULT_PROVIDER

/**
 * Market Due Diligence Report Tool
 * Generates comprehensive market analysis reports for target markets and industries
 */
export function createMarketDueDiligenceTool(model: string) {
  return tool({
    description: `
      Generate a comprehensive market due diligence report for a target market and industry.
      This tool performs multi-source data analysis to provide insights on:
      - Market size and growth projections
      - Competitive landscape analysis
      - Target customer profiles
      - SWOT analysis
      - Legal/regulatory risks
      - Distribution channels
      - AI-driven insights and action recommendations

      Use this when users ask for market analysis, market research, due diligence, or want to understand a new market opportunity.
    `,
    parameters: z.object({
      targetMarket: z
        .string()
        .describe(
          'Target market country or region (e.g., "United States", "Southeast Asia", "Germany")'
        ),
      industry: z
        .string()
        .describe(
          'Target industry or sector (e.g., "E-commerce", "Fintech", "Manufacturing", "Automotive")'
        ),
      productCategory: z
        .string()
        .optional()
        .describe(
          'Specific product category if applicable (e.g., "Electric Vehicles", "SaaS Software")'
        )
    }),
    execute: async ({ targetMarket, industry, productCategory }) => {
      try {
        console.log(
          `Generating market due diligence report for ${industry} in ${targetMarket}`
        )

        // Helper function to get local language search terms based on target market
        const getLocalLanguageSearches = (market: string, ind: string, prod?: string) => {
          const localSearches: string[] = []

          // Map of target markets to their local language search terms
          const marketLanguageMap: Record<string, string[]> = {
            // US/UK/Australia - English (already covered in base searches)
            'United States': [],
            'US': [],
            'USA': [],
            'United Kingdom': [],
            'UK': [],
            'Australia': [],

            // Japan - Japanese
            'Japan': [
              `日本 ${ind} 市場規模 成長予測 統計 2024 2025`,
              `日本 ${ind} トップ企業 競合 市場シェア`,
              `日本 ${ind} 規制 法規制 コンプライアンス`,
              `日本 ${ind} 消費者トレンド 顧客嗜好`,
              `日本 ${ind} 流通チャネル 販売戦略`,
              `日本 ${ind} 主要企業 売上高 財務業績`,
              prod ? `日本 ${prod} 市場機会 分析` : ''
            ].filter(Boolean),

            // Germany - German
            'Germany': [
              `Deutschland ${ind} Marktgröße Wachstumsprognose Statistik 2024 2025`,
              `Deutschland ${ind} führende Unternehmen Wettbewerber Marktanteil`,
              `Deutschland ${ind} Vorschriften rechtliche Anforderungen Compliance`,
              `Deutschland ${ind} Verbrauchertrends Kundenpräferenzen`,
              `Deutschland ${ind} Vertriebskanäle Verkaufsstrategie`,
              `Deutschland ${ind} Unternehmen Umsatz Finanzleistung`,
              prod ? `Deutschland ${prod} Marktchancen Analyse` : ''
            ].filter(Boolean),

            // France - French
            'France': [
              `France ${ind} taille du marché prévisions de croissance statistiques 2024 2025`,
              `France ${ind} principales entreprises concurrents part de marché`,
              `France ${ind} réglementations exigences légales conformité`,
              `France ${ind} tendances consommateurs préférences clients`,
              `France ${ind} canaux de distribution stratégie de vente`,
              `France ${ind} entreprises revenus performance financière`,
              prod ? `France ${prod} opportunités de marché analyse` : ''
            ].filter(Boolean),

            // Southeast Asia - Mix of languages
            'Southeast Asia': [
              `เอเชียตะวันออกเฉียงใต้ ${ind} ขนาดตลาด การเติบโต 2024 2025`,
              `Indonesia ${ind} ukuran pasar pertumbuhan statistik`,
              `Vietnam ${ind} quy mô thị trường tăng trưởng`,
              `Malaysia ${ind} saiz pasaran pertumbuhan statistik`,
            ],

            // Korea - Korean
            'Korea': [
              `한국 ${ind} 시장규모 성장전망 통계 2024 2025`,
              `한국 ${ind} 주요기업 경쟁사 시장점유율`,
              `한국 ${ind} 규제 법적요건 컴플라이언스`,
              `한국 ${ind} 소비자트렌드 고객선호도`,
              `한국 ${ind} 유통채널 판매전략`,
              `한국 ${ind} 기업 매출 재무성과`,
              prod ? `한국 ${prod} 시장기회 분석` : ''
            ].filter(Boolean),

            // Spain - Spanish
            'Spain': [
              `España ${ind} tamaño del mercado previsión de crecimiento estadísticas 2024 2025`,
              `España ${ind} principales empresas competidores cuota de mercado`,
              `España ${ind} regulaciones requisitos legales cumplimiento`,
              prod ? `España ${prod} oportunidades de mercado análisis` : ''
            ].filter(Boolean),

            // Italy - Italian
            'Italy': [
              `Italia ${ind} dimensioni del mercato previsioni di crescita statistiche 2024 2025`,
              `Italia ${ind} principali aziende concorrenti quota di mercato`,
              `Italia ${ind} regolamenti requisiti legali conformità`,
              prod ? `Italia ${prod} opportunità di mercato analisi` : ''
            ].filter(Boolean),

            // Brazil - Portuguese
            'Brazil': [
              `Brasil ${ind} tamanho do mercado previsão de crescimento estatísticas 2024 2025`,
              `Brasil ${ind} principais empresas concorrentes participação de mercado`,
              `Brasil ${ind} regulamentações requisitos legais conformidade`,
              prod ? `Brasil ${prod} oportunidades de mercado análise` : ''
            ].filter(Boolean),

            // Middle East - Arabic
            'Middle East': [
              `الشرق الأوسط ${ind} حجم السوق توقعات النمو إحصائيات 2024 2025`,
              `الشرق الأوسط ${ind} أفضل الشركات المنافسون حصة السوق`,
              prod ? `الشرق الأوسط ${prod} فرص السوق تحليل` : ''
            ].filter(Boolean),
          }

          // Find matching local language searches (case insensitive partial match)
          for (const [key, searches] of Object.entries(marketLanguageMap)) {
            if (market.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(market.toLowerCase())) {
              return searches
            }
          }

          return localSearches
        }

        // Base searches in English and Chinese
        const searches = [
          // English searches
          `${targetMarket} ${industry} market size growth forecast chart statistics 2024 2025`,
          `${targetMarket} ${industry} top companies competitors market share chart diagram`,
          `${targetMarket} ${industry} regulations legal requirements compliance`,
          `${targetMarket} ${industry} consumer trends customer preferences infographic data`,
          `${targetMarket} ${industry} distribution channels sales strategy`,
          `${targetMarket} ${industry} market analysis graph trends visualization`,
          `${targetMarket} ${industry} leading companies revenue financial performance funding`,
          `${targetMarket} ${industry} top companies business model strategy competitive advantage`,
          `${targetMarket} ${industry} companies CEO founders investors shareholders ownership`,
          `Chinese companies ${targetMarket} ${industry} expansion case study success failure`,

          // Chinese searches for broader context
          `${targetMarket} ${industry} 市场规模 增长预测 统计数据 2024 2025`,
          `${targetMarket} ${industry} 主要企业 竞争对手 市场份额`,
          `${targetMarket} ${industry} 法规 合规要求`,
          `中国企业 ${targetMarket} ${industry} 出海 案例研究`,
        ]

        // Add local language searches based on target market
        const localLanguageSearches = getLocalLanguageSearches(targetMarket, industry, productCategory)
        searches.push(...localLanguageSearches)

        if (productCategory) {
          searches.push(
            `${targetMarket} ${productCategory} market opportunities chart data`,
            `${targetMarket} ${productCategory} leading companies analysis comparison`,
            `${targetMarket} ${productCategory} 市场机会 企业分析`
          )
        }

        console.log(`Executing ${searches.length} searches including local language queries for ${targetMarket}`)

        // Execute searches in parallel
        const searchProvider = createSearchProvider(SEARCH_API)
        const searchResults = await Promise.all(
          searches.map(async query => {
            try {
              const result = await searchProvider.search(
                query,
                5, // maxResults
                'basic', // searchDepth
                [], // includeDomains
                [] // excludeDomains
              )
              return {
                query,
                results: result.results || [],
                images: result.images || []
              }
            } catch (error) {
              console.error(`Search error for query "${query}":`, error)
              return {
                query,
                results: [],
                images: []
              }
            }
          })
        )

        // Structure the report data
        const report = {
          metadata: {
            targetMarket,
            industry,
            productCategory,
            generatedAt: new Date().toISOString(),
            dataPoints: searchResults.reduce(
              (sum, r) => sum + r.results.length,
              0
            ),
            imageCount: searchResults.reduce(
              (sum, r) => sum + r.images.length,
              0
            )
          },
          sections: {
            marketSize: searchResults[0],
            competition: searchResults[1],
            regulatory: searchResults[2],
            consumerTrends: searchResults[3],
            distributionChannels: searchResults[4],
            marketVisualizations: searchResults[5],
            benchmarkFinancials: searchResults[6],
            benchmarkBusinessModel: searchResults[7],
            benchmarkManagement: searchResults[8],
            chineseBenchmarks: searchResults[9],
            productOpportunities: productCategory ? searchResults[10] : null,
            productCompanies: productCategory ? searchResults[11] : null
          },
          allResults: searchResults
        }

        console.log(
          `Market report generated with ${report.metadata.dataPoints} data points and ${report.metadata.imageCount} images`
        )

        return report
      } catch (error) {
        console.error('Error generating market due diligence report:', error)
        throw error
      }
    }
  })
}
