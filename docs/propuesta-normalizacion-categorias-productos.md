# Propuesta de normalizacion de categorias y productos

## Resumen

La decision de negocio actual es normalizar la taxonomia real de Supabase en tres raices:

- `cafe`
- `maquinas`
- `insumos`

La tienda debe seguir usando Supabase como fuente de verdad. El admin sigue siendo el lugar de gestion de productos y categorias. No se deben borrar categorias ni productos durante esta normalizacion.

Estado observado el 2026-05-26, en consulta solo lectura:

- Categorias en Supabase: 18.
- Productos en Supabase: 51.
- Productos publicables por reglas actuales: 48.
- Productos aun no publicables: 3, porque `gross_price_clp` sigue en `0`.
- Muchos productos tienen `price_clp_tax_inc = 0`, pero ya tienen `gross_price_clp` temporal mayor a `0`; la tienda publica hoy usa `gross_price_clp ?? price_clp_tax_inc`.
- Los precios cargados son temporales/ficticios y deben reemplazarse por precios reales antes de operar comercialmente.

## Diagnostico actual

Supabase todavia mezcla una taxonomia legacy con la estructura comercial nueva.

Raices actuales:

- `cafe-grano`
- `cafe-instantaneo`
- `accesorios-vasos`
- `cafe-insumos`
- `vasos-accesorios`
- `maquinas`

Raices objetivo:

- `cafe`
- `maquinas`
- `insumos`

Categorias objetivo bajo `cafe`:

- `mokador`
- `laqtia`
- `schoppe`
- `capuchinos`
- `chocolates`
- `leches`
- `chai-te-instantaneo`
- `toppings`
- otros relacionados, como cafe en grano, cafe instantaneo o mokachinos si negocio los mantiene.

Categorias objetivo bajo `maquinas`:

- maquinas y sus familias hijas.

Categorias objetivo bajo `insumos`:

- `vasos`
- `accesorios`
- `tapas`
- `revolvedores`
- otros insumos fisicos.

## Mokador, Laqtia y Schoppe

Hoy existen como `brand` en productos, pero no existen como categorias:

- `Mokador`: 4 productos totales, 3 publicables.
- `Laqtia`: 6 productos totales, 4 publicables.
- `Schoppe`: 5 productos totales, 5 publicables.

Nueva decision:

- `mokador` debe ser categoria hija de `cafe`.
- `laqtia` debe ser categoria hija de `cafe`.
- `schoppe` debe ser categoria hija de `cafe`.
- Tambien se mantiene el campo `brand` del producto, porque ya existe y no requiere cambio de schema.
- La barra de `/tienda` debe destacarlas visualmente solo cuando existan como categorias publicas y tengan productos publicables.

## Productos aun no publicables

Quedan productos publicados con precio bruto publico en `0`:

- Mokador Extra Cream
- Laqtia French Vainilla
- Laqtia Chocolate 22% Cacao Q15

No inventar precios desde SQL. Deben revisarse manualmente en admin o mediante una carga de precios validada por negocio.

## Categorias legacy

Categorias legacy detectadas:

- `cafe-grano`
- `cafe-instantaneo`
- `accesorios-vasos`
- `cafe-insumos`
- `vasos-accesorios`, si se decide reemplazarla por `insumos` + `vasos` / `accesorios`.

Regla de manejo:

- No borrar.
- No desactivar categorias con productos directos hasta que los productos esten reclasificados.
- Mantener alias frontend para rutas existentes mientras se completa la normalizacion.
- Mover `parent_id` cuando el mapeo es claro.
- Cambiar `category_id` de productos solo cuando el mapeo es claro.
- Dejar TODO/manual para productos ambiguos, especialmente vasos, tapas, sachets, mangas y accesorios fisicos.

## Mapeo propuesto

Mapeo claro de categorias:

- `maquinas` queda como raiz.
- `maquinas-cafe` y `maquinas-vending` quedan bajo `maquinas`.
- `capuchinos`, `chocolates`, `chai-te-instantaneo`, `mokachinos` quedan bajo `cafe`.
- `mokador`, `laqtia`, `schoppe` se crean como hijas de `cafe`.
- `vasos`, `accesorios`, `tapas`, `revolvedores` quedan bajo `insumos`.
- `vasos-polipapel` y `vasos-eco-ripple` pueden quedar bajo `vasos`.
- `accesorios-vasos` se mantiene como legacy bajo `insumos` mientras se separan sus productos.
- `cafe-insumos` se mantiene temporalmente como legacy para no romper rutas antiguas.

Mapeo claro de productos:

- Productos con `brand = Mokador` pueden moverse a categoria `mokador`.
- Productos con `brand = Laqtia` pueden moverse a categoria `laqtia`.
- Productos con `brand = Schoppe` pueden moverse a categoria `schoppe`.

Mapeo manual:

- Productos en `accesorios-vasos` deben revisarse uno por uno para moverlos a `vasos`, `tapas`, `revolvedores` o `accesorios`.
- Productos en `leches-toppings` deben revisarse si negocio quiere separar `leches` y `toppings`.
- Productos de cafe legacy en `cafe-grano` y `cafe-instantaneo` pueden mantenerse bajo esas categorias movidas a `cafe`, o consolidarse despues.

## Frontend

La barra de `/tienda` debe usar categorias reales desde Supabase.

Comportamiento propuesto:

- `Todos` al inicio.
- Categorias destacadas por allowlist temporal de slugs: `mokador`, `laqtia`, `schoppe`.
- La allowlist solo ordena y da tratamiento visual; no crea datos.
- Una categoria destacada aparece solo si existe en Supabase como publica y tiene productos publicables.
- Categorias base despues: `cafe`, `maquinas`, `insumos`, y familias comerciales relevantes.
- Mantener soporte de `brand` como compatibilidad de URL, pero no usarlo como fuente visual principal.
- `/tienda` debe mostrar una sola barra principal; busqueda y orden quedan como controles secundarios.

## Admin

El admin sigue siendo valido como fuente de gestion:

- Lista categorias y productos desde Supabase.
- Permite editar categoria, precio, estado de publicacion, marca y stock.
- Permite crear categorias nuevas sin migraciones.
- Permite mover productos a categorias nuevas usando el formulario.

## Antes de ejecutar SQL

No ejecutar la propuesta directamente en produccion sin revisar:

- Hacer respaldo de `categories` y `products`.
- Probar primero en staging.
- Confirmar que los precios temporales fueron reemplazados por precios reales.
- Confirmar si la categoria principal de un producto branded debe ser la marca o la familia.
- Revisar manualmente productos fisicos antes de separarlos en `vasos`, `tapas`, `revolvedores` o `accesorios`.
- En el SQL la transaccion termina con `rollback`; cambiar a `commit` solo despues de validar.

## SQL pendiente

Ver `docs/propuesta-normalizacion-categorias-productos.sql`.
