// Copilot: small Navbar component (JSX variant to avoid touching existing TS/JS pipeline)
import React from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-semibold">AITrader</div>
          <div className="hidden md:flex gap-3 text-sm text-slate-600">
            <Link to="/">Dashboard</Link>
            <Link to="/signals">Signal Monitor</Link>
            <Link to="/sentiment">Sentiment</Link>
          </div>
        </div>
        <div className="text-sm text-slate-500">User</div>
      </div>
    </nav>
  )
}
