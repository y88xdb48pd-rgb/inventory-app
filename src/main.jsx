import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Login from './Login.jsx'
import './index.css'

function Root() {
  const [user, setUser] = useState(null)
  if (!user) return <Login onLogin={setUser} />
  return <App user={user} onLogout={() => setUser(null)} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
