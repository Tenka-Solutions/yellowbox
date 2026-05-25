-- Propuesta segura para normalizar categorias/productos de HubCafe.
-- Fecha: 2026-05-25
--
-- IMPORTANTE:
-- - No ejecutar en produccion sin respaldo y revision de negocio.
-- - Este archivo termina con ROLLBACK para evitar cambios accidentales.
-- - Reemplazar ROLLBACK por COMMIT solo despues de probar en staging.
-- - No borra categorias ni productos.
-- - No inventa precios.

begin;

-- 1) Reporte previo: categorias y productos por categoria.
select
  c.id,
  c.slug,
  c.name,
  p.slug as parent_slug,
  c.is_active,
  c.is_visible,
  count(pr.id) as direct_products
from categories c
left join categories p on p.id = c.parent_id
left join products pr on pr.category_id = c.id
group by c.id, c.slug, c.name, p.slug, c.is_active, c.is_visible
order by c.sort_order, c.name;

-- 2) Reporte previo: productos publicados que aun no son publicables por precio.
select
  p.id,
  p.slug,
  p.name,
  c.slug as category_slug,
  p.brand,
  p.publication_status,
  coalesce(p.gross_price_clp, p.price_clp_tax_inc, 0) as public_gross_price
from products p
left join categories c on c.id = p.category_id
where p.publication_status = 'published'
  and coalesce(p.gross_price_clp, p.price_clp_tax_inc, 0) <= 0
order by p.brand, p.name;

-- 3) Asegurar padres logicos recomendados.
--    Estos inserts no borran ni reemplazan productos.
insert into categories (
  id,
  parent_id,
  slug,
  name,
  description,
  sort_order,
  is_active,
  is_visible,
  seo_title,
  seo_description
)
values
  (
    'cat-cafe',
    null,
    'cafe',
    'Cafe',
    'Cafe en grano, cafe instantaneo y familias relacionadas.',
    10,
    true,
    true,
    'Cafe | SMK Vending',
    'Cafe en grano, cafe instantaneo y familias relacionadas.'
  ),
  (
    'cat-insumos',
    null,
    'insumos',
    'Insumos',
    'Insumos para maquinas, vending y servicio de cafe.',
    20,
    true,
    true,
    'Insumos | SMK Vending',
    'Insumos para maquinas, vending y servicio de cafe.'
  )
on conflict (id) do update
set
  parent_id = excluded.parent_id,
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_visible = excluded.is_visible,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  updated_at = now();

update categories
set
  parent_id = null,
  slug = 'maquinas',
  name = 'Maquinas',
  sort_order = 30,
  is_active = true,
  is_visible = true,
  updated_at = now()
where id = 'cat-maquinas';

-- 4) Propuesta de parentesco logico.
--    Revisar con negocio antes de ejecutar como COMMIT.
update categories
set
  parent_id = 'cat-cafe',
  is_active = true,
  is_visible = true,
  updated_at = now()
where id in (
  'cat-grano',
  'cat-instantaneo',
  'cat-cafe-grano'
);

update categories
set
  parent_id = 'cat-insumos',
  is_active = true,
  is_visible = true,
  updated_at = now()
where id in (
  'cat-capuchinos',
  'cat-mokachinos',
  'cat-chocolates',
  'cat-chai-te',
  'cat-leches-toppings',
  'cat-accesorios',
  'cat-vasos-accesorios'
);

update categories
set
  parent_id = 'cat-maquinas',
  is_active = true,
  is_visible = true,
  updated_at = now()
where id in (
  'cat-maquinas-cafe',
  'cat-maquinas-vending'
);

-- 5) Categorias legacy con productos directos.
--    No mover automaticamente porque requiere clasificacion comercial manual.
select
  p.id,
  p.slug,
  p.name,
  c.slug as current_category_slug
from products p
join categories c on c.id = p.category_id
where c.id in (
  'cat-accesorios',
  'cat-grano',
  'cat-instantaneo'
)
order by c.slug, p.name;

-- Si negocio decide que TODOS los productos de accesorios-vasos pertenecen al
-- grupo general vasos-accesorios, se podria ejecutar despues de revisar:
--
-- update products
-- set category_id = 'cat-vasos-accesorios', updated_at = now()
-- where category_id = 'cat-accesorios';

-- Si negocio decide que los productos cafe-grano legacy deben moverse al
-- equivalente canonico, revisar duplicados y ejecutar:
--
-- update products
-- set category_id = 'cat-cafe-grano', updated_at = now()
-- where category_id = 'cat-grano';

-- 6) Correccion segura de marcas conocidas con typos habituales.
--    No crea marcas nuevas ni inventa productos.
update products
set brand = 'Mokador', updated_at = now()
where lower(trim(brand)) = 'mokador'
  and brand <> 'Mokador';

update products
set brand = 'Laqtia', updated_at = now()
where lower(trim(brand)) in ('laqtia', 'lactia')
  and brand <> 'Laqtia';

update products
set brand = 'Schoppe', updated_at = now()
where lower(trim(brand)) in ('schoppe', 'schope')
  and brand <> 'Schoppe';

-- 7) Precios en cero: solo reporte. No inventar precios desde SQL.
select
  p.id,
  p.slug,
  p.name,
  p.brand,
  c.slug as category_slug,
  coalesce(p.gross_price_clp, p.price_clp_tax_inc, 0) as current_public_price
from products p
left join categories c on c.id = p.category_id
where coalesce(p.gross_price_clp, p.price_clp_tax_inc, 0) <= 0
order by p.brand, p.name;

-- 8) Validacion final antes de cambiar ROLLBACK por COMMIT.
select
  c.slug as category_slug,
  p.brand,
  count(*) as products
from products p
left join categories c on c.id = p.category_id
group by c.slug, p.brand
order by c.slug, p.brand;

rollback;
