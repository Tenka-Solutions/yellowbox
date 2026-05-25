# Propuesta de normalizacion de categorias y productos

## Resumen

La revision local confirma que el admin usa Supabase como fuente real para productos y categorias. El problema principal no es que el admin no liste productos, sino que la tienda publica aplica reglas correctas de visibilidad y hoy oculta productos sin precio publico.

Estado observado el 2026-05-25:

- Categorias en Supabase: 18.
- Productos en Supabase: 51.
- Productos visibles en tienda publica: 29.
- Productos ocultos por reglas publicas: 22.
- Causa de los 22 ocultos: `gross_price_clp` / `price_clp_tax_inc` en `0`.
- No se detectaron categorias inactivas u ocultas afectando esos 22 productos.
- No se detectaron productos ocultos por `draft` en la muestra revisada.
- Marcas destacadas presentes con escritura correcta: Mokador, Laqtia, Schoppe.
- No se detectaron productos con marca `Schioo`.

## Diagnostico

El frontend de tienda esta respetando una regla prudente: solo muestra productos `published`, con precio bruto mayor a `0`, y con categoria activa/visible. Por eso los productos con marca Mokador, Laqtia y Schoppe no aparecen todavia como accesos de marca destacados: existen en Supabase, pero todos tienen precio publico `0`.

La taxonomia actual mezcla categorias raiz antiguas con la estructura nueva:

- Raices antiguas con productos publicos: `cafe-grano`, `cafe-instantaneo`, `accesorios-vasos`.
- Raiz comercial nueva: `cafe-insumos`, con familias hijas.
- Raiz comercial nueva: `vasos-accesorios`, pero sus subcategorias no tienen productos directos.
- Raiz comercial correcta: `maquinas`.

Esto explica que la navegacion se sienta menos unificada. El codigo contiene alias para mantener compatibilidad de rutas, pero la fuente de verdad deberia quedar mas limpia en Supabase.

## Productos no visibles y motivo

Todos los siguientes productos estan `published`, con categoria activa/visible, pero no aparecen en tienda porque su precio bruto publico es `0`:

- Leche Liofilizada Regilait Topping-2
- Leche Liofilizada Regilait Skimmed
- Chocolate Van Houten VH12
- Caprimo Cappuccino Speculos
- Caprimo Cappuccino Noisette
- Caprimo Cappuccino Caramelo
- Caprimo Capuccino Vainilla LS
- Mokador 100% Arabica Bio
- Mokador Oro Blend
- Mokador Brio 100
- Mokador Extra Cream
- Schoppe Caramel 302
- Schoppe Vainilla 301
- Schoppe Noisette 303
- Schoppe Choco 107
- Schoppe Instant Tea 505
- Laqtia Mocacino
- Laqtia Capuccino
- Laqtia French Vainilla
- Laqtia Leche Topping
- Laqtia Chocolate 22% Cacao Q15
- Laqtia Natur Basic

## Admin

El admin esta administrando correctamente productos y categorias desde Supabase:

- `src/modules/catalog/admin.ts` lee `categories` y `products` con cliente admin.
- `src/app/(admin)/admin/productos/page.tsx` lista todos los productos leidos y permite filtrar/editar.
- `src/components/admin/ProductForm.tsx` permite editar categoria, precio, estado de publicacion, marca y stock.
- `src/app/(admin)/admin/categorias/page.tsx` lista categorias raiz e hijas.
- `src/components/admin/CategoryForm.tsx` permite crear/editar categorias y parent.

La visibilidad publica se explica tambien desde el admin mediante `src/modules/catalog/admin-visibility.ts`: un producto publicado sin precio publico queda como "Sin precio publico".

## Taxonomia recomendada

La estructura logica recomendada para Supabase es:

- `cafe`
- `maquinas`
- `insumos`

Mapeo comercial esperado:

- Navbar "Maquinas" apunta a `maquinas`.
- Navbar "Cafe e insumos" representa `cafe` + `insumos`.
- Navbar "Vasos y accesorios" debe vivir dentro de `insumos`, como grupo o familias hijas.

Sugerencia sin borrar datos:

- Crear o activar `cat-cafe` con slug `cafe`.
- Mantener `cat-maquinas` con slug `maquinas`.
- Crear o activar `cat-insumos` con slug `insumos`.
- Mover familias de cafe bajo `cat-cafe` cuando sean realmente cafe.
- Mover familias de insumos bajo `cat-insumos`.
- Mover `vasos-accesorios` bajo `cat-insumos`.
- Mover tambien la categoria legacy `accesorios-vasos` bajo `cat-insumos` mientras se revisa la clasificacion fina de esos productos.
- Revisar manualmente productos que hoy estan en categorias legacy antes de moverlos.

## Antes de ejecutar SQL

No ejecutar la propuesta directamente en produccion sin revisar:

- Respaldar tablas `categories` y `products`.
- Confirmar con negocio si `capuchinos`, `mokachinos`, `chocolates`, `chai-te-instantaneo` y `leches-toppings` son familias de `insumos` o de `cafe`.
- Confirmar si los productos directos en `accesorios-vasos` deben quedarse en el grupo `vasos-accesorios` o distribuirse en `vasos-polipapel`, `vasos-eco-ripple`, `tapas` y `revolvedores`.
- Cargar precios reales para productos con precio `0`; no inventar precios.
- Probar primero en staging.
- En el archivo SQL la transaccion termina con `rollback` por seguridad. Reemplazar por `commit` solo despues de validar el resultado.

## Archivo SQL

Ver `docs/propuesta-normalizacion-categorias-productos.sql`.
