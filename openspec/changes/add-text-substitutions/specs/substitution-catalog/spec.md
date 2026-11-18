# Spec Delta

## Purpose

Permitir que el usuario mantenga un catálogo personal de frases reutilizables, con abreviaturas propias y disponibilidad sincronizada entre sus dispositivos.

## ADDED Requirements

### Requirement: Gestionar sustituciones mediante un formulario
El plugin SHALL ofrecer un panel «Mis sustituciones» para crear, editar y eliminar entradas con nombre, texto simple, una o más abreviaturas y estado activado o desactivado. Los formularios SHALL mostrar los errores de validación sin perder el borrador.

#### Scenario: Crear y editar una frase
- **WHEN** el usuario guarda una entrada llamada «Objetivo breve», con texto «¿Cuál es su objetivo?» y abreviaturas `obj` y `objetivo`
- **THEN** la entrada aparece en el catálogo y puede editarse desde el mismo panel

#### Scenario: Guardar variantes desde un solo formulario
- **WHEN** el usuario escribe `obj` una vez, añade las frases «¿Cuál es el objetivo?» y «¿Cuáles son sus objetivos?» y pulsa «Guardar variantes»
- **THEN** ambas frases se guardan juntas con la misma abreviatura y aparecen como opciones separadas al escribir `;obj`

#### Scenario: Añadir una variante a una frase guardada
- **WHEN** el usuario pulsa «Agregar variante» junto a una frase existente y guarda otra frase
- **THEN** la nueva frase usa las abreviaturas precargadas y la frase de origen se conserva

#### Scenario: Impedir una entrada vacía
- **WHEN** el usuario intenta guardar una entrada sin texto o sin abreviaturas válidas
- **THEN** el formulario explica el error y conserva lo escrito sin modificar el catálogo guardado

#### Scenario: Eliminar una entrada
- **WHEN** el usuario elimina una sustitución desde el panel
- **THEN** la entrada deja de estar disponible en el catálogo y en las sugerencias posteriores

### Requirement: Usar abreviaturas internas independientes de los alias nativos
El plugin SHALL permitir varias abreviaturas por entrada y una misma abreviatura en varias entradas. Estas claves SHALL utilizarse exclusivamente para buscar sustituciones y SHALL NOT crear ni modificar alias nativos de RemNote.

#### Scenario: Compartir una abreviatura entre variantes
- **WHEN** dos entradas activadas contienen `obj` entre sus abreviaturas
- **THEN** ambas pueden aparecer al buscar `obj`, sin que una sobrescriba a la otra

#### Scenario: Diferenciar sustituciones de alias de RemNote
- **WHEN** el usuario guarda las abreviaturas `obj` y `objetivo`
- **THEN** no se crean propiedades de alias, referencias ni Rems asociados a esas abreviaturas

### Requirement: Controlar la disponibilidad de cada entrada
El plugin SHALL permitir activar y desactivar cada sustitución sin borrarla. Solo las entradas activadas SHALL estar disponibles en las sugerencias.

#### Scenario: Desactivar una variante
- **WHEN** el usuario desactiva «Objetivo breve» y vuelve a invocar `;obj`
- **THEN** esa variante no aparece, mientras las demás coincidencias activadas siguen disponibles

### Requirement: Persistir un catálogo personal sincronizado
El plugin SHALL conservar el catálogo tras recargar RemNote y sincronizarlo entre dispositivos de la misma cuenta mediante los mecanismos de RemNote. El catálogo SHALL ser personal y no un conjunto de Rems compartidos de una base de conocimiento. Un fallo de lectura SHALL NOT tratarse como un catálogo vacío que deba sobrescribirse.

#### Scenario: Abrir otro dispositivo
- **WHEN** una entrada se guarda y la sincronización de RemNote termina correctamente
- **THEN** la entrada está disponible en otro dispositivo de la misma cuenta con el plugin instalado

#### Scenario: Fallar al cargar los datos
- **WHEN** no puede leerse el catálogo guardado
- **THEN** el panel informa del error y no sobrescribe los datos existentes con valores iniciales

### Requirement: Configurar la activación general
El plugin SHALL ofrecer en sus ajustes un prefijo configurable, inicialmente `;`, y un interruptor general de sustituciones. El prefijo SHALL ser una secuencia no vacía sin espacios ni saltos de línea. Desactivar el plugin desde ese interruptor SHALL conservar las entradas guardadas.

#### Scenario: Cambiar el prefijo
- **WHEN** el usuario cambia el prefijo de `;` a `;;`
- **THEN** las siguientes invocaciones usan `;;obj` sin necesidad de cambiar las abreviaturas guardadas

#### Scenario: Desactivar las sugerencias
- **WHEN** el usuario apaga el interruptor general y escribe `;obj`
- **THEN** el plugin no muestra sugerencias ni captura las teclas de edición
