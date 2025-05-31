# Frontend - SkillForge AI

## Overview
This directory contains the Next.js 14 frontend application for SkillForge AI, an intelligent career development platform. The frontend provides a responsive, accessible user interface for skill assessments, career coaching, job matching, and learning path management.

## Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: Zustand + React Query
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts + D3.js
- **Testing**: Jest + React Testing Library + Playwright

## Project Structure
```
frontend/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── (auth)/         # Authentication routes
│   │   ├── dashboard/      # Main dashboard
│   │   ├── assessments/    # Skill assessments
│   │   ├── learning/       # Learning paths
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # Shadcn/ui components
│   │   ├── forms/         # Form components
│   │   ├── charts/        # Data visualization
│   │   └── layout/        # Layout components
│   ├── lib/               # Utility functions
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript type definitions
│   └── styles/            # Global styles
├── public/                # Static assets
├── tests/                 # Test files
└── docs/                  # Component documentation
```

## Key Features
- **Responsive Design**: Mobile-first approach with breakpoints for all devices
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation
- **Performance**: Optimized with SSR, image optimization, and code splitting
- **SEO**: Meta tags, structured data, and sitemap generation
- **PWA**: Progressive Web App capabilities for offline usage
- **Real-time**: WebSocket integration for live updates
- **Internationalization**: i18n setup for multi-language support

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Access to backend API endpoints
- Environment variables configured

### Installation
```bash
cd frontend
npm install
```

### Environment Variables
Create `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000/ws
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run test         # Run unit tests
npm run test:e2e     # Run E2E tests with Playwright
```

## Component Guidelines
- Use TypeScript with strict typing
- Follow atomic design principles
- Implement proper error boundaries
- Include loading states and skeleton screens
- Ensure accessibility compliance
- Write comprehensive tests

## Performance Considerations
- Implement code splitting for large components
- Use React.memo for expensive components
- Optimize images with Next.js Image component
- Implement proper caching strategies
- Monitor Core Web Vitals

## Deployment
- Builds are automatically deployed via GitHub Actions
- Staging: Deployed on PR merge to develop branch
- Production: Deployed on release tag creation
- CDN: Static assets served via CloudFront

## Contributing
1. Follow the established code style and conventions
2. Write tests for new components and features
3. Update documentation for significant changes
4. Ensure accessibility compliance
5. Test across different devices and browsers

## Documentation
- Component Storybook: Available in development mode
- API Documentation: See `/docs` directory
- Design System: Figma link in project wiki
- Accessibility Guide: See `/docs/accessibility.md`
