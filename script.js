// Importa todas las funciones necesarias de Firebase desde sus respectivos módulos.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"; // Para inicializar la aplicación Firebase.
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"; // Para autenticación de usuarios (observar estado, cerrar sesión).
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js"; // Para interactuar con la Realtime Database (obtener referencia, establecer, añadir, escuchar cambios, eliminar).

// Objeto de configuración de Firebase con las credenciales de tu proyecto.
const firebaseConfig = { 
    apiKey: "AIzaSyCxRP4rNfVJRzU8YLrMu51Os9-PfY60Tqk", // Clave API de tu proyecto Firebase.
    authDomain: "mantenimiento-a-equipo.firebaseapp.com", // Dominio de autenticación de Firebase.
    databaseURL: "https://mantenimiento-a-equipo-default-rtdb.firebaseio.com", // URL de tu Realtime Database.
    projectId: "mantenimiento-a-equipo", // ID de tu proyecto Firebase.
    storageBucket: "mantenimiento-a-equipo.firebasestorage.app", // Bucket de almacenamiento de Firebase.
    messagingSenderId: "840988363789", // ID del remitente de mensajería.
    appId: "1:840988363789:web:47bf961f1ad221529d1944", // ID de la aplicación web.
    measurementId: "G-NFXY6LLJMR" // ID de medición para Google Analytics (si está configurado).
};

// Inicializa la aplicación Firebase con la configuración proporcionada.
const app = initializeApp(firebaseConfig); 
// Obtiene la instancia del servicio de autenticación de Firebase.
const auth = getAuth(app); 
// Obtiene la instancia del servicio de Realtime Database de Firebase.
const db = getDatabase(app); 

// Obtiene referencias a elementos HTML por su ID o selector para interactuar con ellos.
const form = document.getElementById('equipmentForm'); // Formulario de registro de mantenimiento.
const tableBody = document.querySelector('#maintenanceTable tbody'); // Cuerpo de la tabla donde se muestran los registros.
const dashboardStats = document.getElementById('dashboard-stats'); // Contenedor principal del dashboard.
const opinionForm = document.getElementById('opinion-form'); // Formulario de opinión (no utilizado en los HTML proporcionados).
const logoutButton = document.getElementById('logout-button'); // Botón para cerrar sesión.
const deleteAllButton = document.getElementById('delete-all-button'); // Botón para eliminar todos los registros.

// Variable para almacenar la instancia del gráfico de Chart.js, permitiendo su destrucción y recreación.
let tipoMantenimientoChart = null; 

// ---
// Lógica para proteger rutas y cerrar sesión
// Define un array con los nombres de los archivos HTML que requieren autenticación.
const protectedPages = ['index.html', 'control_de_mantenimiento.html', 'dashboard.html', 'preventivo.html', 'correctivo.html'];
// Obtiene el nombre del archivo HTML actual de la URL.
const currentPage = window.location.pathname.split("/").pop(); 

// Escucha los cambios en el estado de autenticación del usuario.
onAuthStateChanged(auth, (user) => { 
    if (user) { // Si hay un usuario autenticado...
        // Si el usuario está en una página pública (login, registro, etc.), lo redirige a la página principal.
        if (['login.html', 'register.html', 'forgot-password.html'].includes(currentPage)) {
            window.location.href = 'index.html'; // Redirige a index.html.
        }
    } else { // Si no hay un usuario autenticado...
        // Si la página actual es una de las protegidas, redirige al usuario a la página de login.
        if (protectedPages.includes(currentPage)) { 
            window.location.href = 'login.html'; // Redirige a login.html.
        }
    }
});

// Si el botón de cerrar sesión existe en la página actual...
if (logoutButton) { 
    // Añade un 'event listener' para el clic en el botón de cerrar sesión.
    logoutButton.addEventListener('click', (e) => { 
        e.preventDefault(); // Previene la acción por defecto del enlace (navegar a login.html directamente).
        signOut(auth).then(() => { // Llama a la función de Firebase para cerrar la sesión del usuario.
            window.location.href = 'login.html'; // Una vez cerrada la sesión, redirige al usuario a la página de login.
        }).catch((error) => {
            console.error("Error al cerrar sesión:", error); // Muestra un error en consola si falla el cierre de sesión.
        });
    });
}

// ---
// Lógica de Gestión de Datos y Dashboard

// Función para actualizar el dashboard con los datos de Firebase.
function updateDashboard(snapshot) { 
    const totalMantenimientosEl = document.getElementById('total-mantenimientos'); // Elemento para mostrar el total de mantenimientos.
    const porTipoEl = document.getElementById('mantenimientos-por-tipo'); // Contenedor para el gráfico de mantenimientos por tipo.
    const ultimosRegistrosEl = document.getElementById('ultimos-registros'); // Contenedor para la lista de últimos registros.

    if (!dashboardStats || !snapshot.exists()) { // Si no existe el contenedor del dashboard o no hay datos en Firebase...
        if (totalMantenimientosEl) totalMantenimientosEl.textContent = '0'; // Establece el total a 0.
        if (porTipoEl) porTipoEl.innerHTML = '<p>No hay datos para mostrar.</p>'; // Muestra un mensaje de "no hay datos".
        if (ultimosRegistrosEl) ultimosRegistrosEl.innerHTML = '<p>No hay registros recientes.</p>'; // Muestra un mensaje de "no hay registros".
        return; // Sale de la función.
    }

    const data = snapshot.val(); // Obtiene todos los datos del snapshot de Firebase.
    // Convierte los datos a un array de registros y los ordena por fecha de mantenimiento (más reciente primero).
    const records = Object.values(data).sort((a, b) => new Date(b.Fecha_de_Mantenimiento) - new Date(a.Fecha_de_Mantenimiento)); 

    if (totalMantenimientosEl) { // Si existe el elemento para el total de mantenimientos...
        totalMantenimientosEl.textContent = records.length; // Actualiza el texto con el número total de registros.
    }

    if (porTipoEl) { // Si existe el contenedor para el gráfico por tipo...
        // Calcula la frecuencia de cada tipo de mantenimiento.
        const counts = records.reduce((acc, record) => { 
            const tipo = record.Tipo_de_Mantenimiento || 'No especificado'; // Obtiene el tipo o usa 'No especificado'.
            acc[tipo] = (acc[tipo] || 0) + 1; // Incrementa el contador para ese tipo.
            return acc; // Devuelve el acumulador.
        }, {}); // Inicia el acumulador como un objeto vacío.

        const chartCanvas = document.getElementById('tipoMantenimientoChart'); // Obtiene el elemento canvas para el gráfico.
        if (chartCanvas) { // Si el canvas existe...
            const labels = Object.keys(counts); // Obtiene las etiquetas (tipos de mantenimiento).
            const data = Object.values(counts); // Obtiene los datos (número de mantenimientos por tipo).

            if (tipoMantenimientoChart) { // Si ya existe una instancia del gráfico...
                tipoMantenimientoChart.destroy(); // La destruye para evitar duplicados y errores.
            }

// Asegúrate de que Chart.js y el plugin ChartDataLabels están cargados en tu HTML antes de usarlos.
            if (window.Chart && window.ChartDataLabels) { 
                // Registra el plugin ChartDataLabels para que se aplique a todas las gráficas.
                Chart.register(ChartDataLabels); 

                // Crea una nueva instancia del gráfico de tipo "doughnut" (anillo).
                tipoMantenimientoChart = new Chart(chartCanvas, { 
                    type: 'doughnut', // Tipo de gráfico.
                    data: { // Datos para el gráfico.
                        labels: labels, // Etiquetas para cada segmento (tipos de mantenimiento).
                        datasets: [{ // Conjunto de datos.
                            label: 'Mantenimientos por Tipo', // Etiqueta para el conjunto de datos.
                            data: data, // Valores numéricos para cada segmento.
                            backgroundColor: [ // Colores de fondo para los segmentos.
                                '#11293E', // Azul oscuro.
                                '#FF5E00', // Naranja.
                                '#CDDB00', // Gris oscuro.
                                '#4BC0C0', // Verde azulado.
                                '#70003F', // Púrpura.
                            ],
                            borderColor: [ // Colores del borde para los segmentos.
                                '#11293E', // Azul oscuro.
                                '#FF5E00', // Naranja.
                                '#CDDB00', // Gris oscuro.
                                '#4BC0C0', // Verde azulado.
                                '#70003F', // Púrpura.
                            ],
                            borderWidth: 1 // Ancho del borde.
                        }]
                    },
                    options: { // Opciones de configuración del gráfico.
                        responsive: true, // Hace que el gráfico sea responsivo al tamaño del contenedor.
                        maintainAspectRatio: false, // Permite que el gráfico no mantenga su relación de aspecto original.
                        plugins: { // Configuración de plugins.
                            legend: { // Configuración de la leyenda.
                                position: 'top', // Posición de la leyenda.
                            },
                            datalabels: { // Configuración del plugin ChartDataLabels.
                                color: '#ffffff', // Color del texto de las etiquetas de datos.
                                textAlign: 'center', // Alineación del texto.
                                font: { // Estilo de fuente.
                                    weight: 'bold', // Negrita.
                                    size: 16 // Tamaño de fuente.
                                },
                                formatter: (value) => value, // Formato de las etiquetas (muestra el valor directamente).
                            }
                        }
                    }
                });
            }
        }
    }

    if (ultimosRegistrosEl) { // Si existe el elemento para los últimos registros...
        const ultimos = records.slice(0, 100); // Toma los primeros 100 registros (los más recientes).
        if (ultimos.length > 0) { // Si hay registros para mostrar...
            // Genera una lista HTML de los últimos registros.
            ultimosRegistrosEl.innerHTML = ` 
                <ul class="list-group list-group-flush">
                    ${ultimos.map(rec => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            ${rec.Nombre_del_Equipo} (${rec.Tipo_de_Mantenimiento})
                            <span class="badge bg-secondary rounded-pill">${rec.Fecha_de_Mantenimiento}</span>
                        </li>`).join('')}
                </ul>`; // Une los elementos de la lista generados.
        } else { // Si no hay registros recientes...
            ultimosRegistrosEl.innerHTML = '<p>No hay registros recientes.</p>'; // Muestra un mensaje.
        }
    }
}

// Función para renderizar los registros de Firebase en la tabla HTML.
function renderTableFirebase(snapshot) { 
    if (tableBody) tableBody.innerHTML = ''; // Si el cuerpo de la tabla existe, lo vacía.
    else return; // Si no existe, sale de la función.
    if (!snapshot.exists()) { // Si no hay datos en el snapshot de Firebase...
        const tr = document.createElement('tr'); // Crea una nueva fila.
        tr.innerHTML = `<td colspan="5" style="color:#888;">No hay registros de mantenimiento.</td>`; // Mensaje de "no hay registros".
        tableBody.appendChild(tr); // Añade la fila al cuerpo de la tabla.
        return; // Sale de la función.
    }
    const data = snapshot.val(); // Obtiene los datos del snapshot.
    const keys = Object.keys(data); // Obtiene las claves (IDs) de los registros.
    keys.forEach(key => { // Itera sobre cada clave.
        const reg = data[key]; // Obtiene el registro correspondiente a la clave.
        const tr = document.createElement('tr'); // Crea una nueva fila para la tabla.
        tr.innerHTML = ` 
            <td>${reg.Nombre_de_Tecnico}</td>
            <td>${reg.Nombre_del_Equipo}</td>
            <td>${reg.Número_de_Serie}</td>
            <td>${reg.Fecha_de_Mantenimiento}</td>
            <td>${reg.Tipo_de_Mantenimiento}</td>
            <td>
                <button class="eliminar" data-key="${key}" title="Eliminar registro">🗑️</button>
            </td>
        `; // Rellena la fila con los datos del registro y un botón de eliminar.
        tableBody.appendChild(tr); // Añade la fila al cuerpo de la tabla.
    });

    // Añade 'event listeners' a todos los botones de eliminar.
    document.querySelectorAll('.eliminar').forEach(btn => { 
        btn.onclick = function() { // Cuando se hace clic en un botón de eliminar...
            const key = this.getAttribute('data-key'); // Obtiene la clave del registro a eliminar.
            remove(ref(db, 'mantenimientos/' + key)); // Elimina el registro de Firebase.
        };
    });
}

// Escucha los cambios en la colección 'mantenimientos' de Firebase en tiempo real.
onValue(ref(db, 'mantenimientos'), (snapshot) => { 
    if (document.getElementById('maintenanceTable')) { // Si la tabla de mantenimiento existe...
        renderTableFirebase(snapshot); // Renderiza la tabla con los datos actualizados.
    }
    if (document.getElementById('dashboard-stats')) { // Si el dashboard existe...
        updateDashboard(snapshot); // Actualiza el dashboard con los datos.
    }
});

// Si el formulario de registro de mantenimiento existe...
if (form) { 
    // Añade un 'event listener' para el evento 'submit' del formulario.
    form.addEventListener('submit', async function (event) { 
        event.preventDefault(); // Previene el comportamiento por defecto del formulario (recargar la página).
        // Obtiene los valores de los campos del formulario.
        const Nombre_de_Tecnico = document.getElementById('Nombre_de_Tecnico').value; 
        const Nombre_del_Equipo = document.getElementById('Nombre_del_Equipo').value; 
        const Número_de_Serie = document.getElementById('Número_de_Serie').value; 
        const Fecha_de_Mantenimiento = document.getElementById('Fecha_de_Mantenimiento').value; 
        const Tipo_de_Mantenimiento = document.getElementById('Tipo_de_Mantenimiento').value; 

        try { // Intenta guardar los datos en Firebase.
            // Añade un nuevo registro a la colección 'mantenimientos' en Firebase.
            await push(ref(db, 'mantenimientos'), { 
                Nombre_de_Tecnico, // Propiedad abreviada para Nombre_de_Tecnico: Nombre_de_Tecnico.
                Nombre_del_Equipo,
                Número_de_Serie,
                Fecha_de_Mantenimiento,
                Tipo_de_Mantenimiento
            });
            form.reset(); // Reinicia el formulario después de un registro exitoso.
        } catch (error) { // Si ocurre un error al guardar...
            alert('Error al guardar en Firebase: ' + error.message); // Muestra una alerta con el mensaje de error.
        }
    });
}

// --- Lógica para eliminar todos los registros ---
if (deleteAllButton) { // Ejecuta este bloque solo si el botón de eliminar todo existe en la página.
    deleteAllButton.addEventListener('click', () => { // Añade un listener para el evento de clic.
        // Pide confirmación al usuario antes de proceder.
        if (confirm('¿Estás seguro de que deseas eliminar TODOS los registros de mantenimiento? Esta acción no se puede deshacer.')) {
            // Llama a la función de Firebase para eliminar todos los datos en la ruta 'mantenimientos'.
            remove(ref(db, 'mantenimientos'))
                .catch((error) => { // Si ocurre un error durante la eliminación...
                    console.error("Error al eliminar todos los registros:", error); // Muestra el error en la consola.
                    alert('Ocurrió un error al intentar eliminar los registros.'); // Informa al usuario del error.
                });
        }
    });
}
