# Sustituciones de texto

Plugin de desarrollo con catálogo personal de sustituciones y selector por abreviatura. Abre el catálogo con `/sustitutions` y guarda al menos una frase activa. Las sugerencias aparecen al escribir el prefijo y una abreviatura en un Rem de texto autorizado. De forma predeterminada, el manifiesto autoriza los descendientes de «Prueba de sustituciones».

## Desarrollo

Node.js 24. Instalar con `npm ci`. Comprobar con `npm test` y `npm run check-types`. Iniciar con `npm run dev`. Dirección local: `http://127.0.0.1:8080`.

## Primera prueba manual

1. Ajustes → Plugins → Build → Develop from localhost; introducir la dirección local. El servidor debe seguir ejecutándose.
2. Crear un documento raíz vacío llamado exactamente «Prueba de sustituciones» y dentro un Rem con «Antes ». Situar el cursor al final de ese Rem hijo.
3. Crear primero una frase con el comando `/sustitutions` y volver al Rem hijo de prueba.
4. Escribir `;obj`, elegir una frase con las flechas y pulsar Tab. Debe sustituirse el atajo en el mismo Rem.

Las sugerencias están habilitadas en Ajustes de forma predeterminada. La escritura requiere aceptar una frase con Tab o Enter. El código verifica el editor y el texto guardado, prepara el reemplazo del tramo de invocación en memoria y lo guarda por ID en el Rem seleccionado. El diagnóstico «Sustituciones: iniciar prueba en este Rem» es opcional y restringe las sugerencias a ese Rem hasta que se detiene. Usa «Sustituciones: ver estado» para consultar el último resultado.

Solo el usuario opera RemNote. No distribuir este prototipo como versión final.

El cargador de RemNote exige `repoUrl` incluso en desarrollo. Durante estas pruebas apunta provisionalmente al servidor local; aún no existe un repositorio público. Antes de distribuir el plugin se sustituirá por la URL real del repositorio.

Después de cambios locales, recarga el plugin o RemNote: el servidor de desarrollo no usa recarga automática ni HMR. El empaquetado requiere `zip` del sistema (incluido en macOS). La auditoría y el aviso pendiente del SDK están documentados en [SECURITY.md](SECURITY.md).

La versión 0.1.1 añade el permiso de lectura `DescendantsOfName` restringido a «Prueba de sustituciones»: RemNote rechazó el registro de eventos sin ningún permiso. Actualizar el manifiesto de la instalación desde Build es necesario para aplicar este cambio; recargar solo el código puede conservar los permisos anteriores.

Desde 0.1.2, el comando «Sustituciones: ver estado de prueba» muestra directamente el diagnóstico, sin buscar una pestaña lateral. Los eventos de escritura se agrupan en una comprobación activa y una pendiente; todavía no hay medición de RAM dentro de RemNote.

La versión 0.1.3 incluye un backport reproducible del rechazo temprano de arrays y sets de Zod 3 sobre el SDK empaquetado. No borres los scripts de seguridad: el build verifica la integridad del SDK y aplica la corrección; npm audit mantiene los avisos de la versión original. Detalles y límites en SECURITY.md.

En 0.1.4 se corrigió la suscripción de teclado por identificador de ventana siguiendo el ejemplo oficial. La línea inferior del selector muestra la versión y el estado del teclado. No hace falta conceder acceso a toda la base ni añadir otros ámbitos.

## Configurar tus propias sustituciones

1. Desde el buscador de comandos, escribir `/sustitutions` para abrir **Mis sustituciones**.
2. Pulsar **Nueva sustitución** y completar **Nombre** (por ejemplo «Objetivo personal»), **Abreviaturas** (`obj, objetivo`) y **Texto que se insertará** (`¿Cuál es el objetivo de este tema?`). Separa las abreviaturas con comas. Con el prefijo `;`, puedes guardar `obj` o `;obj`.
3. Para ofrecer varias frases con `;obj`, pulsar **Agregar variante** y escribir cada frase en su campo. Las frases comparten las abreviaturas del formulario. Mantener activada la casilla que muestra las sugerencias y pulsar **Guardar variantes**. Para una sola frase, pulsar **Guardar sustitución**.
4. Abrir el grupo de una abreviatura y pulsar **Agregar variante** para añadir una frase con ese atajo. El buscador del catálogo encuentra abreviaturas, nombres o frases, y cada grupo permite editar, desactivar o eliminar sus frases. Al elegir una opción en el editor, se reemplaza toda la invocación, incluidos los prefijos consecutivos si escribiste `;;obj`.
5. En **Ajustes → Plugin Settings → Sustituciones de texto**, cambiar el prefijo (inicialmente `;`) o apagar las sugerencias.

El catálogo usa el almacenamiento personal sincronizado del SDK. Si RemNote ya tiene frases disponibles, el panel las muestra mientras verifica la sincronización y habilita la edición al recibir una lectura válida. Hay comprobaciones automatizadas de persistencia con almacenamiento simulado. La recarga real y la sincronización entre dispositivos siguen pendientes de la prueba del usuario. Si una entrada cambia desde otro panel mientras se edita, se pide recargar antes de sobrescribirla.

En esta versión se aceptan hasta 1000 frases de una línea y 4000 caracteres por frase, 20 abreviaturas de hasta 64 caracteres por entrada y un prefijo de hasta 16 caracteres sin espacios. La vista del selector muestra hasta nueve filas alrededor de la seleccionada para evitar renderizar todo el catálogo.

## Preparar el envío a RemNote

1. Completar las comprobaciones en RemNote recogidas en [Compatibilidad del editor](docs/editor-compatibility.md). Documentar el alcance de edición que se distribuirá y probarlo con el paquete.
2. Revisar los archivos del primer commit con `.gitignore`, publicar el código en un repositorio público de GitHub y poner su URL real en `repoUrl`.
3. Revisar los avisos residuales y el parche del SDK en [SECURITY.md](SECURITY.md). Ejecutar `npm test`, `npm run check-types`, `npm run validate:marketplace` y `npm run build`. Comprobar el manifiesto dentro de `PluginZip.zip`.
4. Enviar el ZIP desde **Ajustes → Plugins → Build → Upload plugin**. La primera beta puede mantener `unlisted: true` y requiere aprobación de RemNote. [Guía de publicación](https://plugins.remnote.com/advanced/submitting_plugins) · [Plugins no listados](https://plugins.remnote.com/advanced/unlisted_plugins)
