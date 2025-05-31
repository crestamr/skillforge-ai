export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8">
          🎯 <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">SkillForge AI</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Intelligent Career Development Platform powered by Advanced AI
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl">
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-lg font-semibold mb-2">AI Assessment</h3>
            <p className="text-sm text-gray-600">Intelligent skill evaluation using multimodal AI models</p>
          </div>
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">Career Coach</h3>
            <p className="text-sm text-gray-600">24/7 AI-powered career guidance and personalized advice</p>
          </div>
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2">Job Matching</h3>
            <p className="text-sm text-gray-600">Semantic job matching with real-time market intelligence</p>
          </div>
          <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-lg font-semibold mb-2">Learning Paths</h3>
            <p className="text-sm text-gray-600">Personalized learning journeys based on career goals</p>
          </div>
        </div>
        <div className="mt-12 space-y-4">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Backend API: Running</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>AI Services: Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Job Matching: Operational</span>
            </div>
          </div>
          <div className="space-x-4">
            <a
              href="/auth/register"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started Free
            </a>
            <a
              href="/auth/login"
              className="inline-block px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Sign In
            </a>
          </div>
          <div className="mt-6 space-x-4 text-sm">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Backend API Docs
            </a>
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 border border-gray-600 text-gray-600 rounded hover:bg-gray-50 transition-colors"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
