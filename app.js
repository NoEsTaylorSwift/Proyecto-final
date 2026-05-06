const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const btnIniciar = document.getElementById("btnIniciar");
const btnDetener = document.getElementById("btnDetener");
const estado = document.getElementById("estado");
const accion = document.getElementById("accion");
const url = document.getElementById("url");
const audio = document.getElementById("audio");
const mensajeDetectado = document.getElementById("mensajeDetectado");

let modelo = null;
let stream = null;
let detectando = false;
let ultimaAccion = 0;

// Evita que la acción se repita demasiadas veces
const TIEMPO_ESPERA = 10000;

btnIniciar.addEventListener("click", iniciarAgente);
btnDetener.addEventListener("click", detenerAgente);

async function iniciarAgente() {
  try {
    estado.textContent = "Cargando modelo de detección facial...";

    if (!modelo) {
      modelo = await blazeface.load();
    }

    estado.textContent = "Solicitando permiso para usar la cámara...";

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
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

    detectando = true;
    btnIniciar.disabled = true;
    btnDetener.disabled = false;

    estado.textContent = "Agente activo. Coloca tu rostro frente a la cámara.";
    detectarRostro();
  } catch (error) {
    console.error(error);
    estado.textContent =
      "No se pudo iniciar la cámara. Revisa permisos, navegador o que abras el sitio con HTTPS.";
  }
}

async function detectarRostro() {
  if (!detectando || !modelo) return;

  const predicciones = await modelo.estimateFaces(video, false);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (predicciones.length > 0) {
    predicciones.forEach((rostro) => {
      const [x1, y1] = rostro.topLeft;
      const [x2, y2] = rostro.bottomRight;
      const ancho = x2 - x1;
      const alto = y2 - y1;

      ctx.lineWidth = 4;
      ctx.strokeStyle = "#00ff88";
      ctx.strokeRect(x1, y1, ancho, alto);

      ctx.font = "22px Arial";
      ctx.fillStyle = "#00ff88";
      ctx.fillText("Rostro detectado", x1, y1 > 30 ? y1 - 10 : y1 + 25);
    });

    ejecutarAccion();
  } else {
    mensajeDetectado.classList.remove("mensaje-visible");
  }

  requestAnimationFrame(detectarRostro);
}

function ejecutarAccion() {
  const ahora = Date.now();

  if (ahora - ultimaAccion < TIEMPO_ESPERA) return;

  ultimaAccion = ahora;
  mensajeDetectado.classList.add("mensaje-visible");

  if (accion.value === "mensaje") {
    estado.textContent = "Rostro detectado. Acción ejecutada: mensaje mostrado.";
  }

  if (accion.value === "musica") {
    estado.textContent = "Rostro detectado. Intentando reproducir canción...";

    audio.play().catch(() => {
      estado.textContent =
        "El navegador bloqueó el audio o no existe cancion.mp3. Toca iniciar de nuevo o agrega una canción con ese nombre.";
    });
  }

  if (accion.value === "web") {
    const sitio = url.value.trim();

    if (!sitio) {
      estado.textContent = "Rostro detectado, pero no escribiste una URL.";
      return;
    }

    estado.textContent = "Rostro detectado. Abriendo sitio web...";

    // En celular es más seguro cambiar la página actual que abrir una pestaña nueva.
    setTimeout(() => {
      window.location.href = sitio;
    }, 1000);
  }
}

function detenerAgente() {
  detectando = false;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  video.srcObject = null;
  mensajeDetectado.classList.remove("mensaje-visible");

  btnIniciar.disabled = false;
  btnDetener.disabled = true;
  estado.textContent = "Agente detenido.";
}
