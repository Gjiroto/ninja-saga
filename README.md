# Ninja Saga Codex

Catálogo y comparador estático en español, listo para GitHub Pages. Sin cuentas,
servidor de aplicación ni dependencias de JavaScript. Los textos originales de las
habilidades se conservan para evitar reinterpretar sus mecánicas.

## Primera versión

- Talentos extremos y secretos, Sage Modes, 74 jutsus y 3 mascotas.
- Búsqueda por nombre, descripción o etiquetas en español; filtro por efecto.
- Orden por nombre y, para jutsus, nivel, CP o cooldown.
- Fichas con habilidades, pasivas, valores, imágenes y procedencia.
- Comparación de dos o tres fichas de una misma categoría.
- Navegación por teclado, diálogos nativos y diseño para móvil.
- No incluye todavía personajes, builds ni simulación de estadísticas.

## Vista local

Desde esta carpeta:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8000. No abrir index.html directamente: la carga de JSON
requiere HTTP. No hay proceso de compilación.

## GitHub Pages

1. Subir los archivos de esta carpeta a la rama `main` de `Gjiroto/ninja-saga`.
2. En Settings → Pages, elegir **Deploy from a branch**, rama **main**, carpeta **/(root)**.
3. La dirección prevista es https://gjiroto.github.io/ninja-saga/.

Todas las rutas de datos e imágenes son relativas, compatibles con el subdirectorio.
`.nojekyll` permite servir los archivos directamente. No se ha publicado por el
solo hecho de crear estos archivos: la configuración de Pages se hace en GitHub.

## Datos y actualización

`data/talents.json`, `data/jutsus.json` y `data/pets.json` conservan los catálogos.
`data/assets.json` registra las imágenes locales disponibles. Las capturas de
jutsus y los árboles están en `assets/`; mascotas sin imagen usan iniciales.

En el workspace original, `python scripts/import_data.py` vuelve a importar los
catálogos de las carpetas vecinas `datos_nso`, `datos_jutsus`, `datos_mascotas` y
las capturas de `jutsus`. Descarga las imágenes disponibles del visor original.
No requiere paquetes. Fuera de ese workspace se pueden editar los JSON directamente.

Las etiquetas se derivan de palabras de las descripciones y solo ayudan a buscar.
No se suman bonos ni se calculan probabilidades. `null` aparece como «Sin dato»;
los ceros reales se mantienen. Easter Gobi y Kyubi mascota conservan su estado
pendiente de verificación. Un nombre igual con distinto nivel sigue siendo una
ficha distinta. No hay integración con compras ni con cuentas del juego.

Fuente del catálogo de talentos: https://f701-math.github.io/nso/ (Uruzua).
Jutsus y Divine Wolf: capturas aportadas por el usuario. Referencias históricas
de otras mascotas: indicadas en cada ficha. Imágenes y nombres pertenecen a sus
respectivos autores; este catálogo de comunidad no está afiliado al juego.

## Comprobación de interfaz

Con el servidor local activo, instalar `playwright` y Chromium en un entorno de
pruebas y ejecutar `python scripts/test_browser.py`. Con el servidor iniciado
en esta carpeta, establecer `CODEX_TEST_URL=http://127.0.0.1:8000/`; por defecto
la prueba usa `/ninja-saga/` para comprobar el despliegue bajo un subdirectorio.
El sitio no necesita esas
dependencias para funcionar.
