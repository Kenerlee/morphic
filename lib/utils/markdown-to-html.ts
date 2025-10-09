/**
 * Convert Markdown text to HTML for rich text editor
 * This is a simple converter that handles basic Markdown syntax
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown

  // Convert headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Convert italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Convert images (must be before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Convert unordered lists
  html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')

  // Convert ordered lists
  html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li>$1</li>')

  // Convert line breaks to paragraphs
  const lines = html.split('\n')
  const processedLines: string[] = []
  let inList = false
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Handle code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      if (inCodeBlock) {
        processedLines.push('<pre><code>')
      } else {
        processedLines.push('</code></pre>')
      }
      continue
    }

    if (inCodeBlock) {
      processedLines.push(line)
      continue
    }

    // Handle lists
    if (
      line.startsWith('<li>') ||
      line.startsWith('<ul>') ||
      line.startsWith('<ol>')
    ) {
      inList = true
      processedLines.push(line)
      continue
    }

    if (line === '</ul>' || line === '</ol>') {
      inList = false
      processedLines.push(line)
      continue
    }

    if (inList) {
      processedLines.push(line)
      continue
    }

    // Handle headings
    if (
      line.startsWith('<h1>') ||
      line.startsWith('<h2>') ||
      line.startsWith('<h3>')
    ) {
      processedLines.push(line)
      continue
    }

    // Handle images (don't wrap in paragraph)
    if (line.startsWith('<img')) {
      processedLines.push(line)
      continue
    }

    // Handle empty lines
    if (line === '') {
      if (
        processedLines.length > 0 &&
        !processedLines[processedLines.length - 1].endsWith('</p>')
      ) {
        // Don't add extra empty paragraphs
      }
      continue
    }

    // Regular text becomes paragraph
    if (!line.startsWith('<')) {
      processedLines.push(`<p>${line}</p>`)
    } else {
      processedLines.push(line)
    }
  }

  return processedLines.join('\n')
}

/**
 * Convert HTML back to Markdown for export
 */
export function htmlToMarkdown(html: string): string {
  let markdown = html

  // Remove HTML tags and convert to markdown
  markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
  markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
  markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**')
  markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**')
  markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*')
  markdown = markdown.replace(/<i>(.*?)<\/i>/g, '*$1*')
  markdown = markdown.replace(/<u>(.*?)<\/u>/g, '_$1_')

  // Convert images (must be before links)
  markdown = markdown.replace(
    /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*\/?>/g,
    '![$2]($1)'
  )
  markdown = markdown.replace(/<img[^>]+src="([^"]+)"[^>]*\/?>/g, '![]($1)')

  markdown = markdown.replace(/<a href="([^"]+)">(.*?)<\/a>/g, '[$2]($1)')
  markdown = markdown.replace(/<li>(.*?)<\/li>/g, '- $1\n')
  markdown = markdown.replace(/<ul>|<\/ul>/g, '')
  markdown = markdown.replace(/<ol>|<\/ol>/g, '')
  markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n\n')
  markdown = markdown.replace(/<br\s*\/?>/g, '\n')
  markdown = markdown.replace(
    /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
    '```\n$1\n```\n'
  )

  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n')

  return markdown.trim()
}
