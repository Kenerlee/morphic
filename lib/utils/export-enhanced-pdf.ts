import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface ExportPDFOptions {
  title?: string
  content: string
  filename?: string
}

export async function exportToPDF({
  title,
  content,
  filename
}: ExportPDFOptions) {
  // Create a temporary container for rendering
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm' // A4 width
  container.style.padding = '20mm'
  container.style.backgroundColor = '#ffffff'
  container.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
  container.style.fontSize = '14px'
  container.style.lineHeight = '1.6'
  container.style.color = '#000000'

  // Add title
  if (title) {
    const titleElement = document.createElement('h1')
    titleElement.textContent = title
    titleElement.style.fontSize = '24px'
    titleElement.style.fontWeight = 'bold'
    titleElement.style.marginBottom = '20px'
    titleElement.style.color = '#000000'
    container.appendChild(titleElement)
  }

  // Add content
  const contentDiv = document.createElement('div')
  contentDiv.innerHTML = content
  contentDiv.style.wordWrap = 'break-word'

  // Style images
  const images = contentDiv.querySelectorAll('img')
  images.forEach(img => {
    ;(img as HTMLImageElement).style.maxWidth = '100%'
    ;(img as HTMLImageElement).style.height = 'auto'
    ;(img as HTMLImageElement).style.display = 'block'
    ;(img as HTMLImageElement).style.margin = '10px 0'
    ;(img as HTMLImageElement).crossOrigin = 'anonymous'
  })

  // Style links
  const links = contentDiv.querySelectorAll('a')
  links.forEach(link => {
    ;(link as HTMLElement).style.color = '#0066cc'
    ;(link as HTMLElement).style.textDecoration = 'underline'
  })

  // Style headings
  const h1s = contentDiv.querySelectorAll('h1')
  h1s.forEach(h1 => {
    ;(h1 as HTMLElement).style.fontSize = '22px'
    ;(h1 as HTMLElement).style.fontWeight = 'bold'
    ;(h1 as HTMLElement).style.marginTop = '20px'
    ;(h1 as HTMLElement).style.marginBottom = '10px'
    ;(h1 as HTMLElement).style.color = '#000000'
  })

  const h2s = contentDiv.querySelectorAll('h2')
  h2s.forEach(h2 => {
    ;(h2 as HTMLElement).style.fontSize = '18px'
    ;(h2 as HTMLElement).style.fontWeight = 'bold'
    ;(h2 as HTMLElement).style.marginTop = '16px'
    ;(h2 as HTMLElement).style.marginBottom = '8px'
    ;(h2 as HTMLElement).style.color = '#000000'
  })

  const h3s = contentDiv.querySelectorAll('h3')
  h3s.forEach(h3 => {
    ;(h3 as HTMLElement).style.fontSize = '16px'
    ;(h3 as HTMLElement).style.fontWeight = 'bold'
    ;(h3 as HTMLElement).style.marginTop = '14px'
    ;(h3 as HTMLElement).style.marginBottom = '6px'
    ;(h3 as HTMLElement).style.color = '#000000'
  })

  // Style tables
  const tables = contentDiv.querySelectorAll('table')
  tables.forEach(table => {
    ;(table as HTMLElement).style.width = '100%'
    ;(table as HTMLElement).style.borderCollapse = 'collapse'
    ;(table as HTMLElement).style.marginTop = '10px'
    ;(table as HTMLElement).style.marginBottom = '10px'

    const cells = table.querySelectorAll('th, td')
    cells.forEach(cell => {
      ;(cell as HTMLElement).style.border = '1px solid #ddd'
      ;(cell as HTMLElement).style.padding = '8px'
      ;(cell as HTMLElement).style.textAlign = 'left'
    })

    const ths = table.querySelectorAll('th')
    ths.forEach(th => {
      ;(th as HTMLElement).style.backgroundColor = '#f2f2f2'
      ;(th as HTMLElement).style.fontWeight = 'bold'
    })
  })

  container.appendChild(contentDiv)
  document.body.appendChild(container)

  try {
    // Wait for images to load
    const imgElements = Array.from(container.querySelectorAll('img'))
    await Promise.all(
      imgElements.map(
        img =>
          new Promise((resolve, reject) => {
            if ((img as HTMLImageElement).complete) {
              resolve(null)
            } else {
              img.addEventListener('load', () => resolve(null))
              img.addEventListener('error', () => resolve(null)) // Continue even if image fails
              // Timeout after 5 seconds
              setTimeout(() => resolve(null), 5000)
            }
          })
      )
    )

    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2, // Higher quality
      useCORS: true, // Allow cross-origin images
      logging: false,
      backgroundColor: '#ffffff'
    })

    // Create PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pageHeight = 297 // A4 height in mm
    let heightLeft = imgHeight
    let position = 0

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Add remaining pages if content is longer than one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    // Save the PDF
    const pdfFilename = filename || `report-${Date.now()}.pdf`
    pdf.save(pdfFilename)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    throw error
  } finally {
    // Clean up
    document.body.removeChild(container)
  }
}
