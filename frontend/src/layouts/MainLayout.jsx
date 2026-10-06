import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-app text-primary">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">
          <Header />
          <main className="mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
