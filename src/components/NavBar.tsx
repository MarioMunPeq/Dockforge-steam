import { NavLink } from 'react-router'
import './NavBar.css'

const ENLACES = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/inspector', label: 'Inspector' },
  { to: '/gemelo', label: 'Gemelo' },
  { to: '/taller', label: 'Taller' },
]

/** Barra de navegación superior, siempre visible. */
export default function NavBar() {
  return (
    <header className="nav">
      <NavLink to="/" className="nav__brand">
        <span className="nav__brand-name">Dock Forge</span>
      </NavLink>

      <nav className="nav__links" aria-label="Secciones">
        {ENLACES.map((enlace, indice) => (
          <NavLink
            key={enlace.to}
            to={enlace.to}
            end={enlace.end}
            className={({ isActive }) =>
              `nav__link${isActive ? ' nav__link--active' : ''}`
            }
          >
            <span className="nav__index" aria-hidden="true">
              {String(indice + 1).padStart(2, '0')}
            </span>
            <span className="nav__label">{enlace.label}</span>
          </NavLink>
        ))}
      </nav>

      <p className="nav__meta" aria-hidden="true">
        STL · 1:1 mm
      </p>
    </header>
  )
}
