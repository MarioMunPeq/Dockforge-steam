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
        Dock Forge
      </NavLink>

      <nav className="nav__links" aria-label="Secciones">
        {ENLACES.map((enlace) => (
          <NavLink
            key={enlace.to}
            to={enlace.to}
            end={enlace.end}
            className={({ isActive }) =>
              `nav__link${isActive ? ' nav__link--active' : ''}`
            }
          >
            {enlace.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
