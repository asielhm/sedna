# Extensión de Chrome · prueba piloto

## Instalar

1. Descargá el repositorio desde GitHub (Code → Download ZIP) y descomprimilo.
2. Abrí `chrome://extensions` y activá **Modo de desarrollador**.
3. Pulsá **Cargar descomprimida** y elegí la carpeta `extension`, que contiene `manifest.json`.
4. Fijá la extensión desde el menú de extensiones de Chrome.

No necesitás Python, ChromeDriver ni un servidor. No está publicada en Chrome Web Store.

## Probar una clase

1. Ingresá a Sedna en Chrome como siempre. Abrí Calificaciones → Ingreso de Cuatrimestrales o Rendimientos, seleccioná período y clase y esperá a que terminen de cargar los alumnos.
2. Desde esa pestaña, pulsá el ícono de la extensión. Se abre el asistente en otra pestaña. Mantené ambas abiertas.
3. Elegí tipo y período, cargá tu `.xlsx` y seleccioná la hoja correspondiente. Se admiten los dos formatos aportados; los ceros de competencias se conservan. Los nombres deben coincidir exactamente con Sedna, salvo espacios repetidos. Logros Académicos se convierte como en Python: `5 - valor`.
4. Pulsá **Leer clase y período de Sedna**. Revisá la correspondencia entre hoja, clase y período; la extensión no asigna clases por posición automáticamente.
5. Confirmá y pulsá **Completar campos en Sedna**. Se validan todos los alumnos y opciones de esa clase antes de cambiar valores. Si hay un nombre ambiguo o una nota no disponible, se detiene.
6. Volvé a Sedna y revisá cada valor. **Pulsá Aceptar en Sedna para guardar** y atendé sus mensajes. La extensión no pulsa Aceptar ni confirma persistencia. No cambies clase ni recargues sin guardar: perderías los valores completados.
7. Para la siguiente clase, seleccionála en Sedna, elegí su hoja en el asistente y repetí la lectura y confirmación. No operes dos asistentes sobre la misma pestaña.

Esta versión prueba el llenado de una clase por vez, no el guardado automático de todo el archivo. Los selectores se basan en la app Python suministrada. Falta verificarla con una sesión real de Sedna; empezá con una sola clase y comprobá el resultado antes de ampliar el uso.

## Privacidad y permisos

Permiso `scripting` y acceso únicamente a `https://sedna.sanandres.esc.edu.ar/*`. Sin permisos de cookies, almacenamiento ni acceso a otros sitios. El Excel se lee en memoria local; no hay peticiones a servicios externos ni contraseñas en la extensión. Cerrá el asistente al terminar para descartar los datos. El botón de descarga genera una plantilla vacía, sin datos reales.

ExcelJS 4.4.0 está incluido localmente en `vendor/` bajo licencia MIT (ver `vendor/EXCELJS-LICENSE`). No se descarga código al ejecutar la extensión. Para renovar la copia: instalar `exceljs@4.4.0` desde npm y copiar `dist/exceljs.min.js` y `LICENSE`.
