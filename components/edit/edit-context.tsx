'use client'

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer
} from 'react'

import { useSidebar } from '../ui/sidebar'

interface EditState {
  messageId: string | null
  originalContent: string
  editedContent: string
  isOpen: boolean
  isDirty: boolean
}

type EditAction =
  | {
      type: 'OPEN'
      payload: { messageId: string; content: string }
    }
  | { type: 'CLOSE' }
  | { type: 'UPDATE_CONTENT'; payload: string }
  | { type: 'RESET_CONTENT' }
  | { type: 'MARK_CLEAN' }

const initialState: EditState = {
  messageId: null,
  originalContent: '',
  editedContent: '',
  isOpen: false,
  isDirty: false
}

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'OPEN':
      return {
        messageId: action.payload.messageId,
        originalContent: action.payload.content,
        editedContent: action.payload.content,
        isOpen: true,
        isDirty: false
      }
    case 'CLOSE':
      return {
        ...initialState
      }
    case 'UPDATE_CONTENT':
      return {
        ...state,
        editedContent: action.payload,
        isDirty: action.payload !== state.originalContent
      }
    case 'RESET_CONTENT':
      return {
        ...state,
        editedContent: state.originalContent,
        isDirty: false
      }
    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false
      }
    default:
      return state
  }
}

interface EditContextValue {
  state: EditState
  open: (messageId: string, content: string) => void
  close: () => void
  updateContent: (content: string) => void
  resetContent: () => void
  markClean: () => void
}

const EditContext = createContext<EditContextValue | undefined>(undefined)

export function EditProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editReducer, initialState)
  const { setOpen, open: sidebarOpen } = useSidebar()

  const close = useCallback(() => {
    // Check for unsaved changes
    if (state.isDirty) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      )
      if (!confirm) return
    }
    dispatch({ type: 'CLOSE' })
  }, [state.isDirty])

  // Close edit workspace when sidebar opens
  useEffect(() => {
    if (sidebarOpen && state.isOpen) {
      if (!state.isDirty) {
        dispatch({ type: 'CLOSE' })
      }
    }
  }, [sidebarOpen, state.isOpen, state.isDirty])

  const open = useCallback(
    (messageId: string, content: string) => {
      dispatch({ type: 'OPEN', payload: { messageId, content } })
      setOpen(false)
    },
    [setOpen]
  )

  const updateContent = useCallback((content: string) => {
    dispatch({ type: 'UPDATE_CONTENT', payload: content })
  }, [])

  const resetContent = useCallback(() => {
    dispatch({ type: 'RESET_CONTENT' })
  }, [])

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' })
  }, [])

  return (
    <EditContext.Provider
      value={{ state, open, close, updateContent, resetContent, markClean }}
    >
      {children}
    </EditContext.Provider>
  )
}

export function useEdit() {
  const context = useContext(EditContext)
  if (context === undefined) {
    throw new Error('useEdit must be used within an EditProvider')
  }
  return context
}
