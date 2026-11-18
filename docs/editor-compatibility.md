# Compatibilidad del editor

SDK: 0.0.46. Node.js: 24. Fecha: 17 de noviembre de 2026.

Solo el usuario opera RemNote durante las pruebas. La compilación y las pruebas unitarias no demuestran el comportamiento del editor real.

Prototipo sandbox, inactivo inicialmente y restringido al Rem elegido por comando. La versión 0.1.1 declara solo lectura bajo un documento raíz llamado «Prueba de sustituciones». Dos frases temporales; ningún catálogo persistente. La inserción y los permisos que requiera siguen pendientes de verificar.

| Prueba | Escritorio | Navegador |
| --- | --- | --- |
| Instalación y comando | Pendiente | Pendiente |
| Selección colapsada y detección de ;obj | Pendiente | Pendiente |
| Ventana junto al cursor y foco | Pendiente | Pendiente |
| Flechas y previsualización | Pendiente | Pendiente |
| Escape y devolución de teclas | Pendiente | Pendiente |
| Tab y Enter sin crear ni indentar Rems | Pendiente | Pendiente |
| Sustitución y Deshacer una vez | Pendiente | Pendiente |
| Emojis, referencias y formato alrededor | Pendiente | Pendiente |
| Exclusión de código y fórmulas | Pendiente | Pendiente |
| Clic externo, cambio de panel y desactivación | Pendiente | Pendiente |

La primera prueba debe confirmar la selección colapsada, el formato de los eventos de teclado y la sustitución de una selección con una sola operación de historial. Si algo falla, revisar esta integración antes de continuar con el selector definitivo. No se marcan las tareas de OpenSpec completas hasta contar con las comprobaciones que piden.

## Comprobaciones locales

TypeScript, tres pruebas unitarias y compilación del prototipo: correctos. El manifiesto se comprueba íntegramente contra el esquema del SDK, sin excepciones. repoUrl contiene provisionalmente la dirección del servidor local; no representa un repositorio público. La validación de marketplace queda pendiente hasta disponer de repositorio público y materiales de distribución.

Por acuerdo explícito, el agente no instala ni prueba nada dentro de la cuenta. Las casillas de OpenSpec que requieren pruebas en RemNote permanecen pendientes.

## Resultado comunicado por el usuario

La primera instalación de escritorio fue rechazada con «repoUrl: Required (invalid_type)». Se añadió una URL local provisional y se eliminó la excepción de validación. La instalación corregida sigue pendiente de confirmación del usuario.

El usuario confirmó después que el plugin aparecía instalado. Una captura posterior mostró que el arranque fallaba con «events.addListener: no scope has permission level of at least Read» y el mismo requisito para askToActivate. Se corrigió el manifiesto a 0.1.1 con lectura limitada al documento de prueba; falta confirmar el nuevo arranque. Esto no demuestra todavía el funcionamiento de las sugerencias ni de la edición.

El usuario ejecutó el comando, pero recibió el mensaje de selección no disponible. En 0.1.2 la activación espera a que el usuario vuelva al editor y comprueba acceso al Rem bajo el alcance de prueba. Se agregó un comando de diagnóstico y una cola de eventos acotada (una ejecución activa y una pendiente), verificada con cien solicitudes concurrentes. El consumo real de memoria y el funcionamiento en el editor siguen sin medir/confirmar.

El usuario confirmó visualmente que el selector aparece en 0.1.2, pero flechas y aceptación no responden. En 0.1.3 se escucha StealKeyEvent dentro del widget flotante y se reenvían las teclas normalizadas al index mediante mensajes asociados al identificador de ventana. No se usa una segunda ruta de aceptación para evitar inserciones dobles. Flechas, aceptación, liberación de teclas y permisos de inserción siguen pendientes de la nueva prueba manual.

Para la prueba de aceptación de 0.1.3, se declara ReadCreateModify únicamente bajo el documento de prueba (RemNote agrupa creación y modificación). Sin permiso de borrado. Es un cambio de manifiesto que el usuario debe aplicar; la sustitución real y Deshacer siguen pendientes de evidencia.

## Teclado 0.1.4

El usuario confirmó que las teclas seguían sin responder en 0.1.3 y mostró el permiso del documento ya concedido. Se contrastó el flujo con el [ejemplo oficial de autocomplete](https://github.com/remnoteio/remnote-official-plugins/blob/main/autocomplete/src/widgets/autocomplete_popup.tsx): StealKeyEvent utiliza floatingWidgetId como listenerKey. La suscripción anterior con undefined era incorrecta.

Ahora la ventana se suscribe por identificador antes de capturar teclas y libera la captura al desmontarse, incluso si la solicitud termina después del cierre. Dos pruebas verifican el enrutado por ventana y esa carrera. El selector muestra «0.1.4 · Teclado conectado» y la última tecla recibida para distinguir fallos de captura y de entrega. No se amplían permisos ni se opera RemNote desde el agente. Pendiente la prueba del usuario de flecha abajo y Tab en el editor real.

## Mensajería 0.1.5

La captura del usuario confirma que 0.1.4 recibe la flecha down en la ventana, pero no cambia la selección. Se encontró que el controlador leía el mensaje directamente del evento, mientras el [ejemplo oficial de tabs](https://github.com/remnoteio/remnote-official-plugins/blob/main/tabs/src/widgets/tabs.tsx) consume data.message. Se corrigió el desempaquetado y se mantiene la validación del identificador de ventana.

Una prueba usa MessagingNamespace del SDK corregido y un host simulado que entrega el envelope documentado: captura de down, entrega al controlador, cambio al índice 1 y aceptación de esa opción; otra prueba rechaza mensajes de ventanas ajenas o cerradas. Esto no prueba la inserción en RemNote. El selector muestra ahora 0.1.5 y el índice de opción, además de la tecla recibida. Pendiente confirmar flecha abajo y Tab con el usuario.

## Catálogo configurable 0.2.0

El usuario confirmó que el panel se abre y guarda una frase en la versión 0.2.1. También informó que quedaba un `;` al insertar. La captura muestra una abreviatura introducida como `;obj`. La versión 0.2.2 acepta ese formato y abarca los prefijos consecutivos en el rango de sustitución. Las pruebas con el controlador y un editor simulado cubren dos variantes guardadas con el mismo atajo y conservan el texto alrededor. Queda pendiente comprobar el resultado en RemNote.

Tras corregir el desempaquetado de mensajes en 0.1.5, el usuario confirmó «listo, ya funciona». Se registra como confirmación de la navegación que se le pidió probar; no demuestra por sí sola Enter, Deshacer, navegador u otros escenarios aún pendientes.

Se implementó el comando «Mis sustituciones» con formulario, listado, búsqueda, edición, borrado de entradas del catálogo y activación individual. El catálogo inicial está vacío; no se guardan automáticamente los ejemplos. El controlador usa las entradas guardadas y vuelve a leerlas antes de aceptar. Prefijo e interruptor general usan ajustes nativos. Los permisos de notas siguen restringidos al documento de prueba.

Pruebas locales: validación y búsqueda, fallos de lectura/escritura sin sobrescritura, escritura serializada y rechazo de ediciones obsoletas. Dos pruebas ejecutan el controlador real con SDK/editor simulados para verificar selección de frases propias y rechazo de una frase recién desactivada. Pendiente de confirmar en RemNote: apertura del formulario, guardado, edición, desactivación, eliminación, persistencia tras recarga y sincronización entre dispositivos. No se ha operado la cuenta del usuario desde las herramientas.

## Sustitución en el editor 0.2.4

En 0.2.3 el usuario observó que RemNote insertaba la frase al principio de la selección y dejaba la abreviatura escrita. Ahora el controlador valida la invocación y elimina sus caracteres hacia atrás con el cursor colapsado. Comprueba el Rem, el panel, la posición y el texto circundante después del borrado antes de insertar texto literal. Sigue la secuencia de edición del [autocompletado oficial](https://github.com/remnoteio/remnote-official-plugins/blob/main/autocomplete/src/widgets/autocomplete_popup.tsx#L253-L258).

Las pruebas simuladas verifican que se conserva el texto a ambos lados, incluidas otras apariciones de la misma abreviatura, y que se cancela la inserción si el editor conserva el atajo. Si la inserción falla y el contexto sigue siendo el esperado, el controlador restaura la abreviatura. Queda pendiente verificar la sustitución y el historial de Deshacer en RemNote.

## Permisos y latencia 0.2.5

RemNote mostró que `editor.deleteCharacters` exige `ReadCreateModifyDelete`. En 0.2.5 se usa `editor.setText` para escribir una vez el contenido enriquecido del editor activo, con solo el rango de la invocación sustituido en memoria. Antes de escribir se verifica el contenido original completo, el cursor y el Rem de prueba. El manifiesto conserva `ReadCreateModify` para los descendientes del documento de prueba. Queda por verificar en RemNote si la escritura está autorizada con ese nivel y cómo se integra con Deshacer.

La ruta de aceptación reutiliza la espera de sincronización inicial, prepara el reemplazo en paralelo con la lectura actual del catálogo y revisa los datos del editor en paralelo. Las sugerencias se muestran cuando se ha capturado el teclado. El comando «Sustituciones: ver estado de prueba» informa cuánto tarda una aceptación correcta desde que llega la tecla al controlador. Las pruebas simuladas verifican una sola aceptación por Tab y la conservación del original si se rechaza la escritura.

La prueba posterior en RemNote 0.2.5 mostró el mismo requisito de `ReadCreateModifyDelete` para `editor.setText`. Esto confirma que la pulsación llegó al intento de escritura y que el manifiesto actual es insuficiente tanto para `editor.deleteCharacters` como para `editor.setText`. Quedan pendientes la escritura efectiva, Deshacer y la latencia real. Para una prueba con ese nivel, la opción de alcance mínimo disponible en la interfaz es conceder acceso manual a los descendientes del ID de un documento nuevo que contenga solo un Rem desechable. El usuario decide si concede ese alcance en su cuenta.

## Escritura por ID 0.2.6

El usuario eligió mantener el permiso de modificación. La versión 0.2.6 usa la operación documentada `Rem.setText`, empleada por el [plugin oficial Diccionario](https://github.com/remnoteio/remnote-official-plugins/tree/main/dictionary) con nivel `ReadCreateModify`. Este proyecto conserva el alcance limitado a descendientes de «Prueba de sustituciones». El controlador escribe solo en el Rem activado, comprueba que el texto guardado y el editor coincidan antes de escribir, y verifica el resultado por ID. La prueba se limita a Rems de texto sin reverso, portales ni bloques de código. La actualización visible, la posición del cursor, Deshacer y la latencia se deben verificar en RemNote.

## Apertura del catálogo 0.2.7

«Mis sustituciones» abre después de liberar el teclado de prueba y en paralelo con la publicación de su estado. El panel puede mostrar un catálogo válido disponible mientras espera la sincronización, en modo de solo lectura. La lectura confirmada habilita los cambios. Si la sincronización ya está lista, solo se lee una vez.

Una prueba aislada en WebKit con cinco entradas, una sincronización simulada de 900 ms y una lectura de 20 ms mostró la primera lista a los 935 ms con la ruta anterior y a los 83 ms con la nueva. La edición estuvo disponible a los 933 ms. Queda por medir la apertura en RemNote.

## Activación automática 0.2.8

El usuario confirmó que el flujo automático funcionó en RemNote tras la prueba de escribir `;obj` y aceptar con Tab. Después confirmó que una sola acción de Deshacer restauró `Antes ;obj después`. Quedan pendientes la preservación de formato y referencias, la sincronización entre clientes y una instalación del ZIP fuera del servidor de desarrollo. Las tareas de OpenSpec que incluyen esos escenarios siguen abiertas.
