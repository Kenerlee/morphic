'use client'

import { ReactNode } from 'react'

import { EditProvider } from '../edit/edit-context'
import { EditWorkspaceContainer } from '../edit/edit-workspace-container'

import { ArtifactProvider } from './artifact-context'
import { ChatArtifactContainer } from './chat-artifact-container'

export default function ArtifactRoot({ children }: { children: ReactNode }) {
  return (
    <EditProvider>
      <ArtifactProvider>
        <EditWorkspaceContainer>
          <ChatArtifactContainer>{children}</ChatArtifactContainer>
        </EditWorkspaceContainer>
      </ArtifactProvider>
    </EditProvider>
  )
}
