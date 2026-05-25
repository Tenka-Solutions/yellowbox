# Plan categorias y marcas estilo YellowBox

## 1. Resumen ejecutivo

La barra visual de categorias de `RicardoRojasDev/maquinasYellowBox` esta implementada como una fila horizontal de botones tipo pill/chip, con contenedor sticky, scroll horizontal nativo, scrollbar oculta, hover con elevacion, estado activo amarillo y soporte responsive. La version mas util como referencia es `productos.html` + `css/tienda.css` + `js/tienda.js`; `tienda.html` contiene una version anterior/simplificada.

HubCafe debe adaptar ese lenguaje visual sin copiar la fuente de datos de YellowBox. La data publica actual viene desde Supabase a traves de `src/modules/catalog/repository.ts`; el admin crea/edita categorias y productos en Supabase; los productos ya tienen `brand`. Por eso la implementacion recomendada es una nueva barra frontend que construya items desde categorias publicas de Supabase y marcas derivadas de productos publicables, sin migraciones.

Resultado esperado: una navegacion visual unificada de categorias + marcas destacadas que conserve `q`, `orden`/`sort` y rutas existentes, y que filtre categorias por `categoria=<slug>` y marcas por `brand` existente en productos. La opcion de schema para destacar marcas queda como mejora futura, no como paso inicial.

## 2. Archivos exactos encontrados en maquinasYellowBox

- `productos.html`
  - Barra principal mas limpia: `<section class="catalog-filters">`, `.category-buttons-container`, `.category-buttons`, `.category-button`, `.mokador-btn`, `data-filter`.
  - Referencia directa: lineas aproximadas 89-120.
- `css/tienda.css`
  - Estilos principales de la barra moderna:
    - variables visuales y layout: lineas 1-31.
    - contenedor ancho/sticky/blur: lineas 48-68.
    - scroll horizontal y scrollbar oculta: lineas 70-91.
    - pill/chip base, icono, logo Mokador, hover y active: lineas 93-142.
    - responsive tablet/mobile: lineas 1201-1315.
- `js/tienda.js`
  - Estado y click de filtros: `CATEGORY_LABELS`, `catalogState.currentFilter`, listeners `.category-button`, active class y render: lineas 1-7, 46-53, 117-134.
  - Filtro por categoria hardcodeada: `getFilteredProducts()`, lineas 213-217.
  - Sincronizacion de altura sticky: `syncStickyOffsets()`, lineas 1148-1158.
  - Drag/swipe avanzado existe para filas de productos, no para la barra de categorias: lineas 562-631.
- `js/catalog-data.js`
  - Fuente hardcodeada de productos YellowBox: `window.YELLOWBOX_PRODUCTS`, categorias `mokador`, `leches`, `capuchinos`, `chai`, `chocolates`.
  - No debe copiarse como fuente de verdad en HubCafe.
- `tienda.html`
  - Version anterior/simplificada de la barra:
    - CSS inline de filtros: lineas 153-194.
    - HTML de botones: lineas 385-418.
    - JS inline de filtro por `data-category`: lineas 569-585.
- `css/style.css` y `css/styledesktop.css`
  - Tienen estilos legacy para `.category-button.active`, `.mokador-btn` y `.category-buttons-container`.
  - Usarlos solo como referencia secundaria; la referencia principal debe ser `css/tienda.css`.

## 3. Archivos actuales de HubCafe que habria que tocar

- `src/app/(store)/tienda/page.tsx`
  - Hoy carga categorias y productos desde Supabase, renderiza `CatalogFilters` y condicionalmente `CoffeeSupplyFilterBar`.
  - Es el punto principal para insertar/reemplazar la barra visual.
- `src/app/(store)/page.tsx`
  - Home usa `getFeaturedCatalogProducts(8)` para productos destacados reales.
  - Podria recibir la nueva barra si el negocio quiere accesos visuales desde Home.
- `src/app/(store)/categorias/[slug]/page.tsx`
  - Mantiene rutas SEO por categoria.
  - Puede reutilizar la barra en contexto de categoria sin romper `/categorias/:slug`.
- `src/components/catalog/CatalogFilters.tsx`
  - Filtros actuales: busqueda `q`, categoria `categoria`, orden `orden`.
  - Conviene conservarlo o degradarlo a controles secundarios, no borrarlo de inmediato.
- `src/components/catalog/CoffeeSupplyFilterBar.tsx`
  - Barra actual de filtros para cafe e insumos.
  - Puede ser reemplazada o absorbida por `CategoryBrandNav`.
- `src/modules/catalog/repository.ts`
  - Lectura Supabase, reglas publicas, filtros y productos destacados.
  - Posible punto para agregar filtro `brand`/`marca` sin schema.
- `src/modules/catalog/filters.ts`
  - Ya contiene marcas destacadas `Mokador`, `Schoppe`, `Laqtia` y alias.
  - Puede alimentar la nueva barra o migrarse a un helper mas general.
- `src/modules/catalog/types.ts`
  - Agregar tipos frontend como `CategoryNavItem` y extender `CatalogFilters` con `brand` si se implementa.
- `src/modules/catalog/admin.ts`
  - Confirmado: admin lee todos los productos desde Supabase Admin y mapea `brand`.
  - No deberia cambiar para esta UI, salvo que se cree un helper compartido de marcas.
- `src/modules/catalog/admin-visibility.ts`
  - Define visibilidad publica usada por admin.
  - Debe seguir alineada con las reglas publicas.
- Archivos nuevos propuestos:
  - `src/components/catalog/CategoryBrandNav.tsx`
  - `src/components/catalog/CategoryBrandNavItem.tsx`
  - `src/components/catalog/MobileCategoryScroller.tsx`
  - `src/components/catalog/DesktopCategoryTabs.tsx`
  - opcional: `src/modules/catalog/navigation.ts` para construir items desde datos reales.

## 4. Diferencias entre maquinasYellowBox y HubCafe

- YellowBox es estatico: `catalog-data.js` define productos hardcodeados y `tienda.js` filtra por `product.category`.
- HubCafe es dinamico: categorias y productos se leen desde Supabase en `repository.ts`.
- YellowBox mezcla marca como categoria visual: `mokador` es una categoria/filtro hardcodeado.
- HubCafe ya tiene `brand` en productos, por lo que `Mokador`, `Laqtia` y `Schoppe` deben mapear a filtro de marca, no a categoria falsa.
- YellowBox usa botones `data-filter` y DOM manual; HubCafe debe usar React/Next con query params para no perder SEO/rutas.
- YellowBox no tiene reglas de publicacion, precio ni categoria visible; HubCafe si:
  - producto `published`;
  - precio publico mayor a 0;
  - categoria visible/activa.

## 5. Mapeo de categorias Supabase a la nueva UI

Las categorias visuales tipo `Capuchinos`, `Leches`, `Chocolates`, `Cafes`, `Insumos`, etc. deben salir de `getCatalogCategories()` o de un helper equivalente que aplique `is_visible` + `is_active`.

Estructura propuesta:

```ts
type CategoryNavItem =
  | { type: "all"; label: string; source: "system" }
  | { type: "category"; label: string; slug: string; source: "supabase" }
  | { type: "brand"; label: string; brand: string; source: "products" };
```

Reglas:

- `type: "category"` navega/filtra con `categoria=<slug>` en `/tienda`.
- Si el usuario esta en `/categorias/[slug]`, la barra puede enlazar a `/categorias/<slug>` para categorias y a `/tienda?marca=<brand>` para marcas, o mantener todo en `/tienda` para consistencia.
- Para categorias padre con hijos, mantener la logica actual de descendientes que ya existe en `getCategoryIdsForSlug`.
- No restaurar `CategoriesGrid`.
- No usar JSON como fuente de verdad.

## 6. Mapeo de marcas destacadas usando `brand`

La opcion recomendada sin migracion:

1. Definir una allowlist temporal en codigo para marcas destacadas:

```ts
const highlightedBrands = ["Mokador", "Laqtia", "Schoppe"] as const;
```

2. Derivar marcas visibles desde productos publicables:
   - `publicationStatus === "published"`;
   - `priceClpTaxInc > 0`;
   - categoria activa/visible;
   - `brand` normalizado coincide con la allowlist/alias.

3. Renderizar solo las marcas con al menos un producto publicable.

4. Al seleccionar una marca, filtrar por `brand`.

Implementacion recomendada de URL:

- Mejor opcion: agregar `marca=<brand-normalized>` o `brand=<brand-normalized>` a `CatalogFilters` y `getCatalogProducts`.
- Alternativa compatible con lo existente: reutilizar `filtro=mokador|schoppe|laqtia`, pero hoy ese filtro solo se activa si `categoria` corresponde a cafe e insumos. Para una barra global, `brand`/`marca` es mas claro y evita depender de `categoria=cafe-insumos`.

## 7. Lista de marcas destacadas iniciales

- Mokador.
- Laqtia.
- Schoppe.

Verificacion real en Supabase local:

- `brandCountsAll`: Mokador 4, Laqtia 6, Schoppe 5.
- No se encontro `Schioo` como marca real; los productos y el campo `brand` usan `Schoppe`.
- Bajo las reglas publicas actuales, esas marcas tienen productos publicados pero con precio 0, por lo que no califican como publicables ahora. La barra debe estar lista para mostrarlas apenas esos productos cumplan precio/publicacion/categoria publica.

## 8. Reglas de visibilidad

- Admin ve todo lo que Supabase Admin devuelve, con filtros de administracion.
- Tienda publica ve solo productos publicables:
  - `publicationStatus === "published"`;
  - `priceClpTaxInc > 0`;
  - categoria activa/visible.
- Categorias ocultas/inactivas no deben mostrarse publicamente salvo decision contraria.
- Marcas solo aparecen si tienen productos publicables.
- Si una marca destacada existe en la allowlist pero no tiene productos publicables, no se renderiza en la barra publica.
- Productos `draft`, `archived`, sin categoria valida o con precio 0 no deben activar chips de marca.

## 9. Componentes propuestos

- `CategoryBrandNav`
  - Componente orquestador.
  - Recibe categorias publicas, marcas derivadas y estado activo desde query params.
  - Preserva `q`, `orden` y parametros existentes al navegar.
- `CategoryBrandNavItem`
  - Boton/enlace accesible con `aria-current` o `aria-pressed`.
  - Soporta variantes `all`, `category`, `brand`.
  - Permite icono/imagen opcional por categoria o marca.
- `MobileCategoryScroller`
  - Contenedor horizontal con overflow nativo, scrollbar oculta, touch target grande y snap suave opcional.
  - Inspirado en `.category-buttons` de `css/tienda.css`.
- `DesktopCategoryTabs`
  - Barra horizontal/sticky elegante para escritorio, con hover, active state y ancho maximo.
  - Puede compartir estilos/clases con mobile y solo variar densidad.

## 10. Plan de implementacion por etapas

### Etapa 1: crear componente visual con datos actuales

- Crear `CategoryBrandNav` y subcomponentes.
- Usar categorias de `getCatalogCategories()`.
- Mantener `CatalogFilters` visible inicialmente para busqueda/orden.
- No cambiar reglas de Supabase.

### Etapa 2: conectar filtros categoria/brand

- Categoria: setear `categoria=<slug>`.
- Marca: agregar soporte a `brand`/`marca` en `CatalogFilters` y `getCatalogProducts`, o reutilizar `filtro` si se decide mantener compatibilidad con `CoffeeSupplyFilterBar`.
- Conservar `q` y `orden`.
- Limpiar `filtro` si queda incompatible con la seleccion nueva.

### Etapa 3: aplicar estilos mobile/desktop de maquinasYellowBox

- Adaptar el sticky container, blur, pills, hover y active de `css/tienda.css`.
- Mobile: overflow horizontal, scrollbar oculta, min-height 44px o mas, chips grandes.
- Desktop: barra visible, elegante, horizontal, con active claro.

### Etapa 4: reemplazar barra actual en tienda/home

- Reemplazar progresivamente `CoffeeSupplyFilterBar` en `/tienda`.
- Evaluar incluir la barra en Home debajo del hero o antes de productos destacados, sin convertirla en landing.
- Mantener rutas `/categorias/[slug]` y SEO.

### Etapa 5: limpiar mockups o filtros antiguos si quedan

- Retirar solo despues de validar que la barra nueva cubre busqueda/categoria/marca.
- No tocar pagos, backend, Flow, server, checkout ni auth.

## 11. Riesgos

- Las marcas destacadas actuales existen en Supabase, pero sus productos con `brand` tienen precio 0; por regla publica no deben aparecer todavia.
- Si se usa `filtro` para marcas globales, puede quedar acoplado a `isCoffeeSupplyCategory`; por eso conviene `brand`/`marca`.
- Cambiar la barra sin preservar `q` y `orden` puede degradar la experiencia actual.
- Duplicar categorias legacy (`cafe-grano` vs `cafe-en-grano`) puede confundir si no se respeta la logica de alias existente.
- Copiar `catalog-data.js` o crear JSON local romperia la fuente real de Supabase.
- Una barra sticky mal ajustada puede tapar header/productos en mobile.

## 12. Que NO tocar todavia

- No tocar Supabase schema.
- No crear migraciones.
- No tocar pagos.
- No tocar Flow.
- No tocar `hubcafe-backend`.
- No tocar `server/`.
- No tocar checkout.
- No tocar auth/login.
- No tocar variables de entorno.
- No restaurar `CategoriesGrid`.
- No inventar productos.
- No usar JSON como fuente de verdad.
- No hacer commit automatico.

## 13. Criterios de aceptacion para implementacion

- La tienda sigue leyendo categorias/productos desde Supabase.
- Admin puede seguir creando/editando categorias y productos sin cambios de schema.
- Productos conservan `brand`; marcas destacadas se derivan desde productos publicables.
- Categoria visual `Capuchinos` filtra por categoria real de Supabase.
- Marca visual `Mokador`, `Laqtia` o `Schoppe` filtra por `brand`.
- La barra muestra estado activo claro.
- Desktop: barra visible, horizontal, pulida, con efectos tipo YellowBox.
- Mobile: barra scrolleable/swipeable con touch target comodo y scrollbar oculta.
- No se pierden filtros actuales de busqueda ni orden al seleccionar categoria/marca.
- Rutas SEO existentes `/tienda`, `/categorias/[slug]`, `/productos/[slug]` siguen funcionando.
- No aparecen marcas sin productos publicables.
- No aparecen categorias ocultas/inactivas.
- Validaciones esperadas al implementar:
  - `npm run -s check`
  - `npx tsc --noEmit --incremental false`
  - `npm run -s lint`
  - `git diff --check`
