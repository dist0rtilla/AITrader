import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MonitorPage from './pages/MonitorPage'
import SystemsPage from './pages/SystemsPage'
import './styles.css'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={<MonitorPage />} />
                <Route path='/systems' element={<SystemsPage />} />
            </Routes>
        </BrowserRouter>
    )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)
