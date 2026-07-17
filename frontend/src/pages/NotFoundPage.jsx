import { useNavigate } from 'react-router-dom'
import { Home, Map } from 'lucide-react'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-4">
      <div className="journey-page max-w-2xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-amber-200 leaf-shadow">
          <Map size={36} className="text-amber-900" />
        </div>
        <h1 className="mt-6 text-6xl font-black text-stone-950">Lost trail</h1>
        <p className="mx-auto mt-4 max-w-md text-base font-semibold leading-7 text-stone-600">
          This path has moved, but your learning journey is still safe.
        </p>
        <button onClick={() => navigate('/')} className="organic-button mt-8">
          <Home size={18} />
          Back to Today Trail
        </button>
      </div>
    </div>
  )
}

export default NotFoundPage
