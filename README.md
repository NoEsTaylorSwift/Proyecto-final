# Agente de Reconocimiento Facial Web

Proyecto web hecho con HTML, CSS y JavaScript.

## ¿Qué hace?

- Abre la cámara del celular o computadora.
- Detecta rostros usando TensorFlow.js y BlazeFace.
- Cuando detecta un rostro puede:
  - Mostrar un mensaje.
  - Abrir un sitio web.
  - Reproducir una canción.

## Archivos

- `index.html`: estructura de la página.
- `style.css`: diseño visual.
- `app.js`: lógica de cámara, detección y acciones.
- `cancion.mp3`: debes agregarla tú si quieres usar la opción de música.

## Cómo probarlo en tu PC

1. Abre la carpeta del proyecto.
2. Da doble clic en `index.html`.
3. Presiona “Iniciar agente”.
4. Permite el uso de la cámara.

Nota: En algunos navegadores la cámara funciona mejor desde `localhost` o desde GitHub Pages con HTTPS.

## Cómo subirlo a GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube estos archivos:
   - index.html
   - style.css
   - app.js
   - cancion.mp3, si usarás música.
3. Entra a Settings.
4. Entra a Pages.
5. En Source selecciona Deploy from a branch.
6. Selecciona la rama main y la carpeta root.
7. Guarda los cambios.
8. GitHub te dará un enlace para abrir tu app.

## Importante para celular

Abre el enlace HTTPS de GitHub Pages desde Chrome o Safari y acepta el permiso de cámara.
