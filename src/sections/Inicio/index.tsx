import { Link } from 'react-router'
import Mando3D from '../../components/Mando3D'
import StudioScene from '../../components/StudioScene'

/** Portada del proyecto con acceso directo a las secciones principales. */
export default function Inicio() {
  return (
    <section className="page">
      <div className="page__copy">
        <p className="page__eyebrow">Configurador 3D</p>
        <h1 className="page__title">Diseña el dock. Imprime el encaje.</h1>
        <p className="page__text">
          Dock Forge convierte tu Steam Controller en un objeto de escritorio.
          Ajusta la base, revisa cada zona del mando y prepara el STL para tu
          impresora.
        </p>

        <div className="page__actions">
          <Link to="/taller" className="button button--primary">
            Abrir Taller
          </Link>
          <Link to="/inspector" className="button">
            Explorar Inspector
          </Link>
        </div>
      </div>

      <div className="page__scene">
        <StudioScene
          cameraPosition={[220, 160, 250]}
          target={[0, 35, 0]}
          contactShadowScale={450}
        >
          <Mando3D rotacion={[0, -0.35, 0]} />
        </StudioScene>
      </div>
    </section>
  )
}
