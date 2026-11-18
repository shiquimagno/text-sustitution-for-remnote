# Design

## Context

El proyecto contiene únicamente la configuración de OpenSpec y estos artefactos; no hay una implementación que extender. La motivación y el alcance están en `proposal.md`.

La documentación oficial confirma APIs para edición, eventos, ajustes y almacenamiento. Además, se consultó el registro de npm y se leyeron, sin ejecutar el paquete, los tipos de `@remnote/plugin-sdk` **0.0.46** el 17 de noviembre de 2026. Se verificó la integridad SHA-512 de la descarga. La existencia de métodos en los tipos no demuestra todavía su comportamiento en el editor de la aplicación instalada.

**Decisiones confirmadas por el usuario:** escritorio y navegador desde la primera versión; texto simple; prefijo configurable inicialmente `;`; varias abreviaturas por entrada y variantes compartidas; sustitución únicamente del prefijo y la consulta en cualquier parte del texto; catálogo personal sincronizado; Tab y Enter; ajustes generales y panel de gestión. No se crean padres, hijos ni otros Rems.

**Valores de diseño propuestos:** búsqueda por comienzo de abreviatura sin distinguir mayúsculas ni tildes; listado de todas las entradas activadas al escribir solo el prefijo; orden estable por nombre e identificador; catálogo inicialmente vacío; cursor al final de la frase y sin espacios añadidos automáticamente. Son recomendaciones para esta versión, no respuestas adicionales atribuidas al usuario.

## Goals / Non-Goals

**Goals:**

- Separar la búsqueda y validación de datos de la integración con el editor, para poder comprobar esas reglas sin una sesión de RemNote.
- Mantener la selección y el rango de invocación mientras se actualiza una ventana flotante, sin quitar el foco de escritura innecesariamente.
- Comprobar con una prueba funcional temprana las dependencias del editor antes de construir todo el panel.

**Non-Goals:**

- Incorporar un servidor propio, credenciales o llamadas de IA para resolver sustituciones.
- Interpretar la frase como Markdown ni implementar un sistema de plantillas con variables.
- Prometer publicación en el marketplace o compatibilidad móvil en esta fase. La exclusión funcional completa está en `proposal.md`.

## Decisions

### 1. Plantilla oficial y SDK con versión fijada

Partir de la [plantilla oficial de React](https://github.com/remnoteio/remnote-plugin-template-react), con TypeScript y las versiones compatibles de sus dependencias. Usar npm y un lockfile; fijar inicialmente el SDK en 0.0.46 en lugar de dejar `latest`. La versión de la aplicación RemNote y del navegador usados en las pruebas se registrará con los resultados.

Un proyecto desde cero exigiría reconstruir el empaquetado y registro de widgets ya resueltos por la plantilla. El framework de la plantilla evita ese trabajo sin condicionar las reglas de búsqueda.

### 2. Datos personales del plugin, independientes de las notas

Modelo inicial de una entrada: identificador estable, nombre, arreglo `abbreviations`, texto simple y estado `enabled`. El catálogo lleva una versión de esquema para detectar incompatibilidades futuras. No hay enlaces a Rems ni campos de alias nativos. Una abreviatura repetida entre entradas es válida; dentro de una entrada se normaliza y elimina el duplicado.

Usar `plugin.storage.getSynced` / `setSynced` para el catálogo y ajustes nativos para prefijo e interruptor general. Esperar la sincronización inicial y completar una lectura válida antes de inicializar o guardar. Un catálogo existente nunca se sustituye por un valor vacío a causa de un error de carga. La UI conserva el borrador ante un fallo de escritura y solo anuncia el guardado cuando termina la llamada correspondiente.

La [guía de almacenamiento](https://plugins.remnote.com/advanced/storage) describe la sincronización personal entre dispositivos. Guardar las entradas como Rems compartiría los datos con la base de conocimiento y mezclaría las sustituciones con las notas. Usar almacenamiento local impediría la sincronización solicitada. La edición simultánea desde dos dispositivos no tendrá una garantía adicional de fusión más allá del almacenamiento del SDK; verificar y documentar su comportamiento antes de distribuir el plugin.

### 3. Ajustes sencillos y panel de gestión

Registrar prefijo e interruptor general con la [API de ajustes](https://plugins.remnote.com/advanced/settings). Abrir el panel mediante un comando «Mis sustituciones» registrado con el SDK y un widget en un panel de RemNote; los ajustes incluirán una descripción que indique cómo abrirlo. No depender de un botón dentro de Ajustes que el SDK consultado no ofrece.

El panel contiene listado, búsqueda del catálogo, formulario y estado activado/desactivado. Cada entrada muestra nombre, abreviaturas y frase. La gestión usa controles de formulario normales y no activa el selector de escritura. Eliminar requiere una acción explícita; los errores de carga y guardado permanecen visibles sin descartar el borrador.

El formulario permite escribir las abreviaturas una sola vez y añadir varias frases. El guardado valida todas y escribe el catálogo una sola vez. Desde una frase guardada se puede abrir un formulario con sus abreviaturas precargadas. Cada frase conserva su identificador y puede administrarse por separado.

Un campo JSON en Ajustes simplificaría el código, pero dificultaría mantener varias variantes y detectar errores al introducir abreviaturas.

### 4. Detección y filtro deterministas

La integración se suscribe a `EditorTextEdited`, `EditorSelectionChanged` y cambios de foco usando la [API de eventos](https://plugins.remnote.com/advanced/events). Examina el texto y el rango actuales, no toda la base de conocimiento. La invocación es el prefijo configurado más la secuencia sin espacios inmediatamente anterior al cursor; un espacio termina la consulta. Se permite en cualquier posición del texto, incluso con contenido posterior al cursor.

La selección debe estar colapsada y pertenecer a un contexto de texto editable. Se excluyen campos del propio plugin, selecciones de varios Rems, fórmulas y código. La forma exacta de reconocer esos contextos mediante los datos públicos del SDK debe demostrarse en la prueba inicial.

El motor normaliza solo las claves de búsqueda, conservando el texto guardado. Se filtra por prefijo de cualquiera de las abreviaturas, se deduplican resultados por identificador y se ordenan por nombre normalizado e identificador. No hay búsqueda semántica, ranking por uso ni generación de alternativas. No se necesita reemplazo automático al detectar una coincidencia: siempre se elige una opción.

El flujo normal presenta sugerencias al escribir en un Rem accesible con el alcance configurado. El comando de diagnóstico es opcional y limita el flujo a un único Rem. El comando de catálogo aparece como «Sustitutions» y usa palabras clave en español e inglés.

### 5. Selector flotante con captura limitada de teclas

Usar un widget flotante posicionado cerca de `plugin.editor.getCaretPosition()`. El SDK inspeccionado incluye `openFloatingWidget`, `setFloatingWidgetPosition`, `window.stealKeys(floatingWidgetId, keys)` y `window.releaseKeys`. La documentación de los tipos indica que las teclas se liberan automáticamente al cerrar la ventana. Preferir esa captura asociada a la ventana frente a una captura global indefinida.

Mostrar opciones con nombre y un área inferior con el texto completo seleccionado. La primera opción comienza seleccionada; las flechas se detienen en los extremos. Tab o Enter confirman y Escape cierra. La captura solo está activa con opciones aceptables. Sin coincidencias se cierra la lista y se conserva la invocación literal. No se captura Shift+Tab ni teclas con modificadores para la aceptación.

El cierre por Escape suprime la reapertura para la misma consulta hasta que el usuario la cambie o comience una nueva invocación. Un cambio de foco, edición incompatible, cierre externo o desactivación elimina el estado de la sesión y sus listeners. No se usan eventos sintéticos ni acceso directo al DOM interno de RemNote.

### 6. Sustitución de rango y conservación del contexto

Guardar en memoria una sesión con editor o Rem de origen, panel, rango de invocación, consulta y revisión local. Antes de insertar, volver a leer y comprobar que coinciden el foco, el rango, el texto y la disponibilidad de la entrada. Las respuestas asíncronas de revisiones anteriores se descartan. Durante la aceptación se impide una segunda inserción por repetición de tecla o por eventos derivados de la propia edición.

Usar los rangos y utilidades de rich text del SDK para conservar referencias, emojis y elementos formateados. En el editor probado, `insertPlainText` antepone texto a la selección. RemNote exige `ReadCreateModifyDelete` tanto para `deleteCharacters` como para `editor.setText`. El usuario eligió probar con el nivel de modificación existente.

La ruta de prueba usa `Rem.setText` sobre el ID del Rem activado. La API recibe el contenido enriquecido del Rem con solo la secuencia de invocación reemplazada. Se exige que el contenido guardado coincida con el del editor y se excluyen Rems con reverso, portales y bloques de código. La actualización visible, la integración con el historial de Deshacer y la latencia real quedan pendientes de verificación. Las operaciones de árbol quedan fuera de la sustitución.

Ejemplo confirmado: `Antes ;obj después`, con el cursor tras `;obj`, pasa a `Antes ¿Cuál es su objetivo? después`. El texto insertado es una copia: editar el catálogo posteriormente no cambia sustituciones ya aceptadas.

### 7. Prueba técnica como condición de avance

Comenzar en modo sandbox con `requestNative: false`, usando exclusivamente APIs públicas. La [documentación de permisos](https://plugins.remnote.com/advanced/permissions) recomienda este modo. Identificar los permisos mínimos necesarios para el editor activo mediante pruebas; no anticipar acceso de borrado a toda la base de conocimiento.

La primera prueba de implementación debe demostrar detección, posición de ventana, foco, captura y liberación de Tab/Enter/flechas/Escape, sustitución de selección y Deshacer en escritorio y navegador. También debe verificar los índices de texto enriquecido y la exclusión de código y fórmulas. Esta fase usa dos frases de prueba y aún no necesita el gestor completo.

Si las APIs no cumplen estos comportamientos en alguno de los entornos, documentar exactamente el límite y revisar el diseño con el usuario antes de sustituirlo por modo nativo, un modal separado u otra interacción. Un modal abierto por atajo es una alternativa posible, pero no satisface por sí solo la interacción de prefijo ya acordada.

## Risks / Trade-offs

- [Los tipos existen pero el editor instalado puede comportarse de otra forma] → Prueba funcional temprana y registro de versiones y evidencias en ambos entornos.
- [Conflicto con menús nativos o captura de teclas que persiste tras cerrar] → Captura asociada a la ventana y pruebas con referencias, menús nativos, clic externo y desactivación. Si no hay API para detectar un conflicto, comprobar la prioridad en la prueba inicial y tratar un fallo como condición de revisión.
- [Pérdida del foco mientras se espera una API] → Revisiones de sesión, comprobación previa y cancelación al cambiar de editor.
- [Índices de rich text distintos de índices de cadenas] → Utilidades públicas del SDK y pruebas con emojis, formato y referencias alrededor del rango.
- [Borrado e inserción producen dos acciones de Deshacer] → Resolver y demostrar la agrupación durante la primera prueba; no dar por válida una transacción de persistencia como solución.
- [Guardados concurrentes entre dispositivos] → Leer antes de guardar, preservar los datos ante errores y documentar los límites observados del SDK; no prometer una fusión automática propia.
- [Un prefijo elegido por el usuario coincide con sintaxis de RemNote] → Usar `;` inicialmente, permitir cambiarlo y comprobar los prefijos utilizados en la matriz de compatibilidad. No afirmar que un prefijo configurable arbitrario está libre de conflictos.

## Migration Plan

No hay datos previos que migrar. Instalar inicialmente como plugin de desarrollo y empezar con un catálogo vacío. Introducir manualmente dos variantes de `obj` durante la validación; no añadir ejemplos al catálogo del usuario sin una acción explícita.

La entrega futura incluye el paquete generado por la plantilla y las instrucciones de instalación de desarrollo. Desactivar o desinstalar el plugin devuelve la edición normal a RemNote; no ejecuta una limpieza de notas. Conservar el identificador del plugin y la versión de esquema para no perder el acceso al catálogo al actualizar. La publicación en el marketplace se planificará por separado si se solicita.

## Open Questions

- Nombre visible e identificador definitivo del plugin antes de preparar un paquete distribuible; no afecta al diseño ni a la división de tareas.
- Entornos concretos disponibles para la validación final: versiones de RemNote, sistema operativo y navegador. La matriz mínima propuesta es la aplicación de escritorio en macOS y un navegador de escritorio en el mismo equipo; no se declara soporte de otros sistemas sin probarlos.

Las comprobaciones del editor enumeradas en la prueba técnica son trabajo explícito de implementación, no comportamientos ya verificados ni preguntas de producto pendientes.

## Sources

- [Inicio rápido oficial](https://plugins.remnote.com/getting-started/quick_start_guide): estructura, ejecución de desarrollo e instalación del plugin de prueba.
- [Plantilla oficial](https://github.com/remnoteio/remnote-plugin-template-react): proyecto base de React y scripts de comprobación y empaquetado.
- [SDK publicado 0.0.46](https://registry.npmjs.org/@remnote/plugin-sdk/0.0.46): versión de referencia cuyos tipos se inspeccionaron.
- [API del editor](https://plugins.remnote.com/api/classes/EditorNamespace) y [ventanas](https://plugins.remnote.com/api/classes/WindowNamespace): edición y ventanas flotantes. Los tipos publicados también incluyen métodos de ventana ausentes de algunas páginas de documentación.
- [Alias nativos de RemNote](https://help.remnote.com/en/articles/6751477-aliases): nombres alternativos de Rems usados en referencias. El plugin no los usa para su catálogo.
