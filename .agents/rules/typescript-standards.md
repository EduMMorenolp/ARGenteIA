---
activation: glob
glob: "src/**/*.ts"
---

# TypeScript Standards — ARGenteIA Project

## Tipado
- Exportar interfaces y tipos desde un archivo `types.ts` cuando son compartidos entre módulos.
- Preferir `interface` para objetos que pueden extenderse; `type` para uniones, intersecciones y aliases simples.
- **Nunca** usar `any`; si es inevitable, usar `unknown` y hacer type narrowing.
- Tipar explícitamente el retorno de funciones asíncronas: `Promise<T>`.

## Módulos
- Imports de Node.js primero, luego librerías externas, luego imports internos (separados por línea en blanco).
- Usar rutas relativas para imports internos.
- Extensión `.js` en imports (requerido por ESM con tsx).

## Async y Errores
```typescript
// ✅ Correcto
async function fetchData(): Promise<Data> {
  try {
    const result = await someApi.call();
    return result;
  } catch (error) {
    console.error('[fetchData] Error:', error);
    throw error;
  }
}

// ❌ Evitar
const fetchData = async () => {
  const result = await someApi.call().catch(e => null); // No silenciar errores
  return result;
};
```

## Zod Schemas
- Definir schemas cerca de donde se usan.
- Exportar el tipo inferido: `export type MyType = z.infer<typeof MySchema>;`
- Usar `.describe()` en fields para documentación automática.

## Convenciones de Naming
- **Archivos**: camelCase para módulos, PascalCase para clases.
- **Variables/funciones**: camelCase.
- **Constantes**: UPPER_SNAKE_CASE para constantes de módulo.
- **Interfaces**: PascalCase, sin prefijo `I`.
- **Tipos Zod**: Sufijo `Schema` (ej. `UserSchema`).

## Comentarios
- Solo comentar el "por qué", no el "qué".
- Usar JSDoc en funciones públicas exportadas.
- TODO/FIXME incluir nombre o issue: `// TODO(juan): refactorizar esto`.
