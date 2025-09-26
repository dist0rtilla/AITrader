import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Execution from './pages/Execution'
import Settings from './pages/Settings'
import Strategies from './pages/Strategies'
import Database from './pages/Database'
import './styles.css'

function App(){
  return (
    <BrowserRouter>
      <div className="container">
        <header>
          <div className="logo">AI</div>
          <div>
            <h1>AITrader Control Panel</h1>
            <div className="small">Realtime system monitor & control</div>
          </div>
        </header>
        <nav style={{display:'flex',gap:12,marginBottom:12}}>
          <Link to="/">Home</Link>
          <Link to="/execution">Execution</Link>
          <Link to="/strategies">Strategies</Link>
          <Link to="/database">Database</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/execution" element={<Execution/>} />
          <Route path="/strategies" element={<Strategies/>} />
          <Route path="/database" element={<Database/>} />
          <Route path="/settings" element={<Settings/>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
