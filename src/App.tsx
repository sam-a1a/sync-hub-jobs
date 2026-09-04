import { ReactLenis } from 'lenis/react'
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import AccountModal from './components/AccountModal'
import Footer from './components/Footer'
import Header from './components/Header'
import PageTransition from './components/PageTransition'
import Home from './pages/Home'
import { Studio } from './components/Studio/Studio'

/*
 * The profile is the one page that is a tool rather than a story, and it
 * carries its own components, so it loads on its own — a visitor reading
 * the front page never pays for it.
 */
const Profile = lazy(() => import('./pages/Profile'))
const Applications = lazy(() => import('./pages/Applications'))
const Settings = lazy(() => import('./pages/Settings'))
const Jobs = lazy(() => import('./pages/Jobs'))
const JobDetail = lazy(() => import('./pages/Jobs/JobDetail'))
import { Privacy, Terms } from './pages/Legal'
import { closeAccountModal, useAccountModal } from './lib/account'

function App() {
  const accountOpen = useAccountModal()
  const location = useLocation()

  const inStudio = /^\/(jobs|profile|applications|settings)(\/|$)/.test(location.pathname)

  if (inStudio) {
    return (
      <ReactLenis root>
        <div className="min-h-screen bg-paper text-ink">
          <Studio>
            <PageTransition>
              <Suspense fallback={null}>
                <Routes location={location}>
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/jobs/:jobId" element={<JobDetail />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </PageTransition>
          </Studio>
          <Footer />
          <AccountModal open={accountOpen} onClose={closeAccountModal} />
        </div>
      </ReactLenis>
    )
  }

  return (
    <ReactLenis root>
      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <Header />
        <main className="flex-1 pt-18">
          <PageTransition>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PageTransition>
        </main>
        <Footer />
        <AccountModal open={accountOpen} onClose={closeAccountModal} />
      </div>
    </ReactLenis>
  )
}

export default App
