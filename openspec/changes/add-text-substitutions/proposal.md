# Proposal

## Why

Escribir preguntas recurrentes durante el estudio requiere repetir frases que el usuario ya conoce. Un plugin de sustitución de texto permitirá invocarlas mediante abreviaturas, previsualizar alternativas y elegir una usando el teclado.

## What Changes

- Crear un plugin de RemNote para escritorio y navegador que inserte exclusivamente texto simple en el editor activo.
- Ofrecer un prefijo configurable, inicialmente `;`: `;obj` y `;objetivo` podrán mostrar varias preguntas guardadas.
- Permitir varias abreviaturas por sustitución y que distintas sustituciones compartan abreviaturas. Estas son claves internas del plugin, independientes de los alias nativos de RemNote.
- Mostrar únicamente sustituciones activadas, con navegación mediante flechas, previsualización y aceptación mediante Tab o Enter. Escape cancelará.
- Incorporar ajustes generales y un panel «Mis sustituciones» para crear, editar, eliminar y activar/desactivar frases.
- Mantener un catálogo personal sincronizado entre dispositivos mediante el almacenamiento del plugin en RemNote.
- Empezar la implementación futura por una prueba de compatibilidad del editor, las ventanas flotantes, el foco y el teclado en ambos entornos.
- Excluir de esta versión la generación con IA, la creación de Rems o tarjetas, los alias nativos, los cambios de jerarquía, el texto con formato, las variables y los dispositivos móviles.

## Capabilities

### New Capabilities

- `substitution-catalog`: gestión, validación y persistencia sincronizada del catálogo personal y de sus abreviaturas.
- `editor-substitutions`: detección de la invocación, selección con previsualización y sustitución de texto en el editor sin modificar su jerarquía.

### Modified Capabilities

Ninguna: el proyecto no tiene capacidades ni código previos.

## Impact

Proyecto nuevo basado en la plantilla oficial de React y TypeScript de RemNote y en `@remnote/plugin-sdk`. Se utilizarán las APIs del editor, eventos, ajustes, almacenamiento y ventanas del SDK; no se necesita un servicio externo para buscar o guardar frases.

Los artefactos de este cambio describen el plan; todavía no existe una implementación del plugin. Los detalles propuestos y las preguntas pendientes se distinguen de las decisiones confirmadas en `design.md`.
