import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      <div className="mx-auto flex w-full max-w-[1480px] gap-5 px-3 pb-5 pt-3 sm:px-5 lg:px-6">
        <Sidebar />
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

export default MainLayout
