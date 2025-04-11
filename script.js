// script.js
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";



const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const turnoLista = document.querySelector(".turno-lista");
const turnoActual = document.getElementById("turno-actual");

async function mostrarPrecioCorte() {
  const precioRef = doc(db, "config", "precio");
  const precioSnap = await getDoc(precioRef);

  if (precioSnap.exists()) {
    const data = precioSnap.data();
    document.getElementById("precio-corte").textContent = data.valor;
  } else {
    document.getElementById("precio-corte").textContent = "No definido";
  }
}

mostrarPrecioCorte();

async function cargarTurnosAgendados() {
  const snapshot = await getDocs(collection(db, "turnos"));
  const ocupados = {};
  snapshot.forEach(doc => {
    ocupados[doc.id] = doc.data();
  });
  console.log("Turnos agendados cargados:", ocupados);
  return ocupados;
}

async function mostrarTurnoActual() {
  const user = auth.currentUser;
  if (!user) return;

  const snapshot = await getDocs(collection(db, "turnos"));
  let turnoEncontrado = null;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.uid === user.uid) {
      turnoEncontrado = data.rango;
    }
  });

  if (turnoEncontrado) {
    turnoActual.textContent = `Tu turno actual es: ${turnoEncontrado}`;
    turnoActual.style.display = "block";
  } else {
    turnoActual.textContent = "No tenés turnos agendados.";
    turnoActual.style.display = "block";
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    mostrarTurnoActual();
  }
});

async function generarTurnos() {
  const bloques = [];
  for (let hora = 9; hora < 13; hora++) {
    bloques.push(`${hora}:00 - ${hora}:30`);
    bloques.push(`${hora}:30 - ${hora + 1}:00`);
  }
  for (let hora = 14; hora < 24; hora++) {
    bloques.push(`${hora}:00 - ${hora}:30`);
    bloques.push(`${hora}:30 - ${hora + 1}:00`);
  }

  const agendados = await cargarTurnosAgendados();

  bloques.forEach((rango) => {
    const div = document.createElement("div");
    div.classList.add("turno");

    const claveExacta = Object.keys(agendados).find(k => k.trim() === rango.trim());
if (claveExacta) {
  const turnoData = agendados[claveExacta];
  div.classList.add("ocupado");
  div.textContent = `${rango} - Ocupado por ${turnoData.nombre}`;
} else {
  div.classList.add("disponible");
  div.textContent = `${rango} - Disponible`;
  div.addEventListener("click", () => agendarTurno(rango, div));
}

    turnoLista.appendChild(div);
  });
}

async function agendarTurno(rango, div) {
  const user = auth.currentUser;
  if (!user) {
    alert("Tenés que iniciar sesión para agendar un turno.");
    return;
  }

  const nombre = prompt("Ingresa tu nombre para confirmar el turno:");
  if (!nombre) return;

  const turnoRef = doc(db, "turnos", rango);
  const existente = await getDoc(turnoRef);

  if (existente.exists()) {
    alert("Ese turno ya fue agendado. Actualizá la página.");
    return;
  }

  await setDoc(turnoRef, {
    uid: user.uid,
    nombre: nombre,
    rango: rango
  });

  div.classList.remove("disponible");
  div.classList.add("ocupado");
  div.textContent = `${rango} - Ocupado por ${nombre}`;
  div.removeEventListener("click", agendarTurno);

  alert("¡Turno agendado con éxito!");
  turnoLista.innerHTML = ""; // 🧹 Limpia la lista vieja
  generarTurnos(); // 🔁 Vuelve a generar con el nuevo turno marcado como ocupado
  mostrarTurnoActual(); // 🔔 Actualiza el mensaje del turno actual
 // actualiza el cartel después de agendar
}

generarTurnos();