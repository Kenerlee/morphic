import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Convert HTML content to text, stripping all tags
 */
function htmlToText(html: string): string {
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  return tempDiv.textContent || tempDiv.innerText || ''
}

/**
 * Export rich text content to PDF with Chinese character support
 * @param content - HTML content from rich text editor
 * @param filename - Name of the PDF file (without extension)
 */
export async function exportToPDF(
  content: string,
  filename: string = 'document'
) {
  try {
    // Create a temporary container for rendering
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 210mm;
      padding: 20mm;
      background: white;
      font-family: 'PingFang SC', 'Microsoft YaHei', 'SimHei', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
    `
    container.innerHTML = content
    document.body.appendChild(container)

    // Apply styles for better PDF rendering
    const style = document.createElement('style')
    style.textContent = `
      ${container.id} h1 { font-size: 24px; font-weight: bold; margin: 1.5em 0 0.5em; }
      ${container.id} h2 { font-size: 20px; font-weight: bold; margin: 1.3em 0 0.5em; }
      ${container.id} h3 { font-size: 18px; font-weight: bold; margin: 1.2em 0 0.5em; }
      ${container.id} p { margin: 0.8em 0; }
      ${container.id} ul, ${container.id} ol { margin: 0.8em 0; padding-left: 2em; }
      ${container.id} li { margin: 0.3em 0; }
      ${container.id} strong { font-weight: bold; }
      ${container.id} em { font-style: italic; }
      ${container.id} u { text-decoration: underline; }
      ${container.id} a { color: #0066cc; text-decoration: underline; }
      ${container.id} code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
      ${container.id} pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
    `
    document.head.appendChild(style)

    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    // Clean up
    document.body.removeChild(container)
    document.head.removeChild(style)

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    // Add first page
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`)
    return true
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export to PDF')
  }
}

/**
 * Legacy function for plain text/markdown export
 */
export async function exportPlainTextToPDF(
  content: string,
  filename: string = 'document'
) {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // PDF configuration
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    const lineHeight = 7
    let yPosition = margin

    // Set font
    pdf.setFont('helvetica')
    pdf.setFontSize(11)

    // Process content line by line
    const lines = content.split('\n')

    for (const line of lines) {
      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        pdf.addPage()
        yPosition = margin
      }

      // Handle headings (markdown style)
      if (line.startsWith('# ')) {
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        const text = line.substring(2)
        const splitText = pdf.splitTextToSize(text, maxWidth)
        pdf.text(splitText, margin, yPosition)
        yPosition += lineHeight * 1.5
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
      } else if (line.startsWith('## ')) {
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        const text = line.substring(3)
        const splitText = pdf.splitTextToSize(text, maxWidth)
        pdf.text(splitText, margin, yPosition)
        yPosition += lineHeight * 1.2
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
      } else if (line.startsWith('### ')) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        const text = line.substring(4)
        const splitText = pdf.splitTextToSize(text, maxWidth)
        pdf.text(splitText, margin, yPosition)
        yPosition += lineHeight * 1.1
        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'normal')
      } else if (line.trim() === '') {
        // Empty line
        yPosition += lineHeight * 0.5
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Bullet point
        const text = '• ' + line.substring(2)
        const splitText = pdf.splitTextToSize(text, maxWidth - 5)
        pdf.text(splitText, margin + 5, yPosition)
        yPosition += lineHeight * splitText.length
      } else if (line.match(/^\d+\./)) {
        // Numbered list
        const splitText = pdf.splitTextToSize(line, maxWidth - 5)
        pdf.text(splitText, margin + 5, yPosition)
        yPosition += lineHeight * splitText.length
      } else if (line.startsWith('```') || line.startsWith('`')) {
        // Code block - use monospace font
        pdf.setFont('courier')
        pdf.setFontSize(10)
        const text = line.replace(/```|`/g, '')
        const splitText = pdf.splitTextToSize(text, maxWidth - 10)
        pdf.text(splitText, margin + 5, yPosition)
        yPosition += lineHeight * splitText.length
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
      } else {
        // Regular text
        const splitText = pdf.splitTextToSize(line, maxWidth)
        pdf.text(splitText, margin, yPosition)
        yPosition += lineHeight * splitText.length
      }
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`)
    return true
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to export to PDF')
  }
}
