# Auditoría previa al primer commit

Fecha: 17 de noviembre de 2026. Alcance: código local del prototipo, manifiesto, dependencias npm, servidor de desarrollo y archivos candidatos a versionar. No se accedió a la cuenta de RemNote durante esta auditoría. No se creó repositorio, commit ni remoto.

## Resultado

Se corrigieron problemas del cargador y las herramientas de desarrollo. Queda un aviso de severidad alta en una dependencia del SDK oficial. Este informe no certifica que el plugin sea seguro para distribuir ni sustituye las pruebas de comportamiento pendientes en RemNote.

### Corregido: carga de scripts a partir del parámetro widgetName

El HTML de la plantilla construía la dirección de un script a partir de un parámetro sin limitarlo a los widgets existentes. Se sustituyó por una lista cerrada: `index`, `probe` y `probe_status`, con rutas relativas. Se comprobaron rechazos de URLs externas, rutas relativas fuera del directorio y valores desconocidos mediante pruebas automatizadas.

### Corregido: dependencias antiguas y servidor de desarrollo

`npm audit` detectó inicialmente 16 entradas: 5 altas y 11 moderadas. Se actualizaron webpack-dev-server a 6.1.0, webpack-cli a 7.3.1, copy-webpack-plugin a 14.0.0 y esbuild-loader a 4.5.0; se regeneró el lockfile. Se retiraron dependencias innecesarias de HMR, glob y empaquetado. El empaquetado local usa `zip` del sistema mediante argumentos fijos, sin interpolación de comandos.

El servidor escucha solo en 127.0.0.1, restringe Host a loopback, sirve archivos estáticos únicamente desde `public/`, usa publicPath terminado en `/` y tiene HMR y su cliente desactivados. Se sustituyó CORS `*` por orígenes explícitos de RemNote y loopback. También se admite el origen serializado `null` de iframes sandbox: este valor no identifica exclusivamente a RemNote, por lo que la protección no depende únicamente de CORS. No almacenar secretos en `public/` ni en el código entregado al navegador.

HTTP comprobado: manifiesto accesible para `app://js` y `https://www.remnote.com`; sin cabecera CORS de autorización para un sitio arbitrario; `package.json` y `.env` en la raíz devuelven 404. CORS limita la lectura en el navegador, no la posibilidad de enviar una petición. Los cambios del servidor no prueban por sí solos que el plugin siga funcionando dentro de RemNote: el usuario debe recargarlo y verificarlo.

### Zod: corrección local de colecciones acotadas; aviso npm pendiente

La auditoría final devuelve dos entradas altas, `zod` y `@remnote/plugin-sdk`, por el mismo aviso [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), relativo a agotamiento de memoria al validar colecciones de gran tamaño. No son dos vulnerabilidades independientes.

El SDK 0.0.46, última versión consultada en npm, declara Zod 3 y distribuye código precompilado. La versión reparada indicada por el aviso pertenece a Zod 4. Forzar esa versión mayor, sustituir solo la dependencia instalada o degradar el SDK a 0.0.7 —como sugiere automáticamente npm— no demuestra reparación del código distribuido ni compatibilidad. No se aplicaron esas opciones ni se ocultó el aviso. El seguimiento de 0.1.3 descrito abajo incorpora el rechazo temprano oficial de Zod 3 durante el empaquetado.

El prototipo no expone una API de importación de catálogos ni valida colecciones externas con Zod en su propio código; el validador local procesa un manifiesto fijo. No se ha demostrado la alcanzabilidad del problema a través de los componentes internos del SDK. La corrección local se limita a rechazos tempranos en colecciones con límites; no convierte en acotados todos los esquemas del SDK. No presentar el estado actual como «cero vulnerabilidades».

## Cuenta y datos de RemNote

El manifiesto conserva `requestNative: false`. La captura proporcionada por el usuario demostró que `requiredScopes: []` impide registrar eventos y activar el plugin. La versión 0.1.1 declara únicamente `DescendantsOfName`, nombre «Prueba de sustituciones», nivel `Read`. Este alcance permite leer bajo un documento raíz de ese nombre; no concede permisos de creación, modificación ni borrado de Rems ni lectura global de la base. El usuario actualiza y concede el permiso en RemNote; el agente solo cambia los archivos locales.

No hay llamadas propias de red, analítica, credenciales, creación o eliminación de Rems, ni reescritura de notas completas. El código contiene `editor.insertPlainText`, después de seleccionar la invocación y comprobar Rem, panel y contenido, pero su ejecución con los permisos actuales no está verificada ni se considera autorizada por el nivel Read. La siguiente prueba manual es solo de arranque y sugerencias. Si RemNote exige permisos de edición para insertar, habrá que revisar ese nivel antes de probar la inserción. La sesión de prueba necesita activación explícita y está restringida al Rem elegido. Usa almacenamiento de sesión para el estado, no almacenamiento persistente del catálogo.

Las garantías del SDK sobre foco, índices y Deshacer aún necesitan pruebas del usuario. Las comprobaciones asíncronas del código no equivalen a una transacción atómica del editor. Durante esta fase, usar exclusivamente un documento vacío de prueba. El agente no opera la cuenta; el usuario realiza la instalación y las pruebas.

## Preparación de Git

Se amplió `.gitignore` para excluir dependencias, compilados, ZIP, archivos de entorno, credenciales habituales, claves privadas, logs, HAR, exportaciones, backups, datos temporales y skills generadas. Se conservan código, pruebas, documentación, LICENSE, AGENTS.md, planificación OpenSpec y `package-lock.json`.

Se comprobó el comportamiento de las reglas con Git en un repositorio temporal fuera del proyecto, sin crear ni preparar un commit aquí. La enumeración de candidatos excluyó los generados y archivos sensibles conocidos e incluyó el lockfile. La búsqueda de patrones de credenciales no encontró coincidencias; esto no descarta secretos con formatos no reconocidos ni protege archivos añadidos posteriormente. `.gitignore` tampoco retira archivos ya versionados: revisar siempre el contenido preparado antes de cada commit.

Git local permite guardar versiones; un remoto no es necesario para programar. Para colaborar o respaldarlo, puede crearse un repositorio privado vacío y conectar su URL más adelante. `repoUrl` del manifiesto sigue siendo provisional y debe cambiarse por el repositorio real antes de distribuir el plugin.

## Validación realizada

- Seis pruebas automatizadas correctas: tres funcionales y tres de seguridad.
- TypeScript y validación completa del manifiesto: correctos.
- Compilación y ZIP: correctos; avisos de tamaño de los paquetes del SDK pendientes de optimización.
- Árbol instalado de npm sin errores de dependencias y validación estricta de OpenSpec correcta.
- Comprobaciones HTTP del servidor local realizadas; ninguna prueba dentro de RemNote se considera ejecutada por el agente.

Referencia adicional: [aviso del servidor de desarrollo corregido](https://github.com/webpack/webpack-dev-server/security/advisories/GHSA-f5vj-f2hx-8m93).

## Seguimiento del consumo de recursos

No hay mediciones de RAM en RemNote ni evidencia aportada de un consumo anómalo. El aviso de Zod no es una medición del prototipo. La versión 0.1.2 agrupa los eventos del editor en una ejecución activa y una pendiente; no acumula una promesa por pulsación. Se evita escribir repetidamente un mismo estado. La comprobación trabaja con el Rem de prueba, no recorre la base completa. Esto limita trabajo redundante; no elimina el aviso del SDK ni demuestra un límite absoluto de memoria. La prueba automatizada de concurrencia pasa y la medición real queda pendiente cuando se valide la interacción básica.

## Corrección reproducible en 0.1.3

Se incorporan los rechazos tempranos de arrays y sets del parche oficial Zod v3 [c987c29](https://github.com/colinhacks/zod/commit/c987c29). `scripts/sdk-security.cjs` verifica hashes SHA-256 de los bundles originales exactos de SDK 0.0.46 y aplica dos reemplazos controlados, preservando sus errores de tamaño y abortando antes del recorrido. Si cambia el SDK, se interrumpe la compilación para revisar el parche. No se reescribe node_modules ni se cambia a Zod 4.

Webpack aplica el parche al empaquetar los widgets y el validador de desarrollo carga la misma copia corregida. Las pruebas ejecutan ambos bundles corregidos: modo síncrono y asíncrono, max y length, entradas normales e inválidas, integridad y rechazo temprano del parser de sets. El control negativo reproduce la acumulación de errores en el SDK original. Una entrada de 10 000 elementos por encima del máximo genera un único error sin ejecutar validadores de elementos ni refinamientos. Esto comprueba trabajo evitado, no un límite universal de RAM.

Los esquemas sin máximo siguen requiriendo límites previos. El validador local limita el manifiesto a 16 KiB, 8 scopes y 2 temas antes de llamar al SDK. La corrección de merge de intersecciones del mismo commit no se incluye: no forma parte del rechazo de colecciones grandes que se ha comprobado aquí. La CLI original de marketplace y cualquier consumidor directo de node_modules siguen usando sus copias originales; el script propio de build sí pasa por el parche. npm audit seguirá mostrando dos entradas porque las versiones publicadas permanecen iguales. No se han suprimido ni se afirma reparación global de toda la dependencia.

### Permiso para probar la inserción en 0.1.3

El alcance DescendantsOfName sobre «Prueba de sustituciones» cambia de Read a ReadCreateModify, el mínimo nivel documentado que incluye modificación. RemNote agrupa en este nivel la creación; el plugin no llama a operaciones de creación y sigue sin permiso de borrado ni lectura global de notas. El usuario revisa y concede este cambio al actualizar la instalación; el agente no lo concede en su cuenta. La validación local fija exactamente este único alcance y mantiene requestNative:false.

## Catálogo personal 0.2.0

La persistencia del catálogo requiere una acción explícita del usuario en el formulario; no se inicializa sobrescribiendo datos. Se valida la estructura y versión, con límites previos al recorrido de colecciones y a la normalización de cadenas. Los errores conservan el borrador. Los cambios leen el catálogo reciente antes de escribir y rechazan una edición si su entrada cambió; las escrituras de un mismo panel se serializan. La sincronización la proporciona RemNote, sin servidor externo. Se conserva el límite de acceso a notas de prueba. La nueva pantalla se incluye explícitamente en la lista cerrada de widgets. El renderizado usa texto escapado por React; no se interpreta HTML ni Markdown de las frases. Las pruebas locales del almacenamiento no certifican sincronización real entre dispositivos.

## Auditoría de la versión 0.2.8

- El manifiesto declara sandbox y un solo alcance `ReadCreateModify` limitado a los descendientes de «Prueba de sustituciones». El modo automático busca coincidencias después de una edición con prefijo. Verifica que el Rem sea accesible antes de abrir el selector. Tab o Enter vuelve a leer el Rem y el catálogo, verifica el cursor y el contenido, y guarda el texto enriquecido reconstruido por ID. El diagnóstico se activa por separado y queda limitado a un Rem. Estas comprobaciones no constituyen una escritura atómica frente a cambios externos.
- La ventana solo recibe hasta nueve filas y una previsualización. El catálogo permanece en el almacenamiento sincronizado personal de RemNote. El código del plugin carece de peticiones propias a servidores externos.
- `npm audit` informa 15 entradas altas asociadas a dos avisos. En producción quedan dos entradas que remiten a [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) en Zod y el SDK. El registro oficial sigue ofreciendo `@remnote/plugin-sdk` 0.0.46 como última versión. El ZIP usa el parche acotado descrito arriba. El resto de las entradas sigue la dependencia de desarrollo Picomatch y su aviso [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), sin versión corregida en el aviso al revisar. Los patrones de archivos del proyecto son fijos. Picomatch queda fuera de los módulos compilados del widget.
- La revisión de 52 archivos candidatos respetó `.gitignore`. La búsqueda por patrones habituales de credenciales devolvió cero coincidencias y la lista excluyó dependencias, compilados y ZIP. El paquete contiene solo los widgets sandbox, el manifiesto y el README.
- El usuario confirmó el flujo automático con Tab y la restauración del atajo con una sola acción de Deshacer. Para el envío quedan la comprobación del texto enriquecido y de los límites de edición, el repositorio público con su URL real y la instalación de un paquete de lanzamiento. El aviso de producción debe constar en la revisión. El ZIP actual conserva el manifiesto de desarrollo con URL local.
