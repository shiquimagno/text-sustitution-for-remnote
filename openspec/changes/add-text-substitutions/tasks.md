# Tasks

## 1. Preparar la base y demostrar la integración con RemNote

- [ ] 1.1 Incorporar la plantilla oficial sin sobrescribir OpenSpec, fijar `@remnote/plugin-sdk` 0.0.46 y generar el lockfile de npm; verificar instalación, `npm run check-types`, validación del manifiesto y carga del plugin de desarrollo en escritorio y navegador.
- [ ] 1.2 Crear una prueba mínima con dos frases y un widget flotante en modo sandbox: comprobar detección de `;obj`, lectura de selección, posicionamiento y mantenimiento del foco en ambos entornos; registrar versiones y resultados en `docs/editor-compatibility.md`.
- [ ] 1.3 Probar la captura de flechas, Tab, Enter y Escape asociada a la ventana; verificar aceptación única, ausencia de indentación o Rem nuevo y devolución de las teclas tras Escape, clic externo, cambio de panel y desactivación; documentar también la interacción con menús nativos.
- [ ] 1.4 Demostrar sustitución de un rango seleccionado y restauración con una sola acción de Deshacer, incluyendo texto posterior al cursor, emojis, referencias y formato alrededor; verificar además exclusión de código y fórmulas e identificar los permisos mínimos en `docs/editor-compatibility.md`. Si falla algún requisito en un entorno, documentar el límite y revisar el diseño antes de continuar con la interacción completa.

## 2. Implementar el catálogo y las reglas de búsqueda

- [x] 2.1 Definir el modelo versionado, identificadores estables y validación de nombre, texto, abreviaturas y prefijo; verificar con pruebas las entradas inválidas, las abreviaturas duplicadas dentro de una entrada y las abreviaturas compartidas entre variantes.
- [x] 2.2 Implementar el filtro por comienzo de abreviatura, normalización de mayúsculas y tildes, exclusión de entradas desactivadas, deduplicación y orden estable; verificar con pruebas consulta vacía, varias variantes, ausencia de coincidencias y preservación literal de la frase.
- [ ] 2.3 Implementar lectura y guardado sincronizados con inicialización posterior a una lectura válida; verificar con pruebas de fallos que no se sobrescriben datos existentes ni se pierde un borrador, y con RemNote real que los cambios sobreviven a una recarga y llegan a otro dispositivo o cliente de la misma cuenta después de sincronizar. Documentar los límites observados de edición concurrente y cualquier prueba entre dispositivos aún pendiente.

## 3. Crear los ajustes y el panel «Mis sustituciones»

- [ ] 3.1 Registrar prefijo e interruptor general en Ajustes y el comando que abre el widget de gestión; verificar que el panel se abre desde RemNote y que cambiar el prefijo afecta a las invocaciones posteriores sin modificar las abreviaturas guardadas.
- [ ] 3.2 Implementar listado y formularios de creación y edición con errores visibles; verificar guardando dos preguntas desde un formulario con `obj` y `objetivo` escritos una vez, añadiendo una variante desde una frase existente, editando una y comprobando que un guardado inválido conserva el borrador y no cambia el catálogo.
- [ ] 3.3 Incorporar eliminación y activación/desactivación por entrada; verificar que desactivar conserva la frase, que reactivar la recupera y que eliminar la retira de las sugerencias. Añadir instrucciones de uso y gestión a `README.md` y comprobarlas mediante el panel real.

## 4. Integrar el selector con la escritura

- [ ] 4.1 Sustituir los datos de prueba por el catálogo y detectar prefijo y consulta mediante eventos del editor y rangos de rich text; verificar invocaciones al inicio, en medio del texto y con contenido posterior al cursor, y que los campos del panel, código, fórmulas y selecciones no colapsadas no lo activan.
- [ ] 4.2 Mostrar lista, selección inicial y previsualización completa; implementar navegación y captura limitada a una sesión con coincidencias. Verificar que las flechas cambian la previsualización sin editar el Rem y que, sin coincidencias, Tab y Enter conservan su función normal.
- [ ] 4.3 Integrar la inserción de texto literal sobre el rango y el cierre del selector, siguiendo la solución de la prueba inicial; verificar el ejemplo «Antes ;obj después», cursor al final de la frase, igualdad de comportamiento entre Tab y Enter y restauración con una acción de Deshacer.
- [ ] 4.4 Gestionar revisiones asíncronas, repetición de teclas, cambios del catálogo, cancelación y limpieza de listeners; verificar que una sesión obsoleta no inserta en otro Rem, una entrada desactivada no se acepta, Escape no reabre la misma consulta y cerrar o desactivar devuelve todas las teclas. Cubrir las transiciones de sesión con pruebas automatizadas y comprobar foco y teclado en RemNote real.

## 5. Verificar la experiencia integrada y preparar la entrega

- [ ] 5.1 Ejecutar en escritorio y navegador los escenarios de ambas especificaciones, incluidos tema claro/oscuro, scroll, referencia nativa abierta, prefijo configurable, contenido formateado circundante y padre/hijos existentes; registrar resultados, versiones y limitaciones en `docs/editor-compatibility.md` sin marcar como verificadas las pruebas que no se hayan podido ejecutar.
- [ ] 5.2 Confirmar nombre visible e identificador definitivo antes de empaquetar, conservar el catálogo durante actualizaciones y completar las instrucciones de instalación y desactivación en `README.md`; verificar una instalación del paquete generado siguiendo esas instrucciones.
- [ ] 5.3 Ejecutar las pruebas automatizadas relevantes, `npm run check-types`, `npm run build` y la validación estricta de OpenSpec; comprobar el paquete resultante y que desactivar el plugin deja la edición y el teclado funcionando normalmente, sin modificar la estructura de las notas.

## Workflow follow-up

- Revisar la implementación y las evidencias frente a la propuesta y las especificaciones antes de archivar el cambio.
- Planificar publicación en el marketplace únicamente si se solicita después; no forma parte de este cambio.

## Implementation notes

17 de noviembre de 2026: plantilla y dependencias locales incorporadas; prototipo temporal con dos frases, activación explícita por comando y restricción al Rem elegido. TypeScript, tres pruebas unitarias, compilación y validación estricta de OpenSpec pasan. La compilación emite avisos de tamaño de los paquetes del SDK. Se comprueba el manifiesto de desarrollo con el esquema del SDK, sin excepciones y usando una URL local provisional en repoUrl tras el rechazo de la primera instalación comunicado por el usuario; la validación de marketplace no se considera realizada.

Las tareas 1.1–1.4 continúan pendientes porque aún falta la instalación y prueba manual en RemNote. Por acuerdo del usuario, solo él opera su cuenta. La siguiente comprobación es instalar desde el servidor local y comunicar el resultado; el catálogo y el panel definitivo dependen de validar primero la integración.

0.2.0: modelo y filtro del catálogo completados con pruebas (2.1 y 2.2). Implementados panel y almacenamiento sincronizado del SDK, pero las tareas de persistencia real y uso del panel permanecen abiertas hasta que el usuario haga las pruebas. La confirmación de 0.1.5 acredita la navegación del selector, no todos los escenarios de compatibilidad iniciales.
