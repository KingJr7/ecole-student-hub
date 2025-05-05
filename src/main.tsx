
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { seedDatabase } from './lib/seed.ts'

async function initializeApp() {
  try {
    await seedDatabase();
    
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (error) {
    console.error("Failed to initialize app:", error);
    
    // Render error state
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="p-6 max-w-md mx-auto bg-card rounded-xl shadow-lg flex flex-col items-center space-y-4 text-center">
            <h1 className="text-2xl font-bold">Error Initializing Database</h1>
            <p className="text-muted-foreground">
              Failed to initialize the application. Please try refreshing the page.
            </p>
            <pre className="bg-muted p-2 rounded text-sm overflow-auto max-w-full">
              {String(error)}
            </pre>
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      </React.StrictMode>,
    )
  }
}

initializeApp();
