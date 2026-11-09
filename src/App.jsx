import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import CrudProductos from './components/Productos/crudProductos'
import api from './services/api'
import Login from './components/Login/Login'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import './App.css'

const navigation = [
  { id: 'dashboard', label: 'Inicio (Dashboard)', icon: '⌂' },
  { id: 'productos', label: 'Productos', icon: '▣' },
  { id: 'categorias', label: 'Categorías', icon: '▤' },
  { id: 'proveedores', label: 'Proveedores', icon: '⬡' },
  { id: 'kardex', label: 'Kardex / Movimientos', icon: '⇄' },
  { id: 'usuarios', label: 'Usuarios', icon: '☺' },
]

function useInventoryData() {
  const [data, setData] = useState({
    productos: [],
    categorias: [],
    proveedores: [],
    movimientos: [],
    usuarios: []
  })
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setConnectionError('')
    const endpoints = [
      ['productos', '/productos'],
      ['categorias', '/categorias'],
      ['proveedores', '/proveedores'],
      ['movimientos', '/movimientos'],
      ['usuarios', '/usuarios'],
    ]

    const results = await Promise.all(
      endpoints.map(async ([key, url]) => {
        try {
          const response = await api.get(url)
          return [
            key,
            Array.isArray(response.data) ? response.data : response.data?.data || []
          ]
        } catch (error) {
          console.error(`Error en ${url}:`, error.response?.data || error.message)
          if (key === 'productos') {
            if (!error.response) {
              setConnectionError(
                'No se pudo contactar con el backend. Verifica el puerto y que el servidor esté encendido.'
              )
            } else if (error.response.status === 401 || error.response.status === 403) {
              setConnectionError(
                'No tienes autorización para consultar los productos. Verifica tu sesión y permisos.'
              )
            } else {
              setConnectionError(
                `Error al consultar productos: ${error.response.status}`
              )
            }
          }
          return [key, []]
        }
      })
    )

    setData(Object.fromEntries(results))
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return { data, loading, refresh, connectionError }
}

// ========================================
// DASHBOARD CON GRÁFICO CIRCULAR REAL
// ========================================
function Dashboard({ data, loading, onNavigate }) {
  const lowStock = data.productos.filter(p => Number(p.stock) <= 5).length

  const stats = [
    { label: 'Total Productos', value: data.productos.length, icon: '▣', tone: 'blue', note: 'Registrados en catálogo' },
    { label: 'Categorías', value: data.categorias.length, icon: '◈', tone: 'violet', note: 'Clasificaciones activas' },
    { label: 'Proveedores', value: data.proveedores.length, icon: '⬡', tone: 'green', note: 'Empresas asociadas' },
    { label: 'Bajo Stock (Alertas)', value: lowStock, icon: '⚠', tone: 'amber', note: '5 unidades o menos', isAlert: lowStock > 0 },
  ]

  // Cálculo real de Stock por Categoría para el gráfico de dona
  const palette = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#eab308', '#06b6d4']
  const categoryStock = data.categorias.map((cat, idx) => {
    const total = data.productos
      .filter(p => String(p.categoria_id) === String(cat.id))
      .reduce((acc, p) => acc + Number(p.stock || 0), 0)
    return { name: cat.nombre, value: total, color: palette[idx % palette.length] }
  }).filter(item => item.value > 0)

  const sinCat = data.productos
    .filter(p => !p.categoria_id)
    .reduce((acc, p) => acc + Number(p.stock || 0), 0)
  if (sinCat > 0) {
    categoryStock.push({ name: 'Sin categoría', value: sinCat, color: '#94a3b8' })
  }

  const totalStockChart = categoryStock.reduce((s, c) => s + c.value, 0)
  let currentDeg = 0
  const gradientParts = categoryStock.map(item => {
    const deg = totalStockChart > 0 ? (item.value / totalStockChart) * 360 : 0
    const segment = `${item.color} ${currentDeg}deg ${currentDeg + deg}deg`
    currentDeg += deg
    return segment
  })
  const donutGradient = gradientParts.length
    ? `conic-gradient(${gradientParts.join(', ')})`
    : 'conic-gradient(#e2e8f0 0deg 360deg)'

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PANEL PRINCIPAL</div>
          <h1>Dashboard</h1>
          <p>Resumen general del inventario y movimientos recientes.</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map(s => (
          <article className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.tone}`}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={s.isAlert ? { color: '#dc2626' } : undefined}>
              {loading ? '—' : s.value}
            </div>
            <div className="stat-note">{s.note}</div>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">KARDEX</span>
              <h3>Movimientos Recientes (Kardex)</h3>
            </div>
            <button className="text-button" onClick={() => onNavigate('kardex')}>
              Ver todos →
            </button>
          </div>

          {data.movimientos.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movimientos.slice(0, 5).map(m => {
                    const isEntrada = m.tipo_movimiento === 'Entrada'
                    const isSalida = m.tipo_movimiento === 'Salida'
                    return (
                      <tr key={m.id}>
                        <td>{m.fecha_hora ? new Date(m.fecha_hora).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                        <td><strong>{m.producto_nombre || m.Producto?.nombre || m.producto?.nombre || `#${m.producto_id}`}</strong></td>
                        <td>
                          <span style={{
                            color: isEntrada ? '#16a34a' : isSalida ? '#dc2626' : '#d97706',
                            fontWeight: 600
                          }}>
                            {m.tipo_movimiento} ({isEntrada ? `+${m.cantidad}` : isSalida ? `-${m.cantidad}` : m.cantidad})
                          </span>
                        </td>
                        <td style={{ color: isEntrada ? '#16a34a' : isSalida ? '#dc2626' : '#334155', fontWeight: 600 }}>
                          {isEntrada ? `+${m.cantidad}` : isSalida ? `-${m.cantidad}` : m.cantidad}
                        </td>
                        <td>{m.usuario_nombre || m.Usuario?.nombre || m.usuario?.nombre || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text={loading ? 'Cargando movimientos…' : 'Todavía no hay movimientos registrados.'} />
          )}
        </section>

        <section className="panel quick-panel">
          <span className="eyebrow">DISTRIBUCIÓN</span>
          <h3>Stock por Categoría</h3>
          <p>Unidades disponibles agrupadas por categoría.</p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px' }}>
            <div style={{
              width: '170px',
              height: '170px',
              borderRadius: '50%',
              background: donutGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '105px',
                height: '105px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{totalStockChart}</strong>
                <small style={{ color: '#64748b', fontSize: '0.72rem' }}>Unidades</small>
              </div>
            </div>

            <div style={{ width: '100%', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {categoryStock.length ? categoryStock.map(c => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                    {c.name}
                  </span>
                  <strong>{c.value} unid.</strong>
                </div>
              )) : (
                <small style={{ color: '#64748b', textAlign: 'center' }}>Registra productos con categoría para ver el gráfico.</small>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <span>⌁</span>
      <p>{text}</p>
    </div>
  )
}

// ========================================
// CATEGORÍAS (ESTRUCTURA UNIFICADA)
// ========================================
function CategoriasView({ categorias, productos, onRefresh }) {
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const porPagina = 5

  const filtradas = categorias.filter(c =>
    (c.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
  const inicio = (pagina - 1) * porPagina
  const paginadas = filtradas.slice(inicio, inicio + porPagina)

  useEffect(() => { setPagina(1) }, [busqueda])

  const contarProductos = (catId) => {
    return productos.filter(p => String(p.categoria_id) === String(catId)).length
  }

  const abrirNuevo = () => {
    setEditing(null)
    setForm({ nombre: '', descripcion: '' })
    setErrorMsg('')
    setModalOpen(true)
  }

  const abrirEditar = (cat) => {
    setEditing(cat.id)
    setForm({ nombre: cat.nombre || '', descripcion: cat.descripcion || '' })
    setErrorMsg('')
    setModalOpen(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    try {
      if (editing) {
        await api.put(`/categorias/${editing}`, form)
      } else {
        await api.post('/categorias', form)
      }
      setModalOpen(false)
      await onRefresh()
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo guardar la categoría.')
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta categoría?')) return
    try {
      await api.delete(`/categorias/${id}`)
      await onRefresh()
    } catch {
      alert('No se pudo eliminar la categoría.')
    }
  }

  return (
    <>
      <div className="productos-header">
        <div className="productos-search-box">
          <span className="productos-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button className="productos-btn-nuevo" onClick={abrirNuevo}>
          + Nueva Categoría
        </button>
      </div>

      <div className="panel productos-tabla-panel">
        <div className="productos-panel-titulo">
          <h3>Lista de Categorías</h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Cant. Productos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginadas.length ? paginadas.map((cat, idx) => (
                <tr key={cat.id}>
                  <td>{String(inicio + idx + 1).padStart(3, '0')}</td>
                  <td><strong>{cat.nombre}</strong></td>
                  <td>{cat.descripcion || '—'}</td>
                  <td><strong>{contarProductos(cat.id)}</strong></td>
                  <td>
                    <div className="productos-acciones">
                      <button className="btn-editar" onClick={() => abrirEditar(cat)}>Editar</button>
                      <button className="btn-eliminar" onClick={() => eliminar(cat.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No hay categorías registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.85rem', color: '#64748b' }}>
          <span>Mostrando {filtradas.length ? inicio + 1 : 0}-{Math.min(inicio + porPagina, filtradas.length)} de {filtradas.length} categorías</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>‹</button>
            <span style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontWeight: 600 }}>{pagina}</span>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: '460px', margin: '16px' }}>
            <div className="panel-heading">
              <h3>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button className="icon-button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={guardar}>
              <label className="field">
                Nombre
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Periféricos" />
              </label>
              <label className="field">
                Descripción
                <textarea rows="3" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción breve de la categoría" />
              </label>
              {errorMsg && <div className="form-error">{errorMsg}</div>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ========================================
// PROVEEDORES (ESTRUCTURA UNIFICADA)
// ========================================
function ProveedoresView({ proveedores, onRefresh }) {
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ razon_social: '', contacto: '', telefono: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const porPagina = 5

  const filtrados = proveedores.filter(p =>
    (p.razon_social || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.contacto || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const inicio = (pagina - 1) * porPagina
  const paginados = filtrados.slice(inicio, inicio + porPagina)

  useEffect(() => { setPagina(1) }, [busqueda])

  const abrirNuevo = () => {
    setEditing(null)
    setForm({ razon_social: '', contacto: '', telefono: '', email: '' })
    setErrorMsg('')
    setModalOpen(true)
  }

  const abrirEditar = (prov) => {
    setEditing(prov.id)
    setForm({
      razon_social: prov.razon_social || '',
      contacto: prov.contacto || '',
      telefono: prov.telefono || '',
      email: prov.email || ''
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    try {
      if (editing) {
        await api.put(`/proveedores/${editing}`, form)
      } else {
        await api.post('/proveedores', form)
      }
      setModalOpen(false)
      await onRefresh()
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo guardar el proveedor.')
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este proveedor?')) return
    try {
      await api.delete(`/proveedores/${id}`)
      await onRefresh()
    } catch {
      alert('No se pudo eliminar el proveedor.')
    }
  }

  return (
    <>
      <div className="productos-header">
        <div className="productos-search-box">
          <span className="productos-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Razón Social o Contacto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button className="productos-btn-nuevo" onClick={abrirNuevo}>
          + Nuevo Proveedor
        </button>
      </div>

      <div className="panel productos-tabla-panel">
        <div className="productos-panel-titulo">
          <h3>Lista de Proveedores</h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Razón Social</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.length ? paginados.map((prov, idx) => (
                <tr key={prov.id}>
                  <td>{String(inicio + idx + 1).padStart(3, '0')}</td>
                  <td><strong>{prov.razon_social}</strong></td>
                  <td>{prov.contacto || '—'}</td>
                  <td>{prov.telefono || '—'}</td>
                  <td>{prov.email || '—'}</td>
                  <td>
                    <div className="productos-acciones">
                      <button className="btn-editar" onClick={() => abrirEditar(prov)}>Editar</button>
                      <button className="btn-eliminar" onClick={() => eliminar(prov.id)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No hay proveedores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.85rem', color: '#64748b' }}>
          <span>Mostrando {filtrados.length ? inicio + 1 : 0}-{Math.min(inicio + porPagina, filtrados.length)} de {filtrados.length} proveedores</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>‹</button>
            <span style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontWeight: 600 }}>{pagina}</span>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: '480px', margin: '16px' }}>
            <div className="panel-heading">
              <h3>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button className="icon-button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={guardar}>
              <label className="field">
                Razón Social
                <input required value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} placeholder="Ej. TechImport SAC" />
              </label>
              <label className="field">
                Contacto
                <input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del representante" />
              </label>
              <label className="field">
                Teléfono
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="Ej. 987654321" />
              </label>
              <label className="field">
                Correo Electrónico
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@proveedor.com" />
              </label>
              {errorMsg && <div className="form-error">{errorMsg}</div>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ========================================
// KARDEX / MOVIMIENTOS (VER, ANULAR, TIPO, CANTIDAD, USUARIO, OBSERVACIONES)
// ========================================
function KardexView({ productos, usuarios, movimientos, onRefresh }) {
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [detalleMov, setDetalleMov] = useState(null)
  const [form, setForm] = useState({
    producto_id: '',
    usuario_id: '',
    tipo_movimiento: 'Entrada',
    cantidad: '',
    observaciones: ''
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const porPagina = 5

  const filtrados = movimientos.filter(m => {
    const prod = (m.producto_nombre || m.Producto?.nombre || m.producto?.nombre || '').toLowerCase()
    const usu = (m.usuario_nombre || m.Usuario?.nombre || m.usuario?.nombre || '').toLowerCase()
    const tipo = (m.tipo_movimiento || '').toLowerCase()
    const txt = busqueda.toLowerCase()
    return prod.includes(txt) || usu.includes(txt) || tipo.includes(txt)
  })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const inicio = (pagina - 1) * porPagina
  const paginados = filtrados.slice(inicio, inicio + porPagina)

  useEffect(() => { setPagina(1) }, [busqueda])

  const abrirNuevo = () => {
    setForm({ producto_id: '', usuario_id: '', tipo_movimiento: 'Entrada', cantidad: '', observaciones: '' })
    setErrorMsg('')
    setModalOpen(true)
  }

  const registrar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    try {
      await api.post('/movimientos', {
        ...form,
        cantidad: Number(form.cantidad)
      })
      setModalOpen(false)
      await onRefresh()
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.response?.data?.message || 'No se pudo registrar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  const anularMovimiento = async (mov) => {
    if (!window.confirm(`¿Deseas anular este movimiento (${mov.tipo_movimiento} de ${mov.cantidad} unidades)? Se revertirá el stock automáticamente.`)) {
      return
    }
    try {
      // Intenta eliminar en /movimientos/:id si existe; si no, registra un movimiento inverso de ajuste/reversión
      try {
        await api.delete(`/movimientos/${mov.id}`)
      } catch {
        const tipoInverso = mov.tipo_movimiento === 'Entrada' ? 'Salida' : 'Entrada'
        await api.post('/movimientos', {
          producto_id: mov.producto_id,
          usuario_id: mov.usuario_id || (usuarios[0]?.id ?? 1),
          tipo_movimiento: tipoInverso,
          cantidad: Number(mov.cantidad),
          observaciones: `Anulación de movimiento #${mov.id}`
        })
      }
      await onRefresh()
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo anular el movimiento.')
    }
  }

  const renderBadgeTipo = (tipo) => {
    if (tipo === 'Entrada') {
      return (
        <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '999px', fontWeight: 600, fontSize: '0.8rem' }}>
          Entrada
        </span>
      )
    }
    if (tipo === 'Salida') {
      return (
        <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '999px', fontWeight: 600, fontSize: '0.8rem' }}>
          Salida
        </span>
      )
    }
    return (
      <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '999px', fontWeight: 600, fontSize: '0.8rem' }}>
        Ajuste
      </span>
    )
  }

  return (
    <>
      <div className="productos-header">
        <div className="productos-search-box">
          <span className="productos-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Producto, Tipo o Usuario..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button className="productos-btn-nuevo" onClick={abrirNuevo}>
          + Registrar Movimiento
        </button>
      </div>

      <div className="panel productos-tabla-panel">
        <div className="productos-panel-titulo">
          <h3>Historial de Movimientos (Kardex)</h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.length ? paginados.map((m, idx) => {
                const isEntrada = m.tipo_movimiento === 'Entrada'
                const isSalida = m.tipo_movimiento === 'Salida'
                return (
                  <tr key={m.id}>
                    <td>{String(inicio + idx + 1).padStart(3, '0')}</td>
                    <td>{m.fecha_hora ? new Date(m.fecha_hora).toLocaleString('es-PE') : '—'}</td>
                    <td><strong>{m.producto_nombre || m.Producto?.nombre || m.producto?.nombre || `#${m.producto_id}`}</strong></td>
                    <td>{renderBadgeTipo(m.tipo_movimiento)}</td>
                    <td style={{
                      fontWeight: 700,
                      color: isEntrada ? '#16a34a' : isSalida ? '#dc2626' : '#d97706'
                    }}>
                      {isEntrada ? `+${m.cantidad}` : isSalida ? `-${m.cantidad}` : m.cantidad}
                    </td>
                    <td>{m.usuario_nombre || m.Usuario?.nombre || m.usuario?.nombre || '—'}</td>
                    <td>{m.observaciones || '—'}</td>
                    <td>
                      <div className="productos-acciones">
                        <button
                          onClick={() => setDetalleMov(m)}
                          style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Ver
                        </button>
                        <button
                          className="btn-eliminar"
                          onClick={() => anularMovimiento(m)}
                        >
                          Anular
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    Aún no se han registrado movimientos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.85rem', color: '#64748b' }}>
          <span>Mostrando {filtrados.length ? inicio + 1 : 0}-{Math.min(inicio + porPagina, filtrados.length)} de {filtrados.length} movimientos</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>‹</button>
            <span style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontWeight: 600 }}>{pagina}</span>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {/* Modal Registrar Movimiento */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: '480px', margin: '16px' }}>
            <div className="panel-heading">
              <h3>Registrar Movimiento</h3>
              <button className="icon-button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={registrar}>
              <label className="field">
                Producto
                <select required value={form.producto_id} onChange={e => setForm({ ...form, producto_id: e.target.value })}>
                  <option value="">Selecciona un producto</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Usuario
                <select required value={form.usuario_id} onChange={e => setForm({ ...form, usuario_id: e.target.value })}>
                  <option value="">Selecciona un usuario</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Tipo de Movimiento
                <select value={form.tipo_movimiento} onChange={e => setForm({ ...form, tipo_movimiento: e.target.value })}>
                  <option value="Entrada">Entrada</option>
                  <option value="Salida">Salida</option>
                  <option value="Ajuste">Ajuste</option>
                </select>
              </label>

              <label className="field">
                Cantidad
                <input required min="1" type="number" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} placeholder="Ej. 10" />
              </label>

              <label className="field">
                Observaciones
                <textarea rows="3" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Motivo o referencia (opcional)" />
              </label>

              {errorMsg && <div className="form-error">{errorMsg}</div>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="primary-button" disabled={saving || !productos.length}>
                  {saving ? 'Registrando…' : 'Registrar'}
                </button>
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle de Movimiento */}
      {detalleMov && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: '440px', margin: '16px' }}>
            <div className="panel-heading">
              <h3>Detalle del Movimiento #{detalleMov.id}</h3>
              <button className="icon-button" onClick={() => setDetalleMov(null)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.92rem' }}>
              <div><strong>Fecha y Hora:</strong> {detalleMov.fecha_hora ? new Date(detalleMov.fecha_hora).toLocaleString('es-PE') : '—'}</div>
              <div><strong>Producto:</strong> {detalleMov.producto_nombre || detalleMov.Producto?.nombre || detalleMov.producto_id}</div>
              <div><strong>Tipo:</strong> {renderBadgeTipo(detalleMov.tipo_movimiento)}</div>
              <div><strong>Cantidad:</strong> {detalleMov.cantidad} unidades</div>
              <div><strong>Registrado por:</strong> {detalleMov.usuario_nombre || detalleMov.Usuario?.nombre || '—'}</div>
              <div><strong>Observaciones:</strong> {detalleMov.observaciones || 'Sin observaciones'}</div>
            </div>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button className="primary-button" onClick={() => setDetalleMov(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ========================================
// USUARIOS (CON ESTADO ACTIVO EN VERDE)
// ========================================
function UsuariosView({ usuarios, onRefresh }) {
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'Almacenero', estado: 'Activo' })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const porPagina = 5

  const filtrados = usuarios.filter(u =>
    (u.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (u.rol || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const inicio = (pagina - 1) * porPagina
  const paginados = filtrados.slice(inicio, inicio + porPagina)

  useEffect(() => { setPagina(1) }, [busqueda])

  const abrirNuevo = () => {
    setEditing(null)
    setForm({ nombre: '', email: '', password: '', rol: 'Almacenero', estado: 'Activo' })
    setErrorMsg('')
    setModalOpen(true)
  }

  const abrirEditar = (u) => {
    setEditing(u.id)
    setForm({
      nombre: u.nombre || '',
      email: u.email || '',
      password: '',
      rol: u.rol || 'Almacenero',
      estado: u.estado || 'Activo'
    })
    setErrorMsg('')
    setModalOpen(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    try {
      if (editing) {
        const payload = { nombre: form.nombre, email: form.email, rol: form.rol }
        if (form.password.trim()) payload.password = form.password
        await api.put(`/usuarios/${editing}`, payload)
      } else {
        await api.post('/usuarios', form)
      }
      setModalOpen(false)
      await onRefresh()
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'No se pudo guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este usuario?')) return
    try {
      await api.delete(`/usuarios/${id}`)
      await onRefresh()
    } catch {
      alert('No se pudo eliminar el usuario (verifica si tu backend tiene la ruta DELETE /api/usuarios/:id).')
    }
  }

  return (
    <>
      <div className="productos-header">
        <div className="productos-search-box">
          <span className="productos-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por Nombre, Correo o Rol..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button className="productos-btn-nuevo" onClick={abrirNuevo}>
          + Nuevo Usuario
        </button>
      </div>

      <div className="panel productos-tabla-panel">
        <div className="productos-panel-titulo">
          <h3>Lista de Usuarios</h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginados.length ? paginados.map((u, idx) => {
                const esActivo = (u.estado || 'Activo') === 'Activo'
                return (
                  <tr key={u.id}>
                    <td>{String(inicio + idx + 1).padStart(3, '0')}</td>
                    <td><strong>{u.nombre}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.rol}</td>
                    <td>
                      <span style={{
                        background: esActivo ? '#dcfce7' : '#fee2e2',
                        color: esActivo ? '#15803d' : '#b91c1c',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: esActivo ? '#16a34a' : '#dc2626'
                        }} />
                        {u.estado || 'Activo'}
                      </span>
                    </td>
                    <td>
                      <div className="productos-acciones">
                        <button className="btn-editar" onClick={() => abrirEditar(u)}>Editar</button>
                        <button className="btn-eliminar" onClick={() => eliminar(u.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.85rem', color: '#64748b' }}>
          <span>Mostrando {filtrados.length ? inicio + 1 : 0}-{Math.min(inicio + porPagina, filtrados.length)} de {filtrados.length} usuarios</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>‹</button>
            <span style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontWeight: 600 }}>{pagina}</span>
            <button className="secondary-button" style={{ padding: '4px 10px' }} disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>›</button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: '460px', margin: '16px' }}>
            <div className="panel-heading">
              <h3>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="icon-button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={guardar}>
              <label className="field">
                Nombre completo
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Mileydi Haro" />
              </label>
              <label className="field">
                Correo electrónico
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
              </label>
              <label className="field">
                {editing ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}
                <input required={!editing} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              </label>
              <label className="field">
                Rol
                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
                  <option value="Administrador(a)">Administrador(a)</option>
                  <option value="Almacenero">Almacenero</option>
                </select>
              </label>
              {errorMsg && <div className="form-error">{errorMsg}</div>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// ========================================
// PANEL PRINCIPAL
// ========================================
function InventoryPanel() {
  const navigateRouter = useNavigate()
  const { data, loading, refresh, connectionError } = useInventoryData()
  const [active, setActive] = useState(() => {
    return window.location.pathname === '/productos' ? 'productos' : 'dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigate = id => {
    setActive(id)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigateRouter('/')
  }

  const current = navigation.find(n => n.id === active) || navigation[0]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">S<span>.</span></div>
          <div>
            <strong>SENATI</strong>
            <small>SISTEMA DE INVENTARIO</small>
          </div>
        </div>

        <div className="workspace-label">MENÚ PRINCIPAL</div>
        <nav className="side-nav">
          {navigation.map(n => (
            <button
              key={n.id}
              className={active === n.id ? 'active' : ''}
              onClick={() => navigate(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {active === n.id && <i />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">AD</div>
            <div>
              <strong>Administrador</strong>
              <small>Panel de gestión</small>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(239,68,68,0.15)',
              color: '#fca5a5',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <div className="breadcrumb">
            Sistema <span>/</span> <strong>{current.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="live-dot" />
            <span className="online-label">En línea</span>
            <button className="refresh-button" onClick={refresh} title="Actualizar datos">
              ↻
            </button>
            <div className="top-avatar">AD</div>
          </div>
        </header>

        <div className="page-content">
          {connectionError && (
            <div className="connection-alert">
              <strong>Conexión pendiente</strong>
              <span>{connectionError}</span>
            </div>
          )}

          {active === 'dashboard' && (
            <Dashboard data={data} loading={loading} onNavigate={navigate} />
          )}

          {active === 'productos' && (
            <CrudProductos onRefresh={refresh} />
          )}

          {active === 'categorias' && (
            <CategoriasView
              categorias={data.categorias}
              productos={data.productos}
              onRefresh={refresh}
            />
          )}

          {active === 'proveedores' && (
            <ProveedoresView
              proveedores={data.proveedores}
              onRefresh={refresh}
            />
          )}

          {active === 'kardex' && (
            <KardexView
              productos={data.productos}
              usuarios={data.usuarios}
              movimientos={data.movimientos}
              onRefresh={refresh}
            />
          )}

          {active === 'usuarios' && (
            <UsuariosView
              usuarios={data.usuarios}
              onRefresh={refresh}
            />
          )}

          <footer className="footer">
            <span>SENATI INVENTORY <b>•</b> PANEL ADMINISTRATIVO</span>
            <span>Full Stack Developer Software · 2026</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/productos"
          element={
            <ProtectedRoute>
              <InventoryPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <InventoryPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App;
