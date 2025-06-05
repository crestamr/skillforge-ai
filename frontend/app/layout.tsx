import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
// import { ThemeProvider } from '@/components/providers/theme-provider'
// import { QueryProvider } from '@/components/providers/query-provider'
import { AuthProvider } from '../src/contexts/AuthContext'
// import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { ThemeScript } from '@/components/theme-script'
import { LayoutFix } from '@/components/layout/LayoutFix'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'SkillForge AI - Intelligent Career Development',
    template: '%s | SkillForge AI'
  },
  description: 'AI-powered career development platform with intelligent skill assessment, personalized learning paths, and real-time job matching.',
  keywords: [
    'career development',
    'AI assessment',
    'job matching',
    'skill development',
    'learning paths',
    'career coaching'
  ],
  authors: [
    {
      name: 'SkillForge AI Team',
      url: 'https://skillforge.ai',
    },
  ],
  creator: 'SkillForge AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://skillforge.ai',
    title: 'SkillForge AI - Intelligent Career Development',
    description: 'AI-powered career development platform with intelligent skill assessment, personalized learning paths, and real-time job matching.',
    siteName: 'SkillForge AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SkillForge AI - Intelligent Career Development',
    description: 'AI-powered career development platform with intelligent skill assessment, personalized learning paths, and real-time job matching.',
    creator: '@skillforgeai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
        suppressHydrationWarning
      >
        <AuthProvider>
          <LayoutFix>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
            </div>
          </LayoutFix>
        </AuthProvider>
      </body>
    </html>
  )
}
