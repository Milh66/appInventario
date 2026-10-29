import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import CrudProductos from './components/Productos/crudProductos'

function App() {
  return (
    <div>
      <nav className="navbar navbar-dark bg-dark shadow-sm">
        <div className="container">
          <span className="navbar-brand mb-0 h1">SENATI - React CRUD API Rest</span>
        </div>
      </nav>
      <CrudProductos/>
    </div>
  );
}

export default App;
