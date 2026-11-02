# Extensión de Chrome · 0.2.0 · prueba piloto

## Instalar o actualizar

Descargá el ZIP de la versión en el sitio de GitHub Pages y descomprimilo en una carpeta permanente. Abrí `chrome://extensions`, activá **Modo de desarrollador**, pulsá **Cargar descomprimida** y elegí la carpeta que contiene `manifest.json`. Para actualizar una instalación existente, reemplazá el contenido de su carpeta instalada y pulsá **Recargar**. La versión 0.2.0 agrega el permiso `debugger`: Chrome puede solicitar que aceptes el permiso nuevo. Cerrá asistentes viejos y volvé a abrirlos después de actualizar.

## Cargar todas las hojas

1. Entrá a Sedna, abrí Calificaciones → Ingreso de Cuatrimestrales o Rendimientos, elegí el período y esperá a que cargue la pantalla. Guardá o descartá cambios pendientes antes de comenzar.
2. Pulsá el ícono de la extensión desde esa pestaña de Sedna. Mantené ambas pestañas abiertas.
3. Elegí tipo y período, cargá el Excel y revisá las vistas previas. Se conservan los ceros de competencias; Logros Académicos se convierte a `5 - valor`, igual que en Python.
4. Pulsá **Leer clases y período de Sedna**. Se muestra una correspondencia para CADA hoja del Excel, inicialmente por posición. Revisá y corregí cada clase; no se permite asignar dos hojas a la misma clase.
5. Marcá la autorización y pulsá **Cargar, guardar y verificar todas las clases**. Esto autoriza guardados reales para todas las hojas, sin pedir confirmación adicional por clase.
6. Esperá sin navegar en Sedna, cambiar clases, cerrar pestañas ni abrir DevTools. Chrome muestra el aviso de depuración mientras se resuelven los diálogos de Sedna.

## Qué se verifica

Antes del primer guardado, se visitan y validan todas las clases: período, correspondencia, nombres únicos y opciones de nota. Después se completan los campos y se pulsa Aceptar por cada clase. Los diálogos nativos alert/confirm que aparezcan durante ese guardado se aceptan automáticamente; su texto no se considera prueba de éxito.

Para verificar, la extensión abre la página otra vez con GET, con caché y service worker desactivados temporalmente, selecciona nuevamente período y clase y compara TODOS los campos del Excel con los valores que devuelve Sedna. Solo entonces marca **persistencia verificada al releer Sedna**. No equivale a una auditoría de la base de datos ni garantiza que otro usuario no cambie las notas después.

Si falla la validación previa no se guarda ninguna clase. Si falla un guardado o la relectura, se detiene el resto y se indica **guardado incierto**, **detenida antes de guardar** o **pendiente**. Las clases anteriores verificadas ya pueden quedar guardadas. No hay rollback ni reintentos automáticos. Revisá Sedna antes de ejecutar el lote nuevamente.

La integración usa los selectores de la app Python aportada y requiere navegación completa de ASP.NET al cambiar clase/período o guardar. Si Sedna usa solo actualizaciones parciales o cambia sus pantallas, la extensión se detiene por timeout en vez de confirmar persistencia sin evidencia. Hay pruebas simuladas, pero aún falta verificar la versión 0.2.0 con una cuenta real de Sedna.

## Permisos y privacidad

`scripting` y acceso únicamente a `https://sedna.sanandres.esc.edu.ar/*` para leer y completar los campos. `debugger` es un permiso amplio de Chrome; el código lo conecta exclusivamente a la pestaña de Sedna elegida durante el lote, para aceptar alert/confirm y desactivar caché durante la relectura. Se desconecta al terminar o fallar. No uses otro asistente ni DevTools en esa pestaña durante el proceso. Si otro depurador ya está conectado, la carga falla antes de guardar.

Sin cookies ni almacenamiento persistente. Excel y resultados se mantienen en memoria; cerrá el asistente al terminar. No se piden contraseñas ni se envían datos a servidores externos, salvo las notas que autorizaste guardar en Sedna. Los archivos de alumnos no están incluidos en los paquetes.

ExcelJS 4.4.0 se incluye localmente bajo licencia MIT en `vendor/EXCELJS-LICENSE`. Pruebas: `npm ci --prefix extension` y `npm test --prefix extension` desde la raíz del repositorio. Chrome Web Store no se usa para esta distribución; actualizaciones manuales desde GitHub Pages.
