-- Propuesta segura para normalizar categorias/productos de HubCafe.
-- Fecha: 2026-05-25
--
-- IMPORTANTE:
-- - No ejecutar directo en produccion.
-- - Probar primero en staging y con respaldo de categories/products.
-- - No borra categorias ni productos.
-- - No usa DROP ni DELETE.
-- - No inventa precios.
-- - Termina con ROLLBACK para evitar cambios accidentales.

begin;

-- 1) Reporte previo de categorias.
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

-- 2) Reporte previo de marcas destacadas.
select
  lower(trim(coalesce(brand, ''))) as normalized_brand,
  brand,
  count(*) as total_products,
  count(*) filter (
    where publication_status = 'published'
      and coalesce(gross_price_clp, price_clp_tax_inc, 0) > 0
  ) as publicable_products
from products
where lower(trim(coalesce(brand, ''))) in (
  'mokador',
  'laqtia',
  'schoppe',
  'schope',
  'lactia',
  'schioo'
)
group by normalized_brand, brand
order by normalized_brand, brand;

-- 3) Reporte previo de precios temporales o pendientes.
select
  p.id,
  p.slug,
  p.name,
  c.slug as category_slug,
  p.brand,
  p.publication_status,
  p.gross_price_clp,
  p.price_clp_tax_inc
from products p
left join categories c on c.id = p.category_id
where coalesce(p.gross_price_clp, p.price_clp_tax_inc, 0) <= 0
   or p.price_clp_tax_inc = 0
order by p.brand, p.name;

-- 4) Crear raices faltantes solo si no existen.
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
select
  'cat-cafe',
  null,
  'cafe',
  'Cafe',
  'Cafe, bebidas calientes e insumos bebibles.',
  10,
  true,
  true,
  'Cafe | SMK Vending',
  'Cafe, bebidas calientes e insumos bebibles.'
where not exists (
  select 1 from categories where id = 'cat-cafe' or slug = 'cafe'
);

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
select
  'cat-insumos',
  null,
  'insumos',
  'Insumos',
  'Vasos, tapas, revolvedores y accesorios fisicos.',
  20,
  true,
  true,
  'Insumos | SMK Vending',
  'Vasos, tapas, revolvedores y accesorios fisicos.'
where not exists (
  select 1 from categories where id = 'cat-insumos' or slug = 'insumos'
);

update categories
set
  parent_id = null,
  name = 'Cafe',
  sort_order = 10,
  is_active = true,
  is_visible = true,
  updated_at = now()
where id = 'cat-cafe' or slug = 'cafe';

update categories
set
  parent_id = null,
  slug = 'maquinas',
  name = 'Maquinas',
  sort_order = 30,
  is_active = true,
  is_visible = true,
  updated_at = now()
where id = 'cat-maquinas' or slug = 'maquinas';

update categories
set
  parent_id = null,
  name = 'Insumos',
  sort_order = 20,
  is_active = true,
  is_visible = true,
  updated_at = now()
where id = 'cat-insumos' or slug = 'insumos';

-- 5) Crear categorias destacadas/familias faltantes.
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
select *
from (
  values
    (
      'cat-mokador',
      (select id from categories where slug = 'cafe' limit 1),
      'mokador',
      'Mokador',
      'Productos Mokador.',
      11,
      true,
      true,
      'Mokador | SMK Vending',
      'Productos Mokador.'
    ),
    (
      'cat-laqtia',
      (select id from categories where slug = 'cafe' limit 1),
      'laqtia',
      'Laqtia',
      'Productos Laqtia.',
      12,
      true,
      true,
      'Laqtia | SMK Vending',
      'Productos Laqtia.'
    ),
    (
      'cat-schoppe',
      (select id from categories where slug = 'cafe' limit 1),
      'schoppe',
      'Schoppe',
      'Productos Schoppe.',
      13,
      true,
      true,
      'Schoppe | SMK Vending',
      'Productos Schoppe.'
    ),
    (
      'cat-leches',
      (select id from categories where slug = 'cafe' limit 1),
      'leches',
      'Leches',
      'Leches para cafe y vending.',
      18,
      true,
      true,
      'Leches | SMK Vending',
      'Leches para cafe y vending.'
    ),
    (
      'cat-toppings',
      (select id from categories where slug = 'cafe' limit 1),
      'toppings',
      'Toppings',
      'Toppings para cafe y vending.',
      19,
      true,
      true,
      'Toppings | SMK Vending',
      'Toppings para cafe y vending.'
    ),
    (
      'cat-vasos',
      (select id from categories where slug = 'insumos' limit 1),
      'vasos',
      'Vasos',
      'Vasos para cafe y vending.',
      21,
      true,
      true,
      'Vasos | SMK Vending',
      'Vasos para cafe y vending.'
    ),
    (
      'cat-accesorios-fisicos',
      (select id from categories where slug = 'insumos' limit 1),
      'accesorios',
      'Accesorios',
      'Accesorios fisicos para servicio de cafe.',
      22,
      true,
      true,
      'Accesorios | SMK Vending',
      'Accesorios fisicos para servicio de cafe.'
    )
) as next_categories (
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
where not exists (
  select 1
  from categories existing
  where existing.id = next_categories.id
     or existing.slug = next_categories.slug
);

-- 6) Normalizar escritura de marcas conocidas antes de mover productos.
update products
set brand = 'Mokador', updated_at = now()
where lower(trim(coalesce(brand, ''))) = 'mokador'
  and brand is distinct from 'Mokador';

update products
set brand = 'Laqtia', updated_at = now()
where lower(trim(coalesce(brand, ''))) in ('laqtia', 'lactia')
  and brand is distinct from 'Laqtia';

update products
set brand = 'Schoppe', updated_at = now()
where lower(trim(coalesce(brand, ''))) in ('schoppe', 'schope')
  and brand is distinct from 'Schoppe';

-- 7) Mover parent_id de categorias cuando el mapeo es claro.
update categories
set
  parent_id = (select id from categories where slug = 'cafe' limit 1),
  is_active = true,
  is_visible = true,
  updated_at = now()
where slug in (
  'cafe-insumos',
  'cafe-grano',
  'cafe-instantaneo',
  'cafe-en-grano',
  'capuchinos',
  'mokachinos',
  'chocolates',
  'chai-te-instantaneo',
  'leches-toppings'
)
and exists (select 1 from categories where slug = 'cafe');

update categories
set
  parent_id = (select id from categories where slug = 'maquinas' limit 1),
  is_active = true,
  is_visible = true,
  updated_at = now()
where slug in (
  'maquinas-cafe',
  'maquinas-vending'
)
and exists (select 1 from categories where slug = 'maquinas');

update categories
set
  parent_id = (select id from categories where slug = 'insumos' limit 1),
  is_active = true,
  is_visible = true,
  updated_at = now()
where slug in (
  'accesorios-vasos',
  'vasos-accesorios',
  'tapas',
  'revolvedores'
)
and exists (select 1 from categories where slug = 'insumos');

update categories
set
  parent_id = (select id from categories where slug = 'vasos' limit 1),
  is_active = true,
  is_visible = true,
  updated_at = now()
where slug in (
  'vasos-polipapel',
  'vasos-eco-ripple'
)
and exists (select 1 from categories where slug = 'vasos');

-- 8) Mover productos branded a categorias destacadas.
--    Este mapeo es claro por brand, pero confirmar con negocio que la categoria
--    principal del producto debe ser la marca y no la familia.
update products
set
  category_id = (select id from categories where slug = 'mokador' limit 1),
  updated_at = now()
where lower(trim(coalesce(brand, ''))) = 'mokador'
  and exists (select 1 from categories where slug = 'mokador')
  and category_id is distinct from (
    select id from categories where slug = 'mokador' limit 1
  );

update products
set
  category_id = (select id from categories where slug = 'laqtia' limit 1),
  updated_at = now()
where lower(trim(coalesce(brand, ''))) = 'laqtia'
  and exists (select 1 from categories where slug = 'laqtia')
  and category_id is distinct from (
    select id from categories where slug = 'laqtia' limit 1
  );

update products
set
  category_id = (select id from categories where slug = 'schoppe' limit 1),
  updated_at = now()
where lower(trim(coalesce(brand, ''))) = 'schoppe'
  and exists (select 1 from categories where slug = 'schoppe')
  and category_id is distinct from (
    select id from categories where slug = 'schoppe' limit 1
  );

-- 9) Productos ambiguos para revision manual.
--    No mover automaticamente porque pueden ser vasos, tapas, revolvedores,
--    sachets, mangas u otros accesorios.
select
  p.id,
  p.slug,
  p.name,
  c.slug as current_category_slug,
  p.brand,
  coalesce(p.gross_price_clp, p.price_clp_tax_inc, 0) as public_gross_price
from products p
join categories c on c.id = p.category_id
where c.slug in (
  'accesorios-vasos',
  'leches-toppings'
)
order by c.slug, p.name;

-- 10) Validacion final antes de cambiar ROLLBACK por COMMIT.
select
  c.slug as category_slug,
  parent.slug as parent_slug,
  count(p.id) as direct_products
from categories c
left join categories parent on parent.id = c.parent_id
left join products p on p.category_id = c.id
group by c.slug, parent.slug
order by parent.slug nulls first, c.slug;

select
  c.slug as category_slug,
  p.brand,
  count(*) as products
from products p
left join categories c on c.id = p.category_id
group by c.slug, p.brand
order by c.slug, p.brand;

rollback;
