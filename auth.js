// Importa las funciones necesarias de los módulos de Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"; // Para inicializar la aplicación Firebase.
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"; // Funciones de autenticación.
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js"; // Funciones de Realtime Database.

// Objeto de configuración de Firebase con las credenciales de tu proyecto.
const firebaseConfig = { 
    apiKey: "AIzaSyCxRP4rNfVJRzU8YLrMu51Os9-PfY60Tqk", // Clave API de tu proyecto Firebase.
    authDomain: "mantenimiento-a-equipo.firebaseapp.com", // Dominio de autenticación de Firebase.
    databaseURL: "https://mantenimiento-a-equipo-default-rtdb.firebaseio.com", // URL de tu Realtime Database.
    projectId: "mantenimiento-a-equipo", // ID de tu proyecto Firebase.
    storageBucket: "mantenimiento-a-equipo.firebasestorage.app", // Bucket de almacenamiento de Firebase.
    messagingSenderId: "840988363789", // ID del remitente de mensajería.
    appId: "1:840988363789:web:47bf961f1ad221529d1944", // ID de la aplicación web.
    measurementId: "G-NFXY6LLJMR" // ID de medición para Google Analytics.
};

// Inicializa la aplicación Firebase con la configuración proporcionada.
const app = initializeApp(firebaseConfig); 
// Obtiene la instancia del servicio de autenticación y la exporta para que otros scripts puedan usarla.
export const auth = getAuth(app); 
// Obtiene la instancia de Realtime Database y la exporta.
export const db = getDatabase(app); 

// Obtiene referencias a los elementos del DOM para los formularios y mensajes de error.
const loginForm = document.getElementById('login-form'); // Formulario de inicio de sesión.
const registerForm = document.getElementById('register-form'); // Formulario de registro.
const errorMessageDiv = document.getElementById('error-message'); // Div para mostrar mensajes de error.

// Función para mostrar un mensaje (de error o éxito) en la interfaz.
function showMessage(message, isError = true) { 
    if (errorMessageDiv) { // Verifica si el elemento para mensajes existe.
        errorMessageDiv.textContent = message; // Establece el texto del mensaje.
        // Asigna clases de Bootstrap para estilizar el mensaje como alerta de error (rojo) o éxito (verde).
        errorMessageDiv.className = isError ? 'alert alert-danger mt-3' : 'alert alert-success mt-3'; 
        errorMessageDiv.classList.remove('d-none'); // Muestra el elemento eliminando la clase que lo oculta.
    }
}

// --- Lógica de Registro de Usuario ---
if (registerForm) { // Ejecuta este bloque solo si el formulario de registro existe en la página.
    registerForm.addEventListener('submit', (e) => { // Añade un listener para el evento de envío del formulario.
        e.preventDefault(); // Previene que la página se recargue al enviar el formulario.
        // Obtiene los valores de los campos de nombre, email y contraseña.
        const name = document.getElementById('name').value; 
        const email = document.getElementById('email').value; 
        const password = document.getElementById('password').value; 

        // Llama a la función de Firebase para crear un nuevo usuario con email y contraseña.
        createUserWithEmailAndPassword(auth, email, password) 
            .then((userCredential) => { // Se ejecuta si el usuario se crea exitosamente.
                const user = userCredential.user; // Obtiene el objeto del usuario recién creado.
                
                // **ADVERTENCIA DE SEGURIDAD:** ¡Nunca guardes contraseñas en texto plano en la base de datos!
                // Firebase Authentication ya maneja el almacenamiento seguro de contraseñas.
                // Guarda solo información no sensible como el nombre y el correo.
                set(ref(db, 'users/' + user.uid), { // Guarda datos adicionales del usuario en la Realtime Database.
                    name: name, // Guarda el nombre del usuario.
                    email: email, // Guarda el correo del usuario.
                    // password: password // ¡LÍNEA ELIMINADA POR SEGURIDAD!
                }).then(() => {
                    showMessage('¡Registro exitoso! Redirigiendo al inicio de sesión...', false); // Muestra un mensaje de éxito.
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000); // Redirige a la página de login después de 2 segundos.
                });
            })
            .catch((error) => { // Se ejecuta si hay un error durante el registro.
                // Mapea códigos de error de Firebase a mensajes más amigables para el usuario.
                let friendlyMessage = "Ocurrió un error durante el registro.";
                if (error.code === 'auth/email-already-in-use') {
                    friendlyMessage = "Este correo electrónico ya está en uso.";
                } else if (error.code === 'auth/weak-password') {
                    friendlyMessage = "La contraseña debe tener al menos 6 caracteres.";
                }
                showMessage(friendlyMessage); // Muestra el mensaje de error amigable.
            });
    });
}

// --- Lógica de Inicio de Sesión ---
if (loginForm) { // Ejecuta este bloque solo si el formulario de login existe en la página.
    loginForm.addEventListener('submit', (e) => { // Añade un listener para el evento de envío.
        e.preventDefault(); // Previene la recarga de la página.
        // Obtiene los valores de los campos de email y contraseña.
        const email = document.getElementById('email').value; 
        const password = document.getElementById('password').value; 

        // Llama a la función de Firebase para iniciar sesión con email y contraseña.
        signInWithEmailAndPassword(auth, email, password) 
            .then((userCredential) => { // Se ejecuta si el inicio de sesión es exitoso.
                window.location.href = 'index.html'; // Redirige al usuario a la página principal.
            })
            .catch((error) => { // Se ejecuta si hay un error durante el inicio de sesión.
                showMessage('Correo o contraseña incorrectos.'); // Muestra un mensaje de error genérico por seguridad.
            });
    });
}

// --- Lógica para mostrar/ocultar contraseña ---
const togglePassword = document.getElementById('toggle-password'); // Obtiene el ícono del ojo.
const passwordInput = document.getElementById('password'); // Obtiene el campo de la contraseña.

if (togglePassword && passwordInput) { // Verifica que ambos elementos existan.
    togglePassword.addEventListener('click', function () { // Añade un listener para el clic en el ícono.
        // Cambia el tipo del input entre 'password' y 'text'.
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'; 
        passwordInput.setAttribute('type', type); // Aplica el nuevo tipo al campo.
        
        // Cambia el ícono del ojo para reflejar el estado (abierto o cerrado).
        const icon = this.querySelector('i'); // Selecciona el elemento <i> dentro del span.
        icon.classList.toggle('fa-eye'); // Alterna la clase 'fa-eye'.
        icon.classList.toggle('fa-eye-slash'); // Alterna la clase 'fa-eye-slash'.
    });
}