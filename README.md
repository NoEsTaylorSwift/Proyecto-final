# Agente Facial Web con Menú

Proyecto web con dos modos:

## 1. Encontrarme a mí

Sirve para que cualquier persona use la app.

Flujo:

1. Escribir nombre.
2. Iniciar cámara.
3. Registrar rostro.
4. Buscar persona.

## 2. Encontrar a Mariela

Sirve para buscar a Mariela sin registrarla siempre.

Flujo recomendado:

1. Entrar a "Encontrar a Mariela".
2. Iniciar cámara.
3. Registrar Mariela.
4. Buscar a Mariela.

## Dejar a Mariela fija en el proyecto

Como GitHub Pages no tiene base de datos, hay dos formas de guardar el rostro:

### Forma 1: Guardado local

Al registrar a Mariela, queda guardada en ese navegador.
Si cambias de celular o limpias datos, debes registrarla otra vez.

### Forma 2: Perfil fijo en perfiles.js

1. Registra a Mariela.
2. Presiona "Exportar perfil".
3. Copia el texto generado.
4. Abre `perfiles.js` en GitHub.
5. Borra todo y pega el texto exportado.
6. Guarda con Commit changes.

Después de eso, el modo "Encontrar a Mariela" tendrá un perfil fijo.

## Archivos

- `index.html`
- `style.css`
- `app.js`
- `perfiles.js`
- `README.md`

## Música

Si quieres reproducir canción, agrega un archivo llamado:

`cancion.mp3`

## Recomendaciones

- Usa buena iluminación.
- Para registrar, mira de frente a la cámara.
- Para buscar entre varias personas, usa cámara trasera.
- No estés demasiado lejos.
- Prueba antes de exponer.
