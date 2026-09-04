import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.tsx'
import { markPlatform } from './lib/platform'
import './index.css'

/*
 * The belt to `index.html`'s braces. `scrollRestoration = 'manual'` stops the
 * browser putting the scroll back, but a reload deep in the page can still be
 * committed before that line runs on some engines — and Lenis has its own idea
 * of position. Nothing to see either way: at this point the first frame has not
 * been painted.
 */
if (typeof window !== 'undefined') window.scrollTo(0, 0)
markPlatform()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
