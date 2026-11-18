# Spec Delta

## Purpose

Permitir invocar y elegir frases guardadas durante la escritura en RemNote, reemplazando únicamente la secuencia de invocación y conservando el contenido y la jerarquía existentes.

## ADDED Requirements

### Requirement: Invocar sustituciones dentro del texto
Con las sustituciones activadas, el plugin SHALL detectar el prefijo configurado y la consulta contigua anterior al cursor en cualquier posición del texto editable de un Rem. La detección SHALL funcionar en escritorio y navegador.

#### Scenario: Invocar en medio de una frase
- **WHEN** el usuario escribe «Estoy estudiando: ;obj» con el prefijo `;` y existen coincidencias activadas
- **THEN** aparece la lista de sustituciones correspondientes sin alterar el texto escrito

#### Scenario: Usar otro prefijo
- **WHEN** el prefijo configurado es `;;` y el usuario escribe `;;obj`
- **THEN** se interpreta `obj` como la consulta y los dos puntos y coma como el prefijo

### Requirement: Buscar solo entre las sustituciones guardadas
El plugin SHALL filtrar entradas activadas por el comienzo de sus abreviaturas, sin distinguir mayúsculas ni tildes. Una entrada SHALL aparecer una sola vez aunque coincidan varias de sus abreviaturas. Una consulta vacía SHALL mostrar las entradas activadas. El orden SHALL ser estable por nombre y, en empates, por identificador.

#### Scenario: Encontrar varias preguntas
- **WHEN** dos entradas activadas comparten `obj` y el usuario escribe `;OBJ`
- **THEN** ambas aparecen, cada una una sola vez, con su texto guardado y sin contenido generado

#### Scenario: Abrir el catálogo sin filtrar
- **WHEN** el usuario escribe únicamente el prefijo en un contexto de edición válido
- **THEN** el selector ofrece las entradas activadas en orden estable

#### Scenario: No encontrar coincidencias
- **WHEN** ninguna abreviatura activada coincide con la consulta
- **THEN** no hay una opción aceptable y Tab, Enter y las flechas conservan su comportamiento normal

### Requirement: Previsualizar y navegar con el teclado
El selector SHALL mostrar el nombre de cada opción y una previsualización completa del texto seleccionado. La primera coincidencia SHALL estar seleccionada inicialmente. Las flechas arriba y abajo SHALL cambiar la selección y actualizar la previsualización sin modificar el Rem.

#### Scenario: Revisar variantes antes de elegir
- **WHEN** el usuario abre `;obj` y pulsa la flecha abajo
- **THEN** la siguiente variante queda seleccionada y su previsualización se muestra sin insertar texto

### Requirement: Aceptar con Tab o Enter
Con una opción seleccionada y una invocación vigente, Tab y Enter SHALL ejecutar la misma sustitución una sola vez. En ese caso SHALL NOT ejecutarse la acción de indentación o creación de línea asociada a la tecla. Fuera del selector activo, ambas teclas SHALL conservar sus funciones normales.

#### Scenario: Aceptar con cualquiera de las dos teclas
- **WHEN** el usuario pulsa Tab o Enter con «¿Cuál es su objetivo?» seleccionado
- **THEN** se acepta exactamente esa frase, el selector se cierra y no se crea ni indenta un Rem

### Requirement: Sustituir exclusivamente la secuencia de invocación
Al aceptar, el plugin SHALL reemplazar solo el prefijo y la consulta por texto simple literal y dejar el cursor al final de lo insertado. SHALL conservar el contenido y formato circundantes y SHALL NOT crear Rems, tarjetas, referencias, alias nativos ni cambios de jerarquía.

#### Scenario: Conservar el texto anterior y posterior
- **WHEN** el texto es «Antes ;obj después», el cursor está inmediatamente después de `;obj` y se acepta «¿Cuál es su objetivo?»
- **THEN** queda «Antes ¿Cuál es su objetivo? después», en el mismo Rem y con el cursor tras el signo de interrogación

#### Scenario: Conservar la estructura existente
- **WHEN** la sustitución se acepta en un Rem con padre e hijos existentes
- **THEN** se conservan los mismos Rems y relaciones, y solo cambia el rango de invocación

#### Scenario: Deshacer la sustitución
- **WHEN** el usuario ejecuta Deshacer inmediatamente después de aceptar una sustitución
- **THEN** una sola acción restaura el texto anterior a la sustitución, incluida la invocación, sin modificar otros Rems

### Requirement: Cancelar y liberar el teclado
Escape SHALL cerrar el selector conservando la invocación escrita. Cambiar de Rem o panel, mover el cursor fuera de la invocación, cerrar el selector o desactivar el plugin SHALL cancelar la sesión y devolver las teclas a RemNote. Una sesión cancelada SHALL NOT reabrirse por su propio evento de cierre.

#### Scenario: Cancelar sin borrar lo escrito
- **WHEN** el usuario pulsa Escape con `;obj` visible
- **THEN** el selector desaparece, `;obj` permanece y se puede continuar escribiendo normalmente

#### Scenario: Cambiar de lugar mientras se cargan sugerencias
- **WHEN** el usuario cambia de Rem o mueve el cursor antes de recibir un resultado pendiente
- **THEN** el resultado anterior no abre un selector ni inserta contenido en la nueva ubicación

### Requirement: Evitar sustituciones sobre un contexto obsoleto
Antes de insertar, el plugin SHALL comprobar que siguen vigentes el editor, el rango de invocación, la consulta y la entrada activada. Si cambian durante una operación pendiente, SHALL cancelar la aceptación sin modificar el contenido. Los campos de gestión y los contextos de código o fórmulas SHALL quedar fuera de la activación.

#### Scenario: Desactivar una entrada con el selector abierto
- **WHEN** la entrada seleccionada se desactiva antes de confirmar la inserción
- **THEN** no se inserta esa entrada y la lista se actualiza o se cierra

#### Scenario: Escribir una abreviatura en el formulario
- **WHEN** el usuario introduce `;obj` en un campo del panel de gestión
- **THEN** no se activa el selector del editor ni se sustituye el contenido del formulario
