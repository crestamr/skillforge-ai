'use client'

import { useEffect } from 'react'

export function ThemeScript() {
  useEffect(() => {
    // Set initial theme based on system preference or stored preference
    const theme = localStorage.getItem('theme') || 
                 (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            const theme = localStorage.getItem('theme') || 
                         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.classList.toggle('dark', theme === 'dark');
          } catch (e) {}
        `,
      }}
    />
  )
}
