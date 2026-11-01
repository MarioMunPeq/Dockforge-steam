import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import CargadorApp from './components/CargadorApp'
import CursorPersonalizado from './components/CursorPersonalizado'
import NavBar from './components/NavBar'
import TransicionSeccion from './components/TransicionSeccion'
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
  const [listo, setListo] = useState(false)

  return (
    <BrowserRouter>
      <div
        className={`shell${listo ? ' is-listo' : ''}`}
        inert={!listo}
      >
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

      <CargadorApp onDone={() => setListo(true)} />
      <CursorPersonalizado />
      <TransicionSeccion />
    </BrowserRouter>
  )
}

export default App
