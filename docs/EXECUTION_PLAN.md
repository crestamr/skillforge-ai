# Comprehensive Prompts for AI Agent to Build SkillForge AI

This document outlines a comprehensive set of prompts for an AI agent to guide the development of SkillForge AI, an intelligent career development platform. The prompts cover project initialization, database design, backend and frontend development, AI features, infrastructure, testing, documentation, advanced features, data science, scaling, and final integration and launch.

## Project Initialization and Structure

* ✅ **COMPLETED** "Create a complete GitHub repository structure for SkillForge AI, an intelligent career development platform. The repository should follow a microservices architecture with the following directory structure:
    * `/frontend`: Next.js 14 application with TypeScript
    * `/backend`: FastAPI services for core business logic
    * `/ai-services`: Python services for HuggingFace model integrations
    * `/infrastructure`: Docker, Kubernetes, and Terraform configurations
    * `/docs`: Technical documentation and API specifications
    * `/tests`: Comprehensive test suite for all components
    * `/monitoring`: Observability configurations for Datadog and Sentry
    Include appropriate README files in each directory explaining its purpose and setup instructions."

* ✅ **COMPLETED** "Generate a comprehensive `.gitignore` file for SkillForge AI that covers:
    * Node.js/Next.js artifacts (node\_modules, .next, build outputs)
    * Python artifacts (venv, pycache, .pyc files, dist directories)
    * Environment files (.env, .env.local, .env.development)
    * IDE configurations (.vscode, .idea)
    * Docker artifacts (volumes, temporary containers)
    * Testing artifacts (coverage reports, test outputs)
    * OS-specific files (.DS\_Store, Thumbs.db)
    * Dependency lock files that should be committed (package-lock.json, yarn.lock, poetry.lock)"

* ✅ **COMPLETED** "Create a detailed Docker Compose configuration for local development of SkillForge AI with the following services:
    * Frontend: Next.js 14 with hot reloading on port 3000
    * Backend API: FastAPI with auto-reload on port 8000
    * AI Services: Python service with HuggingFace models on port 8001
    * PostgreSQL: Latest version with persistent volume on port 5432
    * MongoDB: Latest version with persistent volume on port 27017
    * Redis: For caching and session management on port 6379
    * Celery: For background job processing
    * Celery Beat: For scheduled tasks
    * Flower: For Celery monitoring on port 5555
    * MinIO: S3-compatible storage for file uploads on port 9000
    * Pinecone: Vector database for embeddings (or suitable alternative)
    Include proper environment variables, volume mappings, network configuration, and health checks. Ensure services wait for dependencies to be ready before starting."

## Database Design and Setup

* ✅ **COMPLETED** "Design a comprehensive PostgreSQL database schema for SkillForge AI with the following components:
    * **Users** table: `id`, `email`, `hashed_password`, `first_name`, `last_name`, `profile_image_url`, `bio`, `created_at`, `updated_at`, `last_login`, `account_status`, `email_verified`
    * **UserSocialAuth**: `id`, `user_id`, `provider` (GitHub/LinkedIn), `provider_user_id`, `access_token`, `refresh_token`
    * **Skills** table: `id`, `name`, `description`, `category`, `level` (beginner/intermediate/advanced), `trending_score`
    * **UserSkills**: `user_id`, `skill_id`, `self_rating`, `verified_rating`, `last_assessed`, `confidence_score`
    * **Assessments**: `id`, `title`, `description`, `skill_id`, `difficulty`, `time_limit`, `passing_score`
    * **AssessmentQuestions**: `id`, `assessment_id`, `question_text`, `question_type`, `options` (JSON), `correct_answer`, `explanation`
    * **UserAssessments**: `user_id`, `assessment_id`, `score`, `completed_at`, `time_taken`, `passed`
    * **LearningPaths**: `id`, `title`, `description`, `estimated_duration`, `difficulty`, `created_by`, `is_featured`
    * **LearningPathSkills**: `learning_path_id`, `skill_id`, `order`, `required_hours`
    * **UserLearningPaths**: `user_id`, `learning_path_id`, `progress_percentage`, `started_at`, `completed_at`
    * **LearningResources**: `id`, `title`, `url`, `type` (video/article/course), `provider`, `duration`, `skill_id`
    * **UserLearningActivity**: `user_id`, `resource_id`, `progress_percentage`, `started_at`, `completed_at`, `rating`
    * **JobPostings**: `id`, `title`, `company`, `location`, `description`, `requirements` (JSON), `salary_range`, `posted_at`, `source_url`
    * **UserJobInteractions**: `user_id`, `job_id`, `interaction_type` (viewed/saved/applied), `timestamp`
    * **IndustryTrends**: `id`, `keyword`, `sentiment_score`, `volume`, `timestamp`, `source`
    Include appropriate foreign key constraints, indexes for performance, and consider partitioning strategies for large tables. Add detailed comments explaining each table's purpose and relationships."

* ✅ **COMPLETED** "Create SQL migration scripts to initialize the PostgreSQL database for SkillForge AI. Include:
    * Table creation with proper data types, constraints, and indexes
    * Enum types for categories like skill levels, assessment types, etc.
    * Initial seed data for essential records (skill categories, assessment types)
    * User roles and permissions setup
    * Database functions and and triggers for maintaining data integrity
    * Views for commonly accessed data combinations
    * Performance optimization considerations (indexes, partitioning)
    Organize migrations in numbered files that can be applied sequentially and rolled back if needed."

* ✅ **COMPLETED** "Design a MongoDB schema for storing unstructured data in SkillForge AI with the following collections:
    * **UserPortfolios**: `{user_id, projects: [{title, description, screenshots, technologies, url, analysis_results}]}`
    * **ResumeAnalysis**: `{user_id, resume_url, parsed_sections, skills_extracted, experience_years, education, recommendations}`
    * **UserGeneratedContent**: `{user_id, content_type, content, metadata, created_at, visibility}`
    * **AICoachingConversations**: `{user_id, messages: [{role, content, timestamp}], context, summary, action_items}`
    * **MarketIntelligence**: `{category, raw_data, processed_insights, sources, timestamp, validity_period}`
    Include validation rules, indexes for common queries, and TTL indexes for data that should expire. Document the schema design choices and explain how they support the application's requirements."

## Backend Development

* ✅ **COMPLETED** "Create a comprehensive FastAPI application structure for SkillForge AI's backend with:
    * Modular router organization by feature area (auth, users, skills, assessments, learning, jobs)
    * Middleware for authentication, logging, error handling, and rate limiting
    * Dependency injection system for database connections, external APIs, and services
    * Pydantic models for request/response validation with detailed examples and descriptions
    * Background tasks and Celery integration for long-running processes
    * Comprehensive error handling with custom exception classes and error responses
    * API versioning strategy
    * Logging configuration with structured logs
    * Health check and monitoring endpoints
    * OpenAPI documentation customization
    Include proper type hints, docstrings, and follow best practices for FastAPI applications."

* ✅ **COMPLETED** "Implement a secure JWT authentication system in FastAPI for SkillForge AI with:
    * User registration with email verification
    * Login with email/password
    * OAuth integration with GitHub and LinkedIn
    * JWT token generation with proper expiration and refresh mechanism
    * Role-based access control (user, admin, enterprise)
    * Password reset flow with secure tokens
    * Account lockout after failed attempts
    * Session management with Redis
    * CSRF protection
    * Detailed security logging
    * Rate limiting for authentication endpoints
    Ensure compliance with OWASP security best practices and include comprehensive unit tests."

* ✅ **COMPLETED** "Develop a complete user management API in FastAPI with endpoints for:
    * User registration with validation and duplicate prevention
    * Profile creation and updating (personal details, skills, experience)
    * Profile image upload and processing
    * Account settings management (notifications, privacy, security)
    * User search and filtering
    * User statistics and activity tracking
    * Account deletion and data export (GDPR compliance)
    * Admin functions for user management
    * Enterprise user provisioning and management
    Include proper validation, error handling, pagination for list endpoints, and comprehensive documentation."

* ✅ **COMPLETED** "Create a HuggingFace model integration service in Python that:
    * Efficiently loads and serves multiple models (DialoGPT-medium, all-MiniLM-L6-v2, twitter-roberta-base-sentiment-latest)
    * Implements model caching and lazy loading to minimize memory usage
    * Provides a unified API for model inference with proper error handling
    * Includes request queuing for high-traffic scenarios
    * Implements batching for efficient processing
    * Provides monitoring hooks for model performance and usage statistics
    * Handles graceful degradation when models are unavailable
    * Includes model versioning and A/B testing capabilities
    * Provides utilities for model fine-tuning with user data
    * Implements proper security measures for model inputs and outputs
    Include comprehensive documentation on model capabilities, limitations, and performance characteristics."

* ✅ **COMPLETED** "Implement a resume parsing service using computer vision models that:
    * Accepts PDF and image uploads of resumes
    * Uses DiT-base-finetuned-ade-512-512 for layout analysis and section identification
    * Applies BLIP-image-captioning-base for analyzing visual elements and formatting
    * Extracts structured data including contact information, education, work experience, skills
    * Identifies career trajectory and progression
    * Provides confidence scores for extracted information
    * Handles various resume formats and layouts
    * Generates recommendations for resume improvements
    * Maps extracted skills to standardized skill taxonomy
    * Estimates years of experience by role and and technology
    Include proper error handling for poor quality uploads and comprehensive unit tests with sample resumes."

* ✅ **COMPLETED** "Develop a sophisticated job matching algorithm using sentence-transformers that:
    * Creates embeddings of user skills and experience
    * Processes job descriptions into comparable embeddings
    * Implements semantic search with configurable relevance thresholds
    * Calculates skill gap scores between user profile and job requirements
    * Provides explainable matching results highlighting strengths and gaps
    * Incorporates industry trends and demand signals into matching
    * Supports filtering by location, salary, company, and other attributes
    * Implements personalized ranking based on user preferences and history
    * Provides recommendations for skills to acquire for target roles
    * Updates in real-time as user skills or job market changes
    Include performance optimization for large-scale matching and comprehensive evaluation metrics."

## Frontend Development

* ✅ **COMPLETED** "Set up a comprehensive Next.js 14 project for SkillForge AI with:
    * TypeScript configuration with strict type checking
    * Tailwind CSS with custom theme matching brand guidelines
    * Shadcn/ui component library integration
    * React Query setup for data fetching with proper caching strategies
    * Framer Motion for animations and transitions
    * Authentication context and protected routes
    * Responsive layout system with mobile-first approach
    * SEO optimization with `next/head` and metadata
    * Error boundary implementation
    * Loading states and skeleton screens
    * Form handling with `react-hook-form` and `zod` validation
    * Internationalization setup for future localization
    * Analytics integration
    * Accessibility compliance (WCAG 2.1 AA)
    Include proper code organization, naming conventions, and documentation."

* ✅ **COMPLETED** "Create a responsive dashboard layout for SkillForge AI with:
    * Persistent navigation sidebar with collapsible sections
    * Top header with search, notifications, and user profile
    * Responsive design that adapts to desktop, tablet, and mobile
    * Dark/light mode toggle with system preference detection
    * Main content area with breadcrumbs and page title
    * Widget-based dashboard with draggable/customizable components
    * Quick action buttons for common tasks
    * Notification center with real-time updates
    * User profile dropdown with account settings and logout
    * Loading states and error handling for all components
    * Smooth transitions between sections
    * Keyboard navigation support
    Ensure the layout follows accessibility best practices and performs well on various devices."

* ✅ **COMPLETED** "Implement a comprehensive user onboarding flow in Next.js with:
    * Multi-step registration form with progress indicator
    * Form validation using Zod with helpful error messages
    * Resume upload and parsing with preview
    * Skill selection and self-assessment
    * Career goals and preferences configuration
    * LinkedIn/GitHub profile integration
    * Personalized welcome experience
    * Guided tour of key features
    * Initial skill assessment scheduling
    * Learning path recommendations based on profile
    * Email verification and account setup completion
    Ensure the flow is interruptible and can be resumed, with data saved at each step."

* ✅ **COMPLETED** "Design and implement an interactive skill assessment interface with:
    * Various question types (multiple choice, coding challenges, matching)
    * Timed assessments with progress indicator
    * Code editor with syntax highlighting for technical assessments
    * Real-time validation and feedback
    * Adaptive difficulty based on user performance
    * Visual feedback for correct/incorrect answers
    * Summary report with strengths and improvement areas
    * Skill rating updates based on performance
    * Comparison with industry benchmarks
    * Recommended learning resources based on results
    * Certificate generation for passed assessments
    * Social sharing of achievements
    Ensure the interface is accessible and works well on both desktop and mobile devices."

* "Create sophisticated data visualization components for SkillForge AI using D3.js and React that display:
    * Skill radar charts comparing user skills to job requirements
    * Job market trend graphs with filtering by location and industry
    * Salary benchmarking charts by role, experience, and location
    * Learning progress tracking with milestone indicators
    * Skill gap analysis with prioritized recommendations
    * Career trajectory projections based on skill acquisition
    * Industry demand heat maps for various skills
    * Peer comparison charts (anonymized)
    * Assessment performance analytics
    * Time-based improvement tracking
    Ensure visualizations are interactive, responsive, accessible, and include proper loading states and error handling."

## AI Features Implementation

* ✅ **COMPLETED** "Implement a conversational AI career coach using DialoGPT with:
    * Persistent conversation history stored in MongoDB
    * Context management to maintain coherent multi-turn dialogues
    * Persona configuration for coaching style (supportive, challenging, analytical)
    * Response filtering for professional and helpful content
    * Integration with user profile data for personalized advice
    * Capability to answer career-related questions with references
    * Goal setting and progress tracking features
    * Action item extraction from conversations
    * Follow-up reminders and check-ins
    * Sentiment analysis to detect user frustration or confusion
    * Escalation to human coaches when needed
    * Continuous improvement through feedback collection
    Include comprehensive prompt engineering and safeguards against harmful or misleading advice."

* ✅ **COMPLETED** "Develop a portfolio analysis service using CLIP for matching visual projects with job requirements that:
    * Processes screenshots of user projects and applications
    * Extracts visual features and UI/UX patterns
    * Identifies technologies and frameworks used based on visual cues
    * Matches visual elements with job requirement descriptions
    * Provides feedback on portfolio presentation and organization
    * Suggests improvements for visual impact and professional presentation
    * Compares portfolio against industry standards and trends
    * Generates descriptions of visual projects for resume inclusion
    * Identifies missing visual elements that would strengthen the portfolio
    * Recommends project types to develop based on career goals
    Include proper error handling for image processing and comprehensive documentation of capabilities and limitations."

* "Create a sophisticated personalized learning path generation algorithm that:
    * Analyzes user's current skill profile from assessments and self-ratings
    * Identifies skill gaps based on target job roles and market demand
    * Prioritizes skills with highest impact on employability and salary
    * Sequences learning resources in optimal order for skill building
    * Incorporates prerequisite relationships between skills
    * Adapts to user learning pace and preferences
    * Integrates with external learning platforms (LinkedIn Learning, Coursera)
    * Provides estimated time commitments and milestone achievements
    * Adjusts recommendations based on assessment results
    * Incorporates peer learning paths that led to successful outcomes
    * Balances breadth and depth of skill development
    Include A/B testing framework to evaluate effectiveness of different path generation strategies."

* "Implement a comprehensive industry sentiment analysis pipeline using the twitter-roberta model that:
    * Collects and processes data from multiple sources (Twitter, LinkedIn, tech blogs)
    * Analyzes sentiment around technologies, companies, and roles
    * Identifies emerging trends and declining technologies
    * Tracks sentiment changes over time with alerting for significant shifts
    * Correlates sentiment with job market demand and salaries
    * Provides industry-specific and location-specific insights
    * Generates weekly reports on technology sentiment trends
    * Identifies potential career opportunities based on positive sentiment momentum
    * Warns of potential skill obsolescence based on negative sentiment patterns
    * Provides confidence scores and source diversity metrics for all insights
    Include proper data cleaning, deduplication, and ethical considerations for data usage."

## Infrastructure & Deployment

* ✅ **COMPLETED** "Create comprehensive GitHub Actions workflows for CI/CD of SkillForge AI including:
    * Separate workflows for frontend, backend, and AI services
    * Linting and code quality checks (ESLint, Prettier, Black, Flake8)
    * Type checking for TypeScript and Python
    * Unit testing with coverage reporting
    * Integration testing with test databases
    * Security scanning (dependency checks, SAST)
    * Docker image building with proper tagging
    * Deployment to staging environment on PR merge to develop
    * Deployment to production on release tag creation
    * Database migration handling
    * Slack/Discord notifications for build status
    * Automatic PR labeling and assignment
    * Performance regression testing
    Include proper secrets management, caching strategies for faster builds, and comprehensive documentation."

* ✅ **COMPLETED** "Set up AWS infrastructure using Terraform for SkillForge AI with:
    * ECS Fargate clusters for containerized services
    * Auto-scaling policies based on CPU, memory, and custom metrics
    * RDS PostgreSQL with read replicas and automated backups
    * DocumentDB (MongoDB compatible) with proper sharding
    * ElastiCache Redis cluster for caching and session management
    * S3 buckets for file storage with lifecycle policies
    * CloudFront distribution for global content delivery
    * Route53 for DNS management
    * ACM for SSL certificate management
    * WAF for security and DDoS protection
    * VPC configuration with public and private subnets
    * Security groups and network ACLs
    * IAM roles with least privilege principle
    * CloudWatch for monitoring and alerting
    * AWS Backup for comprehensive backup strategy
    Include state management, module organization, and comprehensive documentation."

* ✅ **COMPLETED** "Implement monitoring and observability for SkillForge AI using:
    * Datadog for application performance monitoring
    * Custom dashboards for key business and technical metrics
    * Detailed transaction tracing across services
    * Log aggregation and analysis
    * Sentry for error tracking and grouping
    * Custom metrics for AI model performance (latency, accuracy)
    * Real-time user experience monitoring
    * Synthetic monitoring for critical user journeys
    * Alerting policies with proper escalation paths
    * SLO/SLI definition and tracking
    * Capacity planning metrics
    * Cost optimization insights
    * Security monitoring and anomaly detection
    Include proper instrumentation of code, sampling strategies for high-volume data, and documentation for incident response."

* ✅ **COMPLETED** "Create a comprehensive security implementation plan for SkillForge AI including:
    * Data encryption at rest and in transit
    * Secure key management with AWS KMS
    * Secrets management with AWS Secrets Manager
    * Authentication security with proper password hashing (Argon2id)
    * Multi-factor authentication implementation
    * Session management and secure cookie configuration
    * CSRF protection mechanisms
    * Content Security Policy configuration
    * Rate limiting and brute force protection
    * Input validation and output encoding
    * SQL injection and XSS prevention
    * Regular security scanning and penetration testing schedule
    * Vulnerability management process
    * Security incident response plan
    * GDPR and CCPA compliance measures
    * Data minimization and retention policies
    * Privacy by design principles implementation
    * Regular security training for development team
    * Audit logging for security-relevant events
    Include detailed implementation guides for each security control and compliance documentation templates."

## Testing & Documentation

* ✅ **COMPLETED** "Develop a comprehensive test suite for SkillForge AI including:
    * Unit tests for all backend services with pytest (>90% coverage)
    * Component tests for React components with React Testing Library
    * API integration tests with proper mocking of external services
    * End-to-end tests with Cypress covering critical user journeys
    * Performance tests for API endpoints and database queries
    * Load testing scenarios for peak traffic simulation
    * Security tests including OWASP Top 10 vulnerabilities
    * Accessibility tests (WCAG 2.1 AA compliance)
    * Visual regression tests for UI components
    * Mobile responsiveness tests across device sizes
    * Cross-browser compatibility tests
    * AI model evaluation tests with benchmark datasets
    * Chaos engineering tests for resilience verification
    * Data migration and backup restoration tests
    Include test fixtures, factories for test data generation, and comprehensive CI integration."

* "Create detailed API documentation using OpenAPI/Swagger for all SkillForge AI backend endpoints including:
    * Authentication and authorization requirements
    * Request parameters with validation rules and examples
    * Response schemas with examples for success and error cases
    * Rate limiting information
    * Deprecation notices and versioning information
    * Detailed descriptions of business logic and use cases
    * Code samples in multiple languages
    * Webhook documentation for event-driven integrations
    * Pagination explanation for list endpoints
    * Filtering and sorting options
    * Error codes and troubleshooting guidance
    * Performance considerations and batch processing options
    * SDK generation instructions
    * Postman collection export
    Ensure documentation is both human-readable and machine-parsable for tooling integration."

* "Write comprehensive technical documentation for SkillForge AI covering:
    * System architecture with component diagrams and interaction flows
    * Data flow diagrams for key processes
    * Database schema documentation with entity relationship diagrams
    * API design principles and patterns used
    * Authentication and authorization model
    * Caching strategy and implementation
    * Background job processing architecture
    * AI model selection rationale and performance characteristics
    * Deployment architecture and scaling strategy
    * Monitoring and observability implementation
    * Disaster recovery and business continuity plans
    * Development environment setup guide
    * Contribution guidelines and code standards
    * Release process and versioning strategy
    * Feature flag implementation and management
    * Performance optimization techniques implemented
    * Security controls and compliance measures
    * Third-party integrations and dependencies
    Include diagrams, code examples, and decision records explaining architectural choices."

## Advanced Features

* ✅ **COMPLETED** "Implement audio learning content generation using microsoft/speecht5\_tts model that:
    * Converts text-based learning materials to natural-sounding audio
    * Supports multiple voices and speaking styles
    * Adjusts pacing based on content complexity
    * Handles technical terminology with proper pronunciation
    * Inserts appropriate pauses and emphasis
    * Generates chapter markers and navigation points
    * Creates audio summaries of longer content
    * Provides audio versions of feedback and assessments
    * Implements progressive loading for large audio files
    * Includes playback speed control and position memory
    * Supports offline downloading for mobile learning
    * Integrates with learning path progress tracking
    Include proper error handling, fallback mechanisms, and comprehensive testing with various content types."

* "Develop an enterprise integration API for SkillForge AI that enables:
    * Single Sign-On with enterprise identity providers (SAML, OIDC)
    * Bulk user provisioning and deprovisioning
    * Role-based access control with custom permission sets
    * Custom learning path creation and assignment
    * Team and department grouping
    * Manager dashboards for team skill tracking
    * Custom assessment creation and scheduling
    * Integration with HR systems (Workday, SAP SuccessFactors)
    * Learning management system (LMS) integration
    * Reporting API for custom analytics
    * Audit logs for compliance requirements
    * Custom branding and white-labeling options
    * Data export capabilities for enterprise systems
    * SLA monitoring and reporting
    Include comprehensive documentation, client libraries in multiple languages, and sandbox environment for testing."

* "Create a mobile-responsive design system for SkillForge AI with:
    * Progressive Web App configuration for offline capabilities
    * Responsive components that adapt to phone, tablet, and desktop
    * Touch-optimized interactions for mobile users
    * Device-specific optimizations (notch handling, safe areas)
    * Reduced network payload for mobile connections
    * Battery-efficient animations and effects
    * Push notification integration
    * Mobile-specific navigation patterns
    * Gesture support for common actions
    * Form factor detection and adaptation
    * Screen reader and accessibility optimizations for mobile
    * Orientation change handling
    * Virtual keyboard awareness
    * Deep linking support
    Include comprehensive testing across devices and comprehensive documentation of responsive behaviors."

* "Implement a sophisticated recommendation system for SkillForge AI that:
    * Combines collaborative filtering with content-based approaches
    * Incorporates user feedback through explicit ratings and implicit behavior
    * Implements A/B testing framework for recommendation strategies
    * Provides explainable recommendations with reasoning
    * Balances exploration (new content) with exploitation (known preferences)
    * Adapts to changing user needs and career stage
    * Incorporates time-sensitivity for trending skills and technologies
    * Handles cold-start problem for new users and new content
    * Implements diversity and serendipity in recommendations
    * Provides real-time updates based on user interactions
    * Includes fallback strategies when data is sparse
    * Measures and optimizes for long-term user success metrics
    Include proper evaluation metrics, offline testing methodology, and monitoring for recommendation quality."

## Data Science and Analytics

* ✅ **COMPLETED** "Design and implement a comprehensive analytics system for SkillForge AI that:
    * Tracks key user engagement metrics (DAU/MAU, session length, feature usage)
    * Measures learning outcomes and skill improvement
    * Analyzes conversion funnel from registration to paid features
    * Implements cohort analysis for user retention
    * Provides churn prediction and prevention insights
    * Measures content effectiveness and engagement
    * Tracks job application success rates
    * Analyzes skill assessment performance across user segments
    * Provides A/B testing framework for feature optimization
    * Implements user segmentation based on behavior and goals
    * Creates executive dashboards for key business metrics
    * Provides predictive analytics for business forecasting
    Include proper data anonymization, compliance with privacy regulations, and documentation of metrics definitions."

* ✅ **COMPLETED** "Develop a skill taxonomy and ontology system for SkillForge AI that:
    * Creates hierarchical relationships between skills (parent/child)
    * Maps equivalent skills across different naming conventions
    * Tracks skill relevance and demand over time
    * Connects skills to learning resources and assessments
    * Identifies prerequisite relationships between skills
    * Maps skills to job roles and career paths
    * Incorporates industry-standard frameworks (SFIA, NICE)
    * Provides API for skill normalization and matching
    * Automatically identifies new skills from job postings
    * Maintains versioning for skill definitions and relationships
    * Supports multiple languages and regional variations
    Include comprehensive documentation, visualization tools, and maintenance processes."

* "Create a career path modeling system for SkillForge AI that:
    * Analyzes thousands of career trajectories from public profiles
    * Identifies common progression patterns by industry and role
    * Calculates skill acquisition sequences that lead to promotions
    * Predicts salary progression based on skill acquisition
    * Identifies critical junction points in career development
    * Compares user's current trajectory with successful patterns
    * Recommends optimal next roles based on goals and current skills
    * Provides time-to-achievement estimates for career goals
    * Identifies alternative paths to desired outcomes
    * Adapts to changing industry trends and requirements
    * Incorporates geographic and industry-specific variations
    Include ethical considerations, data anonymization, and comprehensive validation methodology."

## Scaling and Growth

* "Design an internationalization and localization strategy for SkillForge AI that:
    * Implements i18n framework for UI text and content
    * Supports right-to-left languages and non-Latin scripts
    * Adapts to cultural differences in career development
    * Localizes skill taxonomies for regional job markets
    * Provides region-specific job market intelligence
    * Adapts assessment content for cultural relevance
    * Implements multi-currency support for payments
    * Complies with regional privacy and data regulations
    * Optimizes performance for global access
    * Implements content delivery network strategy
    * Provides translation workflow for learning content
    * Supports date, time, and number formatting by locale
    Include implementation plan, testing strategy, and maintenance processes for localized content."

* "Develop a comprehensive marketing and growth API for SkillForge AI that enables:
    * User referral and invitation system
    * Achievement sharing on social platforms
    * Custom landing pages for marketing campaigns
    * A/B testing of onboarding flows and messaging
    * Attribution tracking for user acquisition
    * Email marketing integration with segmentation
    * Personalized re-engagement campaigns
    * In-app messaging and announcements
    * Feature discovery and onboarding tours
    * Promotion code and discount management
    * Viral loops and growth mechanisms
    * User feedback collection and analysis
    Include analytics integration, performance measurement, and documentation for marketing teams."

* "Create a complete payment and subscription system for SkillForge AI that:
    * Implements tiered subscription plans (Free, Pro, Enterprise)
    * Supports multiple payment providers (Stripe, PayPal)
    * Handles recurring billing and invoice generation
    * Implements trial periods and promotional pricing
    * Provides subscription management for users
    * Handles payment failure and retry logic
    * Implements dunning management for failed payments
    * Provides reporting and revenue analytics
    * Supports tax calculation and compliance
    * Implements refund and credit processes
    * Handles currency conversion for international users
    * Provides enterprise billing with purchase orders
    Include comprehensive testing, security measures for payment data, and compliance documentation."

## Final Integration and Launch

* "Develop a comprehensive launch plan for SkillForge AI including:
    * Feature flag configuration for staged rollout
    * Database migration strategy from development to production
    * Load testing scenarios and acceptance criteria
    * Monitoring and alerting setup for launch day
    * Rollback procedures in case of critical issues
    * User communication plan for launch and known issues
    * Support workflow and escalation paths
    * Traffic management and scaling strategy
    * Press and social media coordination
    * Analytics tracking for launch metrics
    * Post-launch bug triage process
    * Early user feedback collection mechanism
    Include detailed checklists, responsible parties, and timeline with dependencies."

* "Create a comprehensive user onboarding and success plan for SkillForge AI that:
    * Designs personalized welcome experiences by user segment
    * Implements progressive feature discovery
    * Creates interactive tutorials for key features
    * Develops knowledge base and help center content
    * Implements in-app support chat and ticketing
    * Creates email sequences for user activation
    * Designs re-engagement campaigns for dormant users
    * Implements success metrics and health scoring
    * Creates customer journey maps with intervention points
    * Develops feedback collection at critical moments
    * Implements NPS and satisfaction measurement
    * Creates community building and peer support mechanisms
    Include implementation details, success metrics, and continuous improvement process."