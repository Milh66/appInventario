
import { useState, useEffect } from "react";
import api from "../../services/api";

const FORM_VACIO = {
    id: null,
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria_id: "",
    proveedor_id: ""
};

const CrudProductos = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [paginaActual, setPaginaActual] = useState(1);
    const [mostrarModal, setMostrarModal] = useState(false);
    const productosPorPagina = 5;

    const [form, setForm] = useState(FORM_VACIO);

    const obtenerProductos = async () => {
        try {
            const response = await api.get("/productos");
            setProductos(response.data);
        } catch (error) {
            console.error("Error al obtener productos:", error);
        }
    };

    const obtenerCategorias = async () => {
        try {
            const response = await api.get("/categorias");
            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];
            setCategorias(data);
        } catch (error) {
            console.error("Error al obtener categorías:", error);
        }
    };

    useEffect(() => {
        obtenerProductos();
        obtenerCategorias();
    }, []);

    // Obtiene el id de una categoría aunque la columna se llame distinto
    const getIdCategoria = (cat) => cat.id ?? cat.id_categoria;

    // Recibe el producto completo y busca el nombre de la categoría
    const getNombreCategoria = (prod) => {
        if (prod.categoria_nombre) return prod.categoria_nombre;
        if (prod.categoria?.nombre) return prod.categoria.nombre;

        const id = prod.categoria_id ?? prod.id_categoria;
        const cat = categorias.find(
            (c) => String(getIdCategoria(c)) === String(id)
        );
        return cat ? cat.nombre : "—";
    };

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...form,
                precio: Number(form.precio),
                stock: Number(form.stock),
                categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
                proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : null,
            };

            if (form.id) {
                await api.put(`/productos/${form.id}`, payload);
                alert("Producto actualizado correctamente");
            } else {
                await api.post("/productos", payload);
                alert("Producto registrado correctamente");
            }
            setForm(FORM_VACIO);
            setMostrarModal(false);
            await obtenerProductos();
        } catch (error) {
            console.error("Error al guardar el producto:", error);
            alert("No se pudo guardar el producto");
        }
    };

    const handleEdit = (producto) => {
        setForm({
            id: producto.id,
            nombre: producto.nombre ?? "",
            descripcion: producto.descripcion ?? "",
            precio: producto.precio ?? "",
            stock: producto.stock ?? "",
            categoria_id: producto.categoria_id ?? producto.id_categoria ?? "",
            proveedor_id: producto.proveedor_id ?? "",
        });
        setMostrarModal(true);
    };

    const handleCancel = () => {
        setForm(FORM_VACIO);
        setMostrarModal(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
            try {
                await api.delete(`/productos/${id}`);
                alert("Producto eliminado correctamente");
                await obtenerProductos();
            } catch (error) {
                console.error("Error al eliminar el producto:", error);
                alert("No se pudo eliminar el producto");
            }
        }
    };

    const abrirNuevo = () => {
        setForm(FORM_VACIO);
        setMostrarModal(true);
    };

    // --- Filtrado por búsqueda ---
    const productosFiltrados = productos.filter((p) => {
        const texto = busqueda.toLowerCase();
        const nombreCat = getNombreCategoria(p).toLowerCase();
        return (
            (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
            nombreCat.includes(texto)
        );
    });

    // --- Paginación ---
    const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);
    const indiceInicio = (paginaActual - 1) * productosPorPagina;
    const productosPagina = productosFiltrados.slice(
        indiceInicio,
        indiceInicio + productosPorPagina
    );

    useEffect(() => {
        setPaginaActual(1);
    }, [busqueda]);

    return (
        <>
            {/* ===== BUSCADOR (izquierda) + BOTÓN (derecha) ===== */}
            <div className="productos-header">
                <div className="productos-search-box">
                    <span className="productos-search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por Nombre o Categoría..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <button className="productos-btn-nuevo" onClick={abrirNuevo}>
                    + Nuevo Producto
                </button>
            </div>

            {/* ===== PANEL CON TÍTULO + TABLA ===== */}
            <div className="panel productos-tabla-panel">
                <div className="productos-panel-titulo">
                    <h3>Lista de Productos</h3>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Categoría</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {productosPagina.length > 0 ? (
                                productosPagina.map((prod, index) => (
                                    <tr key={prod.id}>
                                        <td>
                                            <span className="product-id">
                                                {String(indiceInicio + index + 1).padStart(3, "0")}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{prod.nombre}</strong>
                                        </td>
                                        <td>{getNombreCategoria(prod)}</td>
                                        <td>S/. {Number(prod.precio).toFixed(2)}</td>
                                        <td>
                                            <span
                                                className={
                                                    Number(prod.stock) <= 5
                                                        ? "stock-bajo"
                                                        : "stock-normal"
                                                }
                                            >
                                                {prod.stock}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="productos-acciones">
                                                <button
                                                    className="btn-editar"
                                                    onClick={() => handleEdit(prod)}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    className="btn-eliminar"
                                                    onClick={() => handleDelete(prod.id)}
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">
                                        <div className="empty-state">
                                            <span>📦</span>
                                            <p>No hay productos registrados.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ===== PAGINACIÓN ===== */}
                {productosFiltrados.length > 0 && (
                    <div className="productos-paginacion">
                        <span className="paginacion-info">
                            Mostrando {indiceInicio + 1}-
                            {Math.min(
                                indiceInicio + productosPorPagina,
                                productosFiltrados.length
                            )}{" "}
                            de {productosFiltrados.length} productos
                        </span>

                        <div className="paginacion-controles">
                            <button
                                disabled={paginaActual === 1}
                                onClick={() => setPaginaActual(paginaActual - 1)}
                            >
                                ‹
                            </button>

                            {Array.from({ length: totalPaginas }, (_, i) => (
                                <button
                                    key={i + 1}
                                    className={
                                        paginaActual === i + 1 ? "pagina-activa" : ""
                                    }
                                    onClick={() => setPaginaActual(i + 1)}
                                >
                                    {i + 1}
                                </button>
                            ))}

                            <button
                                disabled={paginaActual === totalPaginas}
                                onClick={() => setPaginaActual(paginaActual + 1)}
                            >
                                ›
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== MODAL DE FORMULARIO ===== */}
            {mostrarModal && (
                <div className="productos-modal-overlay" onClick={handleCancel}>
                    <div
                        className="productos-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="productos-modal-header">
                            <h3>
                                {form.id ? "✏️ Editar Producto" : "📦 Nuevo Producto"}
                            </h3>
                            <button
                                className="productos-modal-cerrar"
                                onClick={handleCancel}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="field">
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    placeholder="Nombre del producto"
                                    value={form.nombre}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label>Categoría</label>
                                <select
                                    name="categoria_id"
                                    value={String(form.categoria_id ?? "")}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Selecciona una categoría</option>
                                    {categorias.map((cat) => {
                                        const idCat = getIdCategoria(cat);
                                        return (
                                            <option key={idCat} value={String(idCat)}>
                                                {cat.nombre}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="field-row">
                                <div className="field">
                                    <label>Precio (S/)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="precio"
                                        placeholder="0.00"
                                        value={form.precio}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="field">
                                    <label>Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        name="stock"
                                        placeholder="0"
                                        value={form.stock}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="primary-button">
                                {form.id ? "Actualizar Producto" : "Guardar Producto"}
                                <span>→</span>
                            </button>

                            {form.id && (
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={handleCancel}
                                >
                                    Cancelar edición
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default CrudProductos;