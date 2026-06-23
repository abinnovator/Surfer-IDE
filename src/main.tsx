import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <Toaster />
    <App />
  </>,
)

requestAnimationFrame(() => requestAnimationFrame(() => {
  document.getElementById('loading')?.remove()
}))

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
