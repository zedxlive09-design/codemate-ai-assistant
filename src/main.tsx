import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.debug'  // Debug version with error boundaries
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
