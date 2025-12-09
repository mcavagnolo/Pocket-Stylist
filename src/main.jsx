import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClosetProvider } from './context/ClosetContext'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ClosetProvider>
        <App />
      </ClosetProvider>
    </AuthProvider>
  </React.StrictMode>,
)