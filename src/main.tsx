import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.test'  // Using test version for debugging
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
