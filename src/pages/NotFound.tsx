import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface font-sans">
      <div className="text-center">
        <div className="text-6xl text-navy-dim mb-4">404</div>
        <h2 className="font-serif text-2xl text-navy mb-2">Page not found</h2>
        <p className="text-sm text-navy-light mb-6">The page you are looking for does not exist.</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="px-5 py-2 bg-[#1A3C6B] text-white rounded-lg text-sm hover:bg-navy transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}
