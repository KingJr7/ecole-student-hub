
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Skip database seeding in browser environment
if (typeof window !== 'undefined') {
  // Browser environment - render immediately
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} else {
  // This code will only run in Node.js environment
  const initServer = async () => {
    const { seedDatabase } = await import('./lib/seed.ts')
    await seedDatabase()
  }
  
  // In a real server environment, you'd call initServer()
  // But this code won't run in the browser
}
