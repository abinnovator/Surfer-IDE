import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import Settings from './components/Settings.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

const isSettings = window.location.hash === '#settings'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <Toaster />
    {isSettings ? <Settings /> : <App />}
  </>,
)

requestAnimationFrame(() => requestAnimationFrame(() => {
  document.getElementById('loading')?.remove()
}))

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
