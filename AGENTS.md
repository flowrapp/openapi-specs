# Agent context for Flowrapp OpenAPI specs

## Qué es este repositorio

Este repositorio es la fuente de verdad de las especificaciones OpenAPI de **Flowrapp**. Aquí se definen los contratos HTTP que consumen el MIG, el BFF y la aplicación móvil.

Actualmente hay dos OpenAPIs principales:

- **MIG**: API donde vive la lógica de negocio de la aplicación.
- **BFF**: Backend for Frontend de la aplicación móvil. Actúa como capa de agregación: hace diferentes llamadas al MIG, compone la información y la entrega preparada al frontend para que la app no tenga que resolver lógica de composición compleja.

Flowrapp es una aplicación de fichajes orientada a empresas que necesitan controlar jornadas de forma sencilla. El producto debe servir a distintos dominios y tamaños de negocio, empezando especialmente por negocios de restauración pequeños y grandes, pero manteniendo los contratos lo bastante genéricos para adaptarse a otros verticales.

La prioridad de producto es una experiencia móvil muy intuitiva, con una interfaz simple y directa para fichar, consultar horas y gestionar equipos.

## Dominio de producto

### Roles principales

- **Manager**
  - Gestiona una o varias empresas/negocios.
  - Puede ver trabajadores de cada empresa.
  - Puede consultar métricas de fichajes y horas trabajadas por día, semana y mes.
  - Puede revisar historiales, editar fichajes si procede, gestionar invitaciones y exportar partes/hojas de horas.
  - Su vista principal es de supervisión: totales de empresa, totales por trabajador, métricas agregadas y detalle cuando sea necesario.

- **Worker**
  - Usa una pantalla móvil simple para hacer **clock-in** y **clock-out**.
  - Puede ver su sesión activa, sus fichajes del día y sus totales de semana/mes.
  - Puede consultar su histórico diario, semanal y mensual.
  - Debe ver solo sus propios datos dentro de las empresas a las que pertenece.
  - A futuro, sus vistas pueden incluir horarios/turnos cuando el contrato los modele explícitamente.

### Conceptos clave

- **Business**: empresa, local o negocio donde se fichan horas.
- **User**: persona autenticada en el sistema.
- **Role / membership**: relación del usuario con un negocio (`OWNER`, `MANAGER`, `EMPLOYEE`).
- **Worklog / Session**: intervalo de trabajo con hora de entrada y salida.
- **Clock-in / clock-out**: acciones para abrir y cerrar una sesión de trabajo.
- **Timesheet / reports / history**: vistas agregadas o exportables de horas trabajadas.
- **Invitation**: mecanismo para invitar usuarios a un negocio.
- **Push token**: token de dispositivo para notificaciones móviles.

## APIs del repositorio

Hay dos specs principales:

- `api/main-api/rest/open-api-rest.yml`
  - OpenAPI del **MIG**.
  - Es la API donde se concentra la lógica de negocio de Flowrapp.
  - Expone contratos de autenticación, usuarios, negocios, invitaciones, worklogs, reports, timesheets, push tokens y sistema.
  - Mantiene operaciones cercanas al dominio y a los recursos backend.
  - Es la fuente que el BFF consulta para obtener datos y ejecutar operaciones de negocio.

- `api/bff-api/rest/open-api-rest.yml`
  - OpenAPI del **BFF**.
  - Backend-for-Frontend para la aplicación móvil.
  - Hace llamadas al MIG, agrega y adapta datos para construir vistas móviles listas para consumir.
  - Está organizado por experiencia de usuario y rol: `Worker`, `Manager`, `User`, `Authentication`, `Push Tokens`, `System`.
  - Esta API debe favorecer respuestas listas para pintar en móvil, evitando que el cliente tenga que componer demasiada lógica.

## Estructura esperada

```text
api/
├── main-api/
│   └── rest/
│       ├── open-api-rest.yml
│       └── v1/
│           ├── components/
│           └── services/
└── bff-api/
    └── rest/
        ├── open-api-rest.yml
        └── v1/
            ├── components/
            └── services/
```

Reglas de estructura:

- Las specs raíz (`open-api-rest.yml`) contienen `info`, `servers`, `tags`, `paths` y `securitySchemes`.
- Los paths deben referenciar operaciones con `$ref` bajo `v1/services/...`.
- Los DTOs reutilizables deben vivir bajo `v1/components/...`.
- Mantener separación por dominio: `auth`, `user/users`, `business`, `worklogs`, `reports`, `timesheet`, `invitations`, `worker`, `manager`, etc.

## Criterios de diseño de contratos

- Diseñar pensando primero en el caso móvil y en simplicidad de uso.
- Mantener los nombres de endpoints, schemas y operationIds en inglés, como el resto del repositorio.
- Mantener descripciones claras y orientadas al producto.
- Preferir DTOs explícitos y estables antes que respuestas demasiado genéricas.
- En el BFF, separar claramente endpoints de worker y manager:
  - Worker: endpoints bajo `/api/v1/worker/...` y datos propios.
  - Manager: endpoints bajo `/api/v1/manager/...` y datos agregados de empresa.
- Usar fechas y periodos de forma consistente:
  - Día: `YYYY-MM-DD` con `format: date`.
  - Semana ISO: `YYYY-Www`.
  - Mes: `YYYY-MM`.
  - Instantes: `format: date-time`, preferiblemente con zona/offset.
- Los totales de tiempo deben expresarse en segundos (`totalSeconds`, `totalSecondsWeek`, `totalSecondsMonth`) salvo que exista una razón explícita para otra unidad.
- Proteger endpoints autenticados con `bearerAuth`.
- Documentar errores de negocio con `application/problem+json` y `ProblemDetail` cuando aplique.
- Cuando se usen códigos funcionales, mantener `x-functional-errors` sincronizado con los ejemplos y el script de validación.

## Calidad y validación

Antes de finalizar cambios relevantes en las OpenAPI, intenta validar o al menos dejar indicado si no se pudo validar.

Comandos útiles:

```bash
# Validar/lint principal con Redocly si está disponible
redocly lint api/main-api/rest/open-api-rest.yml
redocly lint api/bff-api/rest/open-api-rest.yml

# Lint alternativo si está disponible
vacuum lint api/main-api/rest/open-api-rest.yml
vacuum lint api/bff-api/rest/open-api-rest.yml

# Validar coherencia de códigos funcionales si se modifican errores
node scripts/validate-error-codes.js
```

La documentación interactiva se publica con Scalar en GitHub Pages. Los workflows de CI validan, lintan y generan diffs de cambios/breaking changes para PRs.

## Guía para futuros agentes

- Lee `README.md`, `CONTRIBUTING.md` y `docs/github-workflows.md` si necesitas contexto del repositorio.
- Antes de tocar una spec, revisa tanto el `open-api-rest.yml` raíz como los ficheros `services` y `components` relacionados.
- No mezcles cambios de MIG (`main-api`) y BFF salvo que el contrato lo requiera.
- Si añades un endpoint nuevo:
  1. Añade el path en el `open-api-rest.yml` correspondiente.
  2. Crea o modifica la operación en `v1/services/...`.
  3. Crea o reutiliza schemas en `v1/components/...`.
  4. Añade ejemplos realistas.
  5. Declara seguridad y errores.
  6. Valida referencias y lint.
- Respeta cambios no relacionados ya presentes en el working tree.
- En conversaciones con Sergio, puedes responder en español; en los contratos OpenAPI, mantén el estilo actual en inglés.
