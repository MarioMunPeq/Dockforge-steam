import Viewer from './components/Viewer'
import './App.css'

function App() {
  return (
    <main className="app">
      {/* Cabecera flotante sobre el visor */}
      <header className="app__header">
        <h1 className="app__title">Dock Forge</h1>
        <p className="app__subtitle">Diseña el dock 3D de tu Steam Controller</p>
      </header>

      {/* Visor 3D a pantalla completa */}
      <div className="app__viewer">
        <Viewer />
      </div>

      <footer className="app__footer">
        <span>Arrastra para rotar · Rueda para hacer zoom</span>
        <span className="app__credit">
          Modelo: Valve Corporation · CC BY-NC-SA 4.0
        </span>
      </footer>
    </main>
  )
}

export default App
