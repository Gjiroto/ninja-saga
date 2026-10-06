# Ninja Saga Codex

Catálogo y comparador estático en español, listo para GitHub Pages. Sin cuentas,
servidor de aplicación ni dependencias de JavaScript. Los textos originales de las
habilidades se conservan para evitar reinterpretar sus mecánicas.

## Primera versión

## Inicio e idiomas

Al entrar por primera vez se puede elegir Español o English. La preferencia se
guarda en ese navegador; ES/EN permite cambiarla desde la cabecera, una ficha o
el comparador, conservando filtros y selección. Si el almacenamiento está
bloqueado, la elección funciona durante la sesión y se muestra un aviso.

Inicio (`#home`) incluye accesos a las seis categorías, cantidades reales,
búsqueda global bilingüe y acceso al comparador. Los enlaces anteriores a las
categorías siguen funcionando. Los nombres del juego y las imágenes originales
se conservan sin traducir.

`i18n.js` contiene la interfaz bilingüe. `data/translations.json` guarda 563
textos traducidos automáticamente con su original; cada traducción de contenido
ofrece “Ver texto original”. Las cifras se verifican automáticamente, pero esto
no equivale a una revisión humana de todas las mecánicas. Las traducciones
requieren revisión si hay ambigüedades en el original.

`python scripts/translate_catalog.py` genera o completa la caché de traducciones
con un servicio externo de Google Translate. Es una herramienta opcional de
mantenimiento, no un servicio llamado por los visitantes. Necesita red y puede
estar sujeto a disponibilidad o límites. No subir contenido privado al catálogo.
Al añadir textos nuevos, regenerar la caché; si falta alguno, la interfaz muestra
el original y un aviso de traducción pendiente.

Pruebas: `python scripts/test_browser.py` y `python scripts/test_languages.py`,
con el servidor local activo y la URL indicada más abajo.

## Catálogo

- Talentos extremos y secretos, Sage Modes, 74 jutsus de capturas, 311 Ninjutsu de la wiki y 3 mascotas.
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
jutsus y los árboles están en `assets/`. Las 37 miniaturas de extremos están en
`assets/thumbs/` y las tres mascotas en `assets/pets/`. Las imágenes aportadas se
copiaron al repositorio; no dependen de la carpeta temporal `imagenes_pendientes/`.
`data/image-overrides.json` conserva las asignaciones de mascotas al reimportar.

En el workspace original, `python scripts/import_data.py` vuelve a importar los
catálogos de las carpetas vecinas `datos_nso`, `datos_jutsus`, `datos_mascotas` y
las capturas de `jutsus`. Descarga las imágenes disponibles del visor original.
No requiere paquetes. Fuera de ese workspace se pueden editar los JSON directamente.

Las etiquetas se derivan de palabras de las descripciones y solo ayudan a buscar.
No se suman bonos ni se calculan probabilidades. `null` aparece como «Sin dato»;
los ceros reales se mantienen. Las seis habilidades de Easter Gobi y de Kyubi
están documentadas por capturas, incluida Gedo Armor. Un nombre igual con distinto nivel sigue siendo una
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


## Ninjutsu de la wiki y nuevas capturas

La categoría **Ninjutsu · Wiki** contiene 311 filas de las diez tablas de la
[lista principal](https://ninjasaga.fandom.com/wiki/Ninjutsu), con filtro por
elemento y comparador. Se detiene antes de la sección iOS. Conserva variantes,
valores textuales, costos, obtención, enlaces y valores destacados por rango.
Son datos históricos sin confirmar en el servidor actual.

`data/ninjutsu.json`, `data/ninjutsu.csv` y `data/ninjutsu-summary.json` guardan
los resultados; también se exportan a la carpeta vecina `datos_ninjutsu/`.
Las descripciones originales inglesas y las traducciones españolas están
disponibles; los nombres de las técnicas se conservan. La traducción es
automática, con comprobación de que no cambien las cifras.

Para actualizar desde esta carpeta:

```powershell
python -m pip install beautifulsoup4
python scripts/scrape_ninjutsu.py
python scripts/translate_catalog.py
```

El scraper utiliza la API pública y una caché en `scripts/.cache/ninjutsu/`.
Para consultar versiones nuevas del HTML hay que vaciar esa caché primero.
Intenta descargar los iconos; cuando Fandom devuelve HTTP 403 conserva la URL
original y registra el error. La ficha permite abrir esa imagen en la fuente.
La web sigue funcionando con un marcador cuando no existe imagen local.
Cada ficha atribuye la información a Ninja Saga Wiki y enlaza su página.

Las 13 capturas nuevas de mascotas están copiadas en `assets/pets/skills/`.
Las imágenes 4 y 6 de Kyubi muestran Broken Gedo World. La captura adicional
`kyubi-gedo-armor.png` confirma Gedo Armor: nivel 15, cooldown 11, +100% daño
y +25% crítico de la mascota, +20% daño recibido, durante 4 turnos.
Easter Gobi queda documentado con Five Tag Infinity, nivel 25, y drenaje de
HP y CP. Los porcentajes cuya base no se especifica permanecen sin interpretar.

Pruebas: `python scripts/test_browser.py`, `python scripts/test_languages.py`
y `python scripts/test_ninjutsu.py` (servidor activo y Playwright instalado).
