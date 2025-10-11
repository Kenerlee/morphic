/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression
  compress: true,

  // Use SWC minifier for better performance
  swcMinify: true,

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // Experimental optimizations
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      '@tiptap/react',
      '@tiptap/extension-color',
      '@tiptap/extension-dropcursor',
      '@tiptap/extension-image',
      '@tiptap/extension-link',
      '@tiptap/extension-placeholder',
      '@tiptap/extension-table',
      '@tiptap/extension-table-cell',
      '@tiptap/extension-table-header',
      '@tiptap/extension-table-row',
      '@tiptap/extension-task-item',
      '@tiptap/extension-task-list',
      '@tiptap/extension-text-align',
      '@tiptap/extension-text-style',
      '@tiptap/extension-underline',
      '@tiptap/starter-kit',
      'lucide-react',
      'date-fns'
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/vi/**'
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**' // Google user content often follows this pattern
      }
    ]
  }
}

export default nextConfig
