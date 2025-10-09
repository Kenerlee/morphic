import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType} from 'docx'
import { saveAs } from 'file-saver'

interface ExportWordOptions {
  title?: string
  content: string
  filename?: string
}

// Helper function to convert image URL to base64
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' })
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        // Remove data URL prefix
        const base64Data = base64.split(',')[1]
        resolve(base64Data || null)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  }
}

export async function exportToWord({
  title,
  content,
  filename
}: ExportWordOptions) {
  const children: (Paragraph | Table)[] = []

  // Add title if provided
  if (title) {
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 400 }
      })
    )
  }

  // Parse HTML content
  const parser = new DOMParser()
  const htmlDoc = parser.parseFromString(content, 'text/html')

  // Process content elements
  const elements = htmlDoc.body.children

  for (const element of Array.from(elements)) {
    const tagName = element.tagName.toLowerCase()
    const text = element.textContent || ''

    switch (tagName) {
      case 'h1':
        children.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          })
        )
        break

      case 'h2':
        children.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          })
        )
        break

      case 'h3':
        children.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 160, after: 80 }
          })
        )
        break

      case 'p':
        if (
          text.trim() ||
          element.querySelector('a') ||
          element.querySelector('img')
        ) {
          // Process paragraph with potential links
          const pChildren: (TextRun | ExternalHyperlink)[] = []

          // Check for links in paragraph
          const links = Array.from(element.querySelectorAll('a'))
          if (links.length > 0) {
            let lastIndex = 0
            const fullHTML = element.innerHTML

            links.forEach(link => {
              const linkText = link.textContent || ''
              const href = link.getAttribute('href') || ''
              const linkHTML = link.outerHTML
              const linkIndex = fullHTML.indexOf(linkHTML, lastIndex)

              // Add text before link
              if (linkIndex > lastIndex) {
                const beforeText = fullHTML
                  .substring(lastIndex, linkIndex)
                  .replace(/<[^>]*>/g, '')
                  .trim()
                if (beforeText) {
                  pChildren.push(new TextRun({ text: beforeText + ' ' }))
                }
              }

              // Add hyperlink
              pChildren.push(
                new ExternalHyperlink({
                  children: [
                    new TextRun({
                      text: linkText,
                      style: 'Hyperlink',
                      color: '0066CC',
                      underline: {}
                    })
                  ],
                  link: href
                })
              )

              lastIndex = linkIndex + linkHTML.length
            })

            // Add remaining text
            if (lastIndex < fullHTML.length) {
              const afterText = fullHTML
                .substring(lastIndex)
                .replace(/<[^>]*>/g, '')
                .trim()
              if (afterText) {
                pChildren.push(new TextRun({ text: ' ' + afterText }))
              }
            }

            if (pChildren.length > 0) {
              children.push(
                new Paragraph({
                  children: pChildren,
                  spacing: { after: 160 }
                })
              )
            }
          } else if (text.trim()) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text })],
                spacing: { after: 160 }
              })
            )
          }
        }
        break

      case 'ul':
      case 'ol':
        const items = Array.from(element.querySelectorAll('li'))
        items.forEach((item, index) => {
          const itemText = item.textContent || ''
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    tagName === 'ol'
                      ? `${index + 1}. ${itemText}`
                      : `• ${itemText}`
                })
              ],
              spacing: { after: 80 },
              indent: { left: 720 }
            })
          )
        })
        break

      case 'blockquote':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text,
                italics: true,
                color: '666666'
              })
            ],
            spacing: { after: 160 },
            indent: { left: 720 },
            border: {
              left: {
                color: 'CCCCCC',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6
              }
            }
          })
        )
        break

      case 'code':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text,
                font: 'Courier New',
                size: 20
              })
            ],
            spacing: { after: 160 },
            shading: {
              fill: 'F5F5F5'
            }
          })
        )
        break

      case 'table':
        const tableRows: TableRow[] = []

        // Extract headers
        const thead = element.querySelector('thead')
        if (thead) {
          const headerCells = Array.from(thead.querySelectorAll('th'))
          const headerRow = new TableRow({
            children: headerCells.map(
              cell =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell.textContent || '',
                          bold: true
                        })
                      ]
                    })
                  ],
                  shading: {
                    fill: 'D9EAD3'
                  }
                })
            )
          })
          tableRows.push(headerRow)
        }

        // Extract rows
        const tbody = element.querySelector('tbody')
        if (tbody) {
          const bodyRows = Array.from(tbody.querySelectorAll('tr'))
          bodyRows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'))
            const tableRow = new TableRow({
              children: cells.map(
                cell =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: cell.textContent || '' })
                        ]
                      })
                    ]
                  })
              )
            })
            tableRows.push(tableRow)
          })
        }

        if (tableRows.length > 0) {
          children.push(
            new Table({
              rows: tableRows,
              width: {
                size: 100,
                type: WidthType.PERCENTAGE
              }
            })
          )

          children.push(new Paragraph({ text: '', spacing: { after: 160 } }))
        }
        break

      case 'hr':
        children.push(
          new Paragraph({
            border: {
              bottom: {
                color: 'CCCCCC',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6
              }
            },
            spacing: { after: 160 }
          })
        )
        break

      case 'strong':
      case 'b':
        if (text.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text, bold: true })],
              spacing: { after: 80 }
            })
          )
        }
        break

      case 'em':
      case 'i':
        if (text.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text, italics: true })],
              spacing: { after: 80 }
            })
          )
        }
        break

      case 'img':
        const imgElement = element as HTMLImageElement
        const imgSrc = imgElement.src
        const imgAlt = imgElement.alt || '图片'

        if (imgSrc) {
          try {
            // For now, add image placeholder with link
            // Full image embedding requires base64 conversion which is complex
            children.push(
              new Paragraph({
                children: [
                  new ExternalHyperlink({
                    children: [
                      new TextRun({
                        text: `[图片: ${imgAlt}]`,
                        color: '0066CC',
                        underline: {}
                      })
                    ],
                    link: imgSrc
                  })
                ],
                spacing: { after: 160 }
              })
            )
          } catch (error) {
            console.error('Error adding image:', error)
            // Add text placeholder if image fails
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `[图片: ${imgAlt}]` })],
                spacing: { after: 160 }
              })
            )
          }
        }
        break

      case 'a':
        const linkElement = element as HTMLAnchorElement
        const linkHref = linkElement.href
        const linkText = linkElement.textContent || linkHref

        if (linkHref) {
          children.push(
            new Paragraph({
              children: [
                new ExternalHyperlink({
                  children: [
                    new TextRun({
                      text: linkText,
                      style: 'Hyperlink',
                      color: '0066CC',
                      underline: {}
                    })
                  ],
                  link: linkHref
                })
              ],
              spacing: { after: 80 }
            })
          )
        }
        break

      default:
        if (text.trim()) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text })],
              spacing: { after: 80 }
            })
          )
        }
    }
  }

  // Create the document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  })

  // Generate and download the file
  const blob = await Packer.toBlob(doc)
  const wordFilename = filename || `report-${Date.now()}.docx`
  saveAs(blob, wordFilename)
}
