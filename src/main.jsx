import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClosetProvider } from './context/ClosetContext'
import { AuthProvider } from './context/AuthContext'

if ('serviceWorker' in navigator) {
  // Unregister any existing service workers to ensure a clean slate
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Unregistering Service Worker:', registration);
      registration.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ClosetProvider>
        <App />
      </ClosetProvider>
    </AuthProvider>
  </React.StrictMode>,
)