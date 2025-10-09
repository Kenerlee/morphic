'use client'

import { useState } from 'react'

import { ToolInvocation } from 'ai'
import { ArrowRight, Check, SkipForward } from 'lucide-react'

import { useTranslations } from '@/lib/i18n/provider'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

interface QuestionConfirmationProps {
  toolInvocation: ToolInvocation
  onConfirm: (toolCallId: string, approved: boolean, response?: any) => void
  isCompleted?: boolean
}

interface QuestionOption {
  value: string
  label: string
}

export function QuestionConfirmation({
  toolInvocation,
  onConfirm,
  isCompleted = false
}: QuestionConfirmationProps) {
  const t = useTranslations()

  const {
    question,
    options,
    allowsInput,
    inputLabel,
    inputPlaceholder,
    inputFields
  } = toolInvocation.args

  // Get result data if available
  const resultData =
    toolInvocation.state === 'result' && toolInvocation.result
      ? toolInvocation.result
      : null

  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [inputText, setInputText] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [completed, setCompleted] = useState(isCompleted)
  const [skipped, setSkipped] = useState(false)

  const isButtonDisabled =
    inputFields && inputFields.length > 0
      ? inputFields.some(
          (field: any) => field.required && !fieldValues[field.name]?.trim()
        )
      : selectedOptions.length === 0 &&
        (!allowsInput || inputText.trim() === '')

  const handleOptionChange = (label: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(label)) {
        return prev.filter(item => item !== label)
      } else {
        return [...prev, label]
      }
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
  }

  const handleSkip = () => {
    setSkipped(true)
    setCompleted(true)
    onConfirm(toolInvocation.toolCallId, false, { skipped: true })
  }

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const response = {
      selectedOptions,
      inputText: inputText.trim(),
      fieldValues: inputFields ? fieldValues : undefined,
      question
    }

    onConfirm(toolInvocation.toolCallId, true, response)
    setCompleted(true)
  }

  // Get options to display (from result or local state)
  const getDisplayedOptions = (): string[] => {
    if (resultData && Array.isArray(resultData.selectedOptions)) {
      return resultData.selectedOptions
    }
    return selectedOptions
  }

  // Get input text to display (from result or local state)
  const getDisplayedInputText = (): string => {
    if (resultData && resultData.inputText) {
      return resultData.inputText
    }
    return inputText
  }

  // Check if question was skipped
  const wasSkipped = (): boolean => {
    if (resultData && resultData.skipped) {
      return true
    }
    return skipped
  }

  const updatedQuery = () => {
    // If skipped, show skipped message
    if (wasSkipped()) {
      return t('research.questionSkipped')
    }

    const displayOptions = getDisplayedOptions()
    const displayInputText = getDisplayedInputText()

    const optionsText =
      displayOptions.length > 0
        ? `${t('questionConfirmation.selected')}${displayOptions.join(', ')}`
        : ''

    const inputTextDisplay =
      displayInputText.trim() !== ''
        ? `${t('questionConfirmation.input')}${displayInputText}`
        : ''

    return [optionsText, inputTextDisplay].filter(Boolean).join(' | ')
  }

  // Show result view if completed or if tool has result state
  if (completed || toolInvocation.state === 'result') {
    const isSkipped = wasSkipped()

    return (
      <Card className="p-3 md:p-4 w-full flex flex-col justify-between items-center gap-2">
        <CardTitle className="text-base font-medium text-muted-foreground w-full">
          {question}
        </CardTitle>
        <div className="flex items-center justify-start gap-1 w-full">
          {isSkipped ? (
            <SkipForward size={16} className="text-yellow-500 w-4 h-4" />
          ) : (
            <Check size={16} className="text-green-500 w-4 h-4" />
          )}
          <h5 className="text-muted-foreground text-xs truncate">
            {updatedQuery()}
          </h5>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{question}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-wrap justify-start mb-4">
            {options &&
              options.map((option: QuestionOption, index: number) => (
                <div
                  key={`option-${index}`}
                  className="flex items-center space-x-1.5 mb-2"
                >
                  <Checkbox
                    id={option.value}
                    checked={selectedOptions.includes(option.label)}
                    onCheckedChange={() => handleOptionChange(option.label)}
                  />
                  <label
                    className="text-sm whitespace-nowrap pr-4"
                    htmlFor={option.value}
                  >
                    {option.label}
                  </label>
                </div>
              ))}
          </div>

          {inputFields && inputFields.length > 0 ? (
            <div className="mb-6 flex flex-col space-y-4">
              {/* First row: Target market and Industry side by side */}
              {inputFields.length >= 4 && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Target market (index 0) */}
                  <div className="flex flex-col space-y-2 text-sm">
                    <label
                      className="text-muted-foreground font-medium"
                      htmlFor={inputFields[0].name}
                    >
                      {inputFields[0].label}
                      {inputFields[0].required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <Input
                      type="text"
                      name={inputFields[0].name}
                      className="w-full"
                      id={inputFields[0].name}
                      placeholder={inputFields[0].placeholder}
                      value={fieldValues[inputFields[0].name] || ''}
                      onChange={e =>
                        handleFieldChange(inputFields[0].name, e.target.value)
                      }
                      required={inputFields[0].required}
                    />
                  </div>
                  {/* Industry (index 3) */}
                  <div className="flex flex-col space-y-2 text-sm">
                    <label
                      className="text-muted-foreground font-medium"
                      htmlFor={inputFields[3].name}
                    >
                      {inputFields[3].label}
                      {inputFields[3].required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <Input
                      type="text"
                      name={inputFields[3].name}
                      className="w-full"
                      id={inputFields[3].name}
                      placeholder={inputFields[3].placeholder}
                      value={fieldValues[inputFields[3].name] || ''}
                      onChange={e =>
                        handleFieldChange(inputFields[3].name, e.target.value)
                      }
                      required={inputFields[3].required}
                    />
                  </div>
                </div>
              )}
              {/* Remaining fields (Company name, Product/Service, Additional requirements) */}
              {inputFields
                .filter(
                  (field: any, index: number) => index !== 0 && index !== 3
                )
                .map((field: any) => (
                  <div
                    key={field.name}
                    className="flex flex-col space-y-2 text-sm"
                  >
                    <label
                      className="text-muted-foreground font-medium"
                      htmlFor={field.name}
                    >
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <Input
                      type="text"
                      name={field.name}
                      className="w-full"
                      id={field.name}
                      placeholder={field.placeholder}
                      value={fieldValues[field.name] || ''}
                      onChange={e =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      required={field.required}
                    />
                  </div>
                ))}
            </div>
          ) : allowsInput ? (
            <div className="mb-6 flex flex-col space-y-2 text-sm">
              <label className="text-muted-foreground" htmlFor="query">
                {inputLabel}
              </label>
              <Input
                type="text"
                name="additional_query"
                className="w-full"
                id="query"
                placeholder={inputPlaceholder}
                value={inputText}
                onChange={handleInputChange}
              />
            </div>
          ) : null}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleSkip}>
              <SkipForward size={16} className="mr-1" />
              {t('buttons.skip')}
            </Button>
            <Button type="submit" disabled={isButtonDisabled}>
              <ArrowRight size={16} className="mr-1" />
              {t('buttons.send')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
