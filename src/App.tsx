import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import NavBar from './components/NavBar'
import Inicio from './sections/Inicio'
import Inspector from './sections/Inspector'
import Gemelo from './sections/Gemelo'
import Taller from './sections/Taller'
import './App.css'

/**
 * Estructura general de Dock Forge.
 * La navegación y las rutas viven aquí; cada sección es independiente.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="shell">
        <NavBar />

        <div className="shell__content">
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/inspector" element={<Inspector />} />
            <Route path="/gemelo" element={<Gemelo />} />
            <Route path="/taller" element={<Taller />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
