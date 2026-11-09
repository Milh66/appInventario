import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Login = () => {
  const [credenciales, setCredenciales] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', credenciales);

      localStorage.setItem('token', response.data.token);
      navigate('/productos');
    } catch (err) {
      if (err.response) {
        setError(err.response.data.message || 'Credenciales inválidas. Intente nuevamente.');
      } else {
        setError('No se pudo conectar con el servidor backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-background"></div>
      <div className="login-glow glow-one"></div>
      <div className="login-glow glow-two"></div>

      <div className="login-container">
        
        <div className="login-logo-container">
          <img 
            src="/img/logo.s.png" 
            alt="Logo Nexus Inventory" 
            className="login-logo" 
          />
        </div>

        <div className="login-card">
          <div className="login-heading">
            <h1>Nexus Inventory</h1>
            <p>Ingrese sus credenciales para acceder al sistema</p>
          </div>

          {error && (
            <div className="login-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label>Correo Electrónico</label>
              <div className="login-input-wrap">
                <span>✉️</span>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="usuario@nexus.com"
                  value={credenciales.email}
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <div className="login-field">
              <label>Contraseña</label>
              <div className="login-input-wrap">
                <span>🔒</span>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="••••••••"
                  value={credenciales.password}
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
              <span>→</span>
            </button>
          </form>

          <div className="login-security">
            <span>SISTEMA DE CONTROL DE INVENTARIO SEGURO</span>
          </div>
        </div>

        <div className="login-footer">
          <span>© 2026 NEXUS INVENTORY</span>
          <span>ESTADO: ONLINE</span>
        </div>

      </div>
    </div>
  );
};

export default Login;