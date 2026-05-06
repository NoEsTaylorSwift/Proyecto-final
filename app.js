const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const btnIniciar = document.getElementById("btnIniciar");
const btnRegistrar = document.getElementById("btnRegistrar");
const btnBuscar = document.getElementById("btnBuscar");
const btnDetener = document.getElementById("btnDetener");
const btnBorrar = document.getElementById("btnBorrar");

const camaraTipo = document.getElementById("camaraTipo");
const accion = document.getElementById("accion");
const url = document.getElementById("url");
const sensibilidad = document.getElementById("sensibilidad");
const estado = document.getElementById("estado");
const audio = document.getElementById("audio");
const mensajeDetectado = document.getElementById("mensajeDetectado");

const MODEL_URL = "https://vladmandic.github.io/face-api/model/";
const CLAVE_ROSTRO = "miRostroDescriptoresV1";

let stream = null;
let modelosCargados = false;
let buscando = false;
let faceMatcher = null;
let ultimaAccion = 0;

const TIEMPO_ESPERA = 10000;

btnIniciar.addEventListener("click", iniciarCamara);
btnRegistrar.addEventListener("click", registrarMiRostro);
btnBuscar.addEventListener("click", iniciarBusqueda);
btnDetener.addEventListener("click", detenerTodo);
btnBorrar.addEventListener("click", borrarRegistro);
sensibilidad.addEventListener("input", cargarRegistroGuardado);

window.addEventListener("load", async () => {
  if (localStorage.getItem(CLAVE_ROSTRO)) {
    estado.textContent = "Ya existe un rostro registrado en este navegador. Inicia la cámara y presiona “Buscarme”.";
  }
});

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

    await cargarRegistroGuardado();

    estado.textContent = "Cámara activa. Si aún no lo hiciste, presiona “Registrar mi rostro”.";
  } catch (error) {
    console.error(error);
    estado.textContent = "No se pudo iniciar la cámara. Revisa permisos o abre el sitio desde GitHub Pages con HTTPS.";
  }
}

async function registrarMiRostro() {
  if (!stream) {
    estado.textContent = "Primero debes iniciar la cámara.";
    return;
  }

  buscando = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mensajeDetectado.classList.remove("mensaje-visible");

  estado.textContent = "Mira a la cámara. Registrando 5 muestras de tu rostro...";

  const muestras = [];

  for (let i = 1; i <= 5; i++) {
    await esperar(700);

    const deteccion = await detectarUnRostro();

    if (!deteccion) {
      estado.textContent = `No se detectó tu rostro en la muestra ${i}. Acércate más y usa buena luz.`;
      return;
    }

    muestras.push(Array.from(deteccion.descriptor));
    dibujarCaja(deteccion.detection.box, `Muestra ${i}/5`, "#00ff88");
    estado.textContent = `Muestra ${i}/5 guardada correctamente.`;
  }

  localStorage.setItem(CLAVE_ROSTRO, JSON.stringify(muestras));
  await cargarRegistroGuardado();

  estado.textContent = "Tu rostro quedó registrado en este navegador. Ahora puedes presionar “Buscarme”.";
}

async function cargarRegistroGuardado() {
  const data = localStorage.getItem(CLAVE_ROSTRO);

  if (!data) {
    faceMatcher = null;
    return;
  }

  const descriptores = JSON.parse(data).map((d) => new Float32Array(d));
  const etiqueta = new faceapi.LabeledFaceDescriptors("Mi rostro", descriptores);
  const umbral = Number(sensibilidad.value);

  faceMatcher = new faceapi.FaceMatcher([etiqueta], umbral);
}

async function iniciarBusqueda() {
  if (!stream) {
    estado.textContent = "Primero debes iniciar la cámara.";
    return;
  }

  await cargarRegistroGuardado();

  if (!faceMatcher) {
    estado.textContent = "Aún no has registrado tu rostro. Presiona “Registrar mi rostro”.";
    return;
  }

  buscando = true;
  ultimaAccion = 0;
  estado.textContent = "Buscando tu rostro. Apunta la cámara hacia la multitud.";
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

    if (mejor.label === "Mi rostro") {
      encontrado = true;
      dibujarCaja(resultado.detection.box, `Te encontré (${mejor.distance.toFixed(2)})`, "#00ff88");
    } else {
      dibujarCaja(resultado.detection.box, "Desconocido", "#ff4d6d");
    }
  });

  if (encontrado) {
    mensajeDetectado.classList.add("mensaje-visible");
    ejecutarAccion();
  } else {
    mensajeDetectado.classList.remove("mensaje-visible");
    estado.textContent = resultados.length > 0
      ? "Hay rostros en cámara, pero todavía no encuentro el tuyo."
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

  // Para registrar, toma el rostro más grande de la imagen.
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
    estado.textContent = "¡Te encontré! Acción ejecutada: mensaje mostrado.";
  }

  if (accion.value === "musica") {
    estado.textContent = "¡Te encontré! Reproduciendo canción...";
    audio.play().catch(() => {
      estado.textContent = "El navegador bloqueó el audio o falta el archivo cancion.mp3.";
    });
  }

  if (accion.value === "web") {
    const sitio = url.value.trim();

    if (!sitio) {
      estado.textContent = "Te encontré, pero no hay una URL escrita.";
      return;
    }

    estado.textContent = "¡Te encontré! Abriendo sitio web...";

    setTimeout(() => {
      window.location.href = sitio;
    }, 1000);
  }
}

function borrarRegistro() {
  localStorage.removeItem(CLAVE_ROSTRO);
  faceMatcher = null;
  mensajeDetectado.classList.remove("mensaje-visible");
  estado.textContent = "Registro borrado. Puedes registrar tu rostro nuevamente.";
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  mensajeDetectado.classList.remove("mensaje-visible");

  btnIniciar.disabled = false;
  btnRegistrar.disabled = true;
  btnBuscar.disabled = true;
  btnDetener.disabled = true;

  estado.textContent = "Agente detenido.";
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
