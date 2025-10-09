import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType
} from 'docx'
import { saveAs } from 'file-saver'

/**
 * Parse HTML content and convert to Word document paragraphs
 */
function parseHTMLToDocx(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  function processNode(
    node: Node,
    parentParagraph: Paragraph | null = null
  ): Paragraph[] {
    const results: Paragraph[] = []

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || ''
      if (text.trim()) {
        // Text nodes are handled by their parent elements
        return results
      }
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement
      const tagName = element.tagName.toLowerCase()

      switch (tagName) {
        case 'h1':
          results.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 }
            })
          )
          break

        case 'h2':
          results.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 }
            })
          )
          break

        case 'h3':
          results.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 }
            })
          )
          break

        case 'p':
          const runs = parseInlineElements(element)
          if (runs.length > 0) {
            results.push(
              new Paragraph({
                children: runs,
                spacing: { before: 100, after: 100 }
              })
            )
          } else if (element.textContent?.trim()) {
            results.push(
              new Paragraph({
                text: element.textContent,
                spacing: { before: 100, after: 100 }
              })
            )
          }
          break

        case 'ul':
          element.querySelectorAll('li').forEach((li, index) => {
            results.push(
              new Paragraph({
                text: li.textContent || '',
                bullet: { level: 0 },
                spacing: { before: 60, after: 60 }
              })
            )
          })
          break

        case 'ol':
          element.querySelectorAll('li').forEach((li, index) => {
            results.push(
              new Paragraph({
                text: li.textContent || '',
                numbering: { reference: 'default-numbering', level: 0 },
                spacing: { before: 60, after: 60 }
              })
            )
          })
          break

        case 'br':
          results.push(new Paragraph({ text: '' }))
          break

        case 'blockquote':
          results.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: element.textContent || '',
                  italics: true
                })
              ],
              indent: { left: 720 },
              spacing: { before: 100, after: 100 }
            })
          )
          break

        case 'pre':
        case 'code':
          results.push(
            new Paragraph({
              text: element.textContent || '',
              style: 'CodeBlock',
              spacing: { before: 100, after: 100 }
            })
          )
          break

        default:
          // Recursively process child nodes
          element.childNodes.forEach(child => {
            results.push(...processNode(child, parentParagraph))
          })
      }
    }

    return results
  }

  function parseInlineElements(element: HTMLElement): TextRun[] {
    const runs: TextRun[] = []

    function processInline(node: Node, styles: any = {}): void {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || ''
        if (text) {
          runs.push(new TextRun({ text, ...styles }))
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()
        const newStyles = { ...styles }

        switch (tagName) {
          case 'strong':
          case 'b':
            newStyles.bold = true
            break
          case 'em':
          case 'i':
            newStyles.italics = true
            break
          case 'u':
            newStyles.underline = { type: UnderlineType.SINGLE }
            break
          case 'a':
            const href = el.getAttribute('href')
            if (href) {
              runs.push(
                new TextRun({
                  text: el.textContent || '',
                  style: 'Hyperlink',
                  ...newStyles
                })
              )
              return
            }
            break
          case 'code':
            newStyles.font = 'Courier New'
            newStyles.size = 20
            break
        }

        el.childNodes.forEach(child => processInline(child, newStyles))
      }
    }

    element.childNodes.forEach(node => processInline(node))
    return runs
  }

  // Process all body children
  doc.body.childNodes.forEach(node => {
    paragraphs.push(...processNode(node))
  })

  return paragraphs
}

/**
 * Export rich text HTML content to Word document
 * @param content - HTML content from rich text editor
 * @param filename - Name of the Word file (without extension)
 */
export async function exportToWord(
  content: string,
  filename: string = 'document'
) {
  try {
    const paragraphs = parseHTMLToDocx(content)

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs
        }
      ],
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: 'decimal',
                text: '%1.',
                alignment: AlignmentType.LEFT
              }
            ]
          }
        ]
      },
      styles: {
        default: {
          document: {
            run: {
              font: 'Arial',
              size: 22 // 11pt
            },
            paragraph: {
              spacing: {
                line: 276, // 1.15 line spacing
                before: 0,
                after: 0
              }
            }
          }
        },
        paragraphStyles: [
          {
            id: 'CodeBlock',
            name: 'Code Block',
            basedOn: 'Normal',
            run: {
              font: 'Courier New',
              size: 20 // 10pt
            },
            paragraph: {
              indent: { left: 720 }
            }
          }
        ]
      }
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${filename}.docx`)
    return true
  } catch (error) {
    console.error('Error exporting to Word:', error)
    throw new Error('Failed to export to Word')
  }
}
