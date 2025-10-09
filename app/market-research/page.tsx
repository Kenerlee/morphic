import { generateId } from 'ai'

import { getModels } from '@/lib/config/models'

import { MarketResearchChat } from '@/components/market-research-chat'

export default async function MarketResearchPage() {
  const id = generateId()
  const models = await getModels()
  return <MarketResearchChat key={id} id={id} models={models} />
}
