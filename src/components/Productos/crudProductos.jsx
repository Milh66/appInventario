import { useState, useEffect } from "react";
import api from "../../services/api";

const CrudProductos = () => {
    const [productos, setProductos] = useState([]);

    const [form, setForm] = useState({
        id: null,
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
    });

    // Obtener todos los productos
    const obtenerProductos = async () => {
        try {
            const response = await api.get("/productos");
            setProductos(response.data);
        } catch (error) {
            console.error("Error al obtener productos:", error);
        }
    };

    // Cargar productos al iniciar el componente
    useEffect(() => {
        obtenerProductos();
    }, []);

    // Actualizar los campos del formulario
    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    // Guardar o actualizar un producto
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (form.id) {
                await api.put(`/productos/${form.id}`, form);
                alert("Producto actualizado correctamente");
            } else {
                await api.post("/productos", form);
                alert("Producto registrado correctamente");
            }

            setForm({
                id: null,
                nombre: "",
                descripcion: "",
                precio: "",
                stock: "",
            });

            await obtenerProductos();
        } catch (error) {
            console.error("Error al guardar el producto:", error);
            alert("No se pudo guardar el producto");
        }
    };

    // Cargar un producto para editarlo
    const handleEdit = (producto) => {
        setForm({
            id: producto.id,
            nombre: producto.nombre ?? "",
            descripcion: producto.descripcion ?? "",
            precio: producto.precio ?? "",
            stock: producto.stock ?? "",
        });
    };

    // Cancelar la edición
    const handleCancel = () => {
        setForm({
            id: null,
            nombre: "",
            descripcion: "",
            precio: "",
            stock: "",
        });
    };

    // Eliminar un producto
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

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4">
                Gestión de Productos
            </h2>

            <div className="row">
                {/* Formulario */}
                <div className="col-md-4">
                    <h4>
                        {form.id ? "Editar Producto" : "Nuevo Producto"}
                    </h4>

                    <form
                        onSubmit={handleSubmit}
                        className="card p-3 shadow-sm"
                    >
                        <div className="mb-3">
                            <label className="form-label">
                                Nombre
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                className="form-control"
                                value={form.nombre}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Descripción
                            </label>
                            <input
                                type="text"
                                name="descripcion"
                                className="form-control"
                                value={form.descripcion}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Precio (S/)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="precio"
                                className="form-control"
                                value={form.precio}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Stock
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                name="stock"
                                className="form-control"
                                value={form.stock}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                        >
                            {form.id ? "Actualizar" : "Guardar"}
                        </button>

                        {form.id && (
                            <button
                                type="button"
                                className="btn btn-secondary w-100 mt-2"
                                onClick={handleCancel}
                            >
                                Cancelar edición
                            </button>
                        )}
                    </form>
                </div>

                {/* Tabla de productos */}
                <div className="col-md-8">
                    <h4>Lista de Productos</h4>

                    <div className="table-responsive">
                        <table className="table table-striped table-hover shadow-sm">
                            <thead className="table-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Precio</th>
                                    <th>Stock</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {productos.length > 0 ? (
                                    productos.map((prod) => (
                                        <tr key={prod.id}>
                                            <td>{prod.id}</td>
                                            <td>{prod.nombre}</td>
                                            <td>
                                                S/ {prod.precio}
                                            </td>
                                            <td>{prod.stock}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn btn-warning btn-sm me-2 mb-1"
                                                    onClick={() => handleEdit(prod)}
                                                >
                                                    Editar
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-danger btn-sm mb-1"
                                                    onClick={() => handleDelete(prod.id)}
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="text-center"
                                        >
                                            No hay productos registrados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrudProductos;
