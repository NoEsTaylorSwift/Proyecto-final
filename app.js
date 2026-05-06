const menu = document.getElementById("menu");
const app = document.getElementById("app");
const exportBox = document.getElementById("exportBox");

const modoPersona = document.getElementById("modoPersona");
const modoMariela = document.getElementById("modoMariela");
const btnVolver = document.getElementById("btnVolver");

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const btnIniciar = document.getElementById("btnIniciar");
const btnRegistrar = document.getElementById("btnRegistrar");
const btnBuscar = document.getElementById("btnBuscar");
const btnDetener = document.getElementById("btnDetener");

const btnRegistrarMariela = document.getElementById("btnRegistrarMariela");
const btnExportar = document.getElementById("btnExportar");
const btnBorrarMariela = document.getElementById("btnBorrarMariela");
const btnCerrarExport = document.getElementById("btnCerrarExport");

const modoActual = document.getElementById("modoActual");
const tituloModo = document.getElementById("tituloModo");
const bloqueNombre = document.getElementById("bloqueNombre");
const nombrePersona = document.getElementById("nombrePersona");

const camaraTipo = document.getElementById("camaraTipo");
const accion = document.getElementById("accion");
const url = document.getElementById("url");
const sensibilidad = document.getElementById("sensibilidad");
const estado = document.getElementById("estado");
const audio = document.getElementById("audio");
const mensajeDetectado = document.getElementById("mensajeDetectado");
const herramientasMariela = document.getElementById("herramientasMariela");
const textoExportado = document.getElementById("textoExportado");

const MODEL_URL = "https://vladmandic.github.io/face-api/model/";
const CLAVE_PERSONA = "perfilPersonaActualV2";
const CLAVE_MARIELA_LOCAL = "perfilMarielaLocalV2";

let modo = null;
let stream = null;
let modelosCargados = false;
let buscando = false;
let faceMatcher = null;
let nombreBuscado = "";
let ultimaAccion = 0;

const TIEMPO_ESPERA = 10000;

modoPersona.addEventListener("click", () => abrirModo("persona"));
modoMariela.addEventListener("click", () => abrirModo("mariela"));
btnVolver.addEventListener("click", volverMenu);

btnIniciar.addEventListener("click", iniciarCamara);
btnRegistrar.addEventListener("click", registrarPersona);
btnBuscar.addEventListener("click", iniciarBusqueda);
btnDetener.addEventListener("click", detenerTodo);

btnRegistrarMariela.addEventListener("click", registrarMariela);
btnExportar.addEventListener("click", exportarPerfilMariela);
btnBorrarMariela.addEventListener("click", borrarPerfilMarielaLocal);
btnCerrarExport.addEventListener("click", () => exportBox.classList.add("oculto"));
sensibilidad.addEventListener("input", prepararMatcherActual);

function abrirModo(nuevoModo) {
  modo = nuevoModo;
  menu.classList.add("oculto");
  app.classList.remove("oculto");
  exportBox.classList.add("oculto");
  limpiarPantalla();

  if (modo === "persona") {
    modoActual.textContent = "Modo: Encontrarme a mí";
    tituloModo.textContent = "Registrar y buscar a cualquier persona";
    bloqueNombre.classList.remove("oculto");
    herramientasMariela.classList.add("oculto");
    btnRegistrar.textContent = "Registrar rostro";
    btnBuscar.textContent = "Buscar persona";
    estado.textContent = "Escribe el nombre de la persona, inicia la cámara y registra su rostro.";
  }

  if (modo === "mariela") {
    modoActual.textContent = "Modo: Encontrar a Mariela";
    tituloModo.textContent = "Buscar a Mariela";
    bloqueNombre.classList.add("oculto");
    herramientasMariela.classList.remove("oculto");
    btnRegistrar.textContent = "Registrar rostro temporal";
    btnBuscar.textContent = "Buscar a Mariela";
    estado.textContent = existePerfilMariela()
      ? "Perfil de Mariela disponible. Inicia la cámara y presiona “Buscar a Mariela”."
      : "Aún no hay perfil de Mariela. Inicia la cámara y presiona “Registrar Mariela”.";
  }
}

function volverMenu() {
  detenerTodo();
  modo = null;
  app.classList.add("oculto");
  menu.classList.remove("oculto");
  exportBox.classList.add("oculto");
  estado.textContent = "Selecciona una opción del menú.";
}

async function cargarModelos() {
  if (modelosCargados) return;

  estado.textContent = "Cargando modelos de reconocimiento facial...";

  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

  modelosCargados = true;
}

async function iniciarCamara() {
  try {
    await cargarModelos();

    if (stream) detenerCamara();

    estado.textContent = "Solicitando permiso para usar la cámara...";

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: camaraTipo.value,
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    video.srcObject = stream;

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const esFrontal = camaraTipo.value === "user";
    video.classList.toggle("mirror", esFrontal);
    canvas.classList.toggle("mirror", esFrontal);

    btnIniciar.disabled = true;
    btnRegistrar.disabled = false;
    btnBuscar.disabled = false;
    btnDetener.disabled = false;
    btnRegistrarMariela.disabled = false;

    await prepararMatcherActual();

    estado.textContent = "Cámara activa. Ya puedes registrar o buscar.";
  } catch (error) {
    console.error(error);
    estado.textContent = "No se pudo iniciar la cámara. Revisa permisos o abre el sitio desde GitHub Pages con HTTPS.";
  }
}

async function registrarPersona() {
  if (modo !== "persona") {
    estado.textContent = "Esta opción es para el modo “Encontrarme a mí”.";
    return;
  }

  const nombre = nombrePersona.value.trim();

  if (!nombre) {
    estado.textContent = "Escribe primero el nombre de la persona.";
    nombrePersona.focus();
    return;
  }

  const muestras = await tomarMuestras(nombre);

  if (!muestras) return;

  const perfil = {
    nombre,
    muestras
  };

  localStorage.setItem(CLAVE_PERSONA, JSON.stringify(perfil));
  await prepararMatcherPersona(perfil);

  estado.textContent = `${nombre} quedó registrado/a. Ahora presiona “Buscar persona”.`;
}

async function registrarMariela() {
  if (modo !== "mariela") {
    estado.textContent = "Entra primero al modo “Encontrar a Mariela”.";
    return;
  }

  const muestras = await tomarMuestras("Mariela");

  if (!muestras) return;

  const perfil = {
    nombre: "Mariela",
    muestras
  };

  localStorage.setItem(CLAVE_MARIELA_LOCAL, JSON.stringify(perfil));
  await prepararMatcherMariela(perfil);

  estado.textContent = "Mariela quedó registrada en este navegador. Puedes buscarla o exportar su perfil.";
}

async function tomarMuestras(nombre) {
  if (!stream) {
    estado.textContent = "Primero debes iniciar la cámara.";
    return null;
  }

  buscando = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mensajeDetectado.classList.remove("mensaje-visible");

  estado.textContent = `Mira a la cámara. Registrando 5 muestras de ${nombre}...`;

  const muestras = [];

  for (let i = 1; i <= 5; i++) {
    await esperar(750);

    const deteccion = await detectarUnRostro();

    if (!deteccion) {
      estado.textContent = `No se detectó bien el rostro en la muestra ${i}. Usa buena luz y acércate un poco.`;
      return null;
    }

    muestras.push(Array.from(deteccion.descriptor));
    dibujarCaja(deteccion.detection.box, `Muestra ${i}/5`, "#00ff88");
    estado.textContent = `Muestra ${i}/5 de ${nombre} guardada correctamente.`;
  }

  return muestras;
}

async function prepararMatcherActual() {
  if (modo === "persona") {
    const data = localStorage.getItem(CLAVE_PERSONA);
    if (!data) {
      faceMatcher = null;
      return;
    }

    await prepararMatcherPersona(JSON.parse(data));
  }

  if (modo === "mariela") {
    const perfil = obtenerPerfilMariela();
    if (!perfil) {
      faceMatcher = null;
      return;
    }

    await prepararMatcherMariela(perfil);
  }
}

async function prepararMatcherPersona(perfil) {
  nombreBuscado = perfil.nombre;
  const descriptores = perfil.muestras.map((d) => new Float32Array(d));
  const etiqueta = new faceapi.LabeledFaceDescriptors(perfil.nombre, descriptores);
  faceMatcher = new faceapi.FaceMatcher([etiqueta], Number(sensibilidad.value));
}

async function prepararMatcherMariela(perfil) {
  nombreBuscado = "Mariela";
  const descriptores = perfil.muestras.map((d) => new Float32Array(d));
  const etiqueta = new faceapi.LabeledFaceDescriptors("Mariela", descriptores);
  faceMatcher = new faceapi.FaceMatcher([etiqueta], Number(sensibilidad.value));
}

function obtenerPerfilMariela() {
  const local = localStorage.getItem(CLAVE_MARIELA_LOCAL);

  if (local) {
    return JSON.parse(local);
  }

  if (typeof PERFIL_MARIELA !== "undefined" && PERFIL_MARIELA && PERFIL_MARIELA.muestras) {
    return PERFIL_MARIELA;
  }

  return null;
}

function existePerfilMariela() {
  return Boolean(obtenerPerfilMariela());
}

async function iniciarBusqueda() {
  if (!stream) {
    estado.textContent = "Primero debes iniciar la cámara.";
    return;
  }

  await prepararMatcherActual();

  if (!faceMatcher) {
    estado.textContent = modo === "mariela"
      ? "No hay perfil de Mariela todavía. Presiona “Registrar Mariela”."
      : "No hay una persona registrada. Escribe un nombre y registra su rostro.";
    return;
  }

  buscando = true;
  ultimaAccion = 0;
  estado.textContent = `Buscando a ${nombreBuscado}. Apunta la cámara hacia las personas.`;
  buscarEnVideo();
}

async function buscarEnVideo() {
  if (!buscando) return;

  const opciones = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5
  });

  const resultados = await faceapi
    .detectAllFaces(video, opciones)
    .withFaceLandmarks()
    .withFaceDescriptors();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let encontrado = false;

  resultados.forEach((resultado) => {
    const mejor = faceMatcher.findBestMatch(resultado.descriptor);

    if (mejor.label !== "unknown") {
      encontrado = true;
      dibujarCaja(resultado.detection.box, `${mejor.label} (${mejor.distance.toFixed(2)})`, "#00ff88");
    } else {
      dibujarCaja(resultado.detection.box, "Desconocido", "#ff4d6d");
    }
  });

  if (encontrado) {
    mensajeDetectado.textContent = `¡${nombreBuscado} encontrado/a correctamente!`;
    mensajeDetectado.classList.add("mensaje-visible");
    ejecutarAccion();
  } else {
    mensajeDetectado.classList.remove("mensaje-visible");
    estado.textContent = resultados.length > 0
      ? `Hay rostros en cámara, pero todavía no encuentro a ${nombreBuscado}.`
      : "No hay rostros visibles. Acerca o enfoca mejor la cámara.";
  }

  setTimeout(buscarEnVideo, 250);
}

async function detectarUnRostro() {
  const opciones = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5
  });

  const detecciones = await faceapi
    .detectAllFaces(video, opciones)
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (!detecciones.length) return null;

  detecciones.sort((a, b) => {
    const areaA = a.detection.box.width * a.detection.box.height;
    const areaB = b.detection.box.width * b.detection.box.height;
    return areaB - areaA;
  });

  return detecciones[0];
}

function dibujarCaja(box, texto, color) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.font = "22px Arial";

  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.fillText(texto, box.x, box.y > 30 ? box.y - 10 : box.y + 25);
}

function ejecutarAccion() {
  const ahora = Date.now();

  if (ahora - ultimaAccion < TIEMPO_ESPERA) return;

  ultimaAccion = ahora;

  if (accion.value === "mensaje") {
    estado.textContent = `¡${nombreBuscado} fue encontrado/a!`;
  }

  if (accion.value === "musica") {
    estado.textContent = `¡${nombreBuscado} fue encontrado/a! Reproduciendo canción...`;
    audio.play().catch(() => {
      estado.textContent = "El navegador bloqueó el audio o falta el archivo cancion.mp3.";
    });
  }

  if (accion.value === "web") {
    const sitio = url.value.trim();

    if (!sitio) {
      estado.textContent = `${nombreBuscado} fue encontrado/a, pero no hay una URL escrita.`;
      return;
    }

    estado.textContent = `¡${nombreBuscado} fue encontrado/a! Abriendo sitio web...`;

    setTimeout(() => {
      window.location.href = sitio;
    }, 1000);
  }
}

function exportarPerfilMariela() {
  const perfil = obtenerPerfilMariela();

  if (!perfil) {
    estado.textContent = "Primero debes registrar a Mariela para poder exportar su perfil.";
    return;
  }

  const contenido = `/*
  Perfil fijo de Mariela.
  Este archivo fue generado desde la app.
*/

const PERFIL_MARIELA = ${JSON.stringify(perfil, null, 2)};
`;

  textoExportado.value = contenido;
  exportBox.classList.remove("oculto");
  exportBox.scrollIntoView({ behavior: "smooth" });
}

function borrarPerfilMarielaLocal() {
  localStorage.removeItem(CLAVE_MARIELA_LOCAL);
  faceMatcher = null;
  estado.textContent = "Perfil local de Mariela borrado. Si existe perfil fijo en perfiles.js, ese seguirá disponible.";
}

function detenerCamara() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  stream = null;
  video.srcObject = null;
}

function detenerTodo() {
  buscando = false;
  detenerCamara();

  if (canvas.width && canvas.height) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  mensajeDetectado.classList.remove("mensaje-visible");

  btnIniciar.disabled = false;
  btnRegistrar.disabled = true;
  btnBuscar.disabled = true;
  btnDetener.disabled = true;
  btnRegistrarMariela.disabled = true;

  if (modo) {
    estado.textContent = "Agente detenido.";
  }
}

function limpiarPantalla() {
  buscando = false;
  mensajeDetectado.classList.remove("mensaje-visible");

  if (canvas.width && canvas.height) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
