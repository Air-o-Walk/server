// ---------------------------------------------------- -->
// logicaEstadoNodos.js
// Maria Algora
//Llama al endpoint informeNodos y pone los datos en una tabla
// ---------------------------------------------------- --> 
async function cargarInforme(tipo = 'todos') {
  try {
    const respuesta = await fetch(`/informeNodos/${tipo}`);
    if (!respuesta.ok) {
      throw new Error('Error al recuperar datos');
    }
    const datos = await respuesta.json();

    console.log('Datos recibidos:', datos); // Para debug

    const tabla = document.getElementById('tabla-estados');
    tabla.innerHTML = ''; // Limpiar tabla para no añadir abajo al recargar

    if (datos.success && datos.nodos && datos.nodos.length > 0) {
      datos.nodos.forEach(nodo => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
          <td>${nodo.name || 'N/A'}</td>
          <td>${nodo.username || 'N/A'}</td>
          <td>${nodo.status || 'N/A'}</td>
        `;
        tabla.appendChild(fila);
      });
    } else {
      tabla.innerHTML = '<tr><td colspan="3">No se encontraron nodos</td></tr>';
    }
  } catch (error) {
    console.error('Error:', error);
    const tabla = document.getElementById('tabla-estados');
    tabla.innerHTML = '<tr><td colspan="3">Error al cargar los datos</td></tr>';
  }
}

// Botones para cargar diferentes informes
function cargarTodos() {
  cargarInforme('todos');
}

function cargarInactivos() {
  cargarInforme('inactivos');
}

function cargarErroneos() {
  cargarInforme('erroneos');
}

// Cargar todos al iniciar
document.addEventListener('DOMContentLoaded', function() {
  cargarTodos();
});