# Auditoria semantica visual de HubCafe

Fecha: 2026-05-20

## 1. Resumen ejecutivo

HubCafe ya tiene una base util de tokens visuales en `src/app/globals.css` y el modulo Admin > Apariencia ya modifica parte de esos tokens en runtime. La UI, sin embargo, todavia mezcla tres niveles de estilo:

- clases semanticas globales existentes: `page-shell`, `panel-card`, `surface-card`, `button-primary`, `button-secondary`, `button-gold`, `section-kicker`, `form-input`;
- tokens CSS usados directamente en componentes: `text-[var(--color-muted)]`, `rounded-[2rem]`, `shadow-[...]`, `bg-[color-mix(...)]`;
- valores hardcodeados o locales: `bg-[#F2A359]`, `text-white`, `bg-black`, `shadow-[0_...]`, multiples `text-4xl`, `text-sm`, `rounded-[1.75rem]`.

El mayor riesgo no es que falten tokens, sino que los roles visuales no estan nombrados de forma consistente. Un titulo de pagina, una descripcion, un titulo de card o un texto secundario se escriben de forma distinta en tienda, cuenta, admin, checkout y componentes compartidos. Eso limita el impacto real de Admin > Apariencia y vuelve dificil ajustar la marca sin tocar muchas superficies.

La recomendacion principal es crear una capa semantica reutilizable antes de seguir normalizando pagina por pagina. Esta capa debe cubrir titulos, descripciones, textos secundarios, botones, cards, inputs, badges y mensajes de estado. Luego se deben migrar primero las superficies compartidas, despues tienda/checkout, despues cuenta/admin.

## 2. Diagnostico del estado actual de la UI

### Fortalezas

- `globals.css` define tokens claros para colores, radios, tipografia y sombras.
- `AppearanceProvider` aplica cambios de color principal, fondo, texto, card, borde, header, footer, precio, radios, fuentes y sombras.
- `ProductCard`, `button-primary`, `button-secondary`, `form-input`, `panel-card` y `surface-card` ya apuntan a variables configurables.
- El modulo Admin > Apariencia contiene un preview que usa tokens y funciona como referencia viva del sistema.

### Problemas principales

- No hay componentes semanticos para `PageTitle`, `SectionTitle`, `SectionDescription`, `MutedText`, `ProductTitle`, `AppCard`, etc. Cada archivo arma su jerarquia visual con clases Tailwind.
- `text-[var(--color-muted)]` se usa para descripciones importantes, pero Admin > Apariencia no actualiza `--color-muted`. En varios casos deberia usarse `--color-muted-foreground` o un token semantico de descripcion.
- Admin > Apariencia no actualiza todavia `--color-muted`, `--color-surface-soft`, `--color-surface-strong`, `--color-input`, `--color-placeholder`, `--color-badge`, `--color-hero`, `--color-hero-muted`, `--color-hero-card` ni `--color-hero-border`. Por eso algunas zonas no responden completamente a cambios globales.
- Los radios aparecen como `rounded-[2rem]`, `rounded-[1.75rem]`, `rounded-[1.5rem]`, `rounded-[1.25rem]`, `rounded-[1rem]`, etc. Aunque algunos coinciden visualmente, no pasan por `--radius-*`.
- Hay sombras locales no tokenizadas: `shadow-[0_18px_42px_-36px_rgba(...)]`, `shadow-[0_-18px_40px_-28px_rgba(...)]`, sombras de WhatsApp y algunos estados de filtro.
- Algunos controles segmentados usan `bg-[#F2A359] text-white`, lo que no sigue el color principal administrable.
- El home usa `bg-black` para el banner desktop. Puede ser intencional por imagen, pero queda fuera de Admin > Apariencia.
- Hay diferencias fuertes entre descripciones de tienda/cuenta (`text-[var(--color-muted)]`) y admin (`text-[var(--color-muted-foreground)]`).

## 3. Propuesta de sistema visual semantico

Crear una capa de estilos semanticos encima de los tokens actuales. Puede implementarse como componentes React pequenos, clases globales, o ambas cosas.

### Principios

- Los archivos de pagina deben decir que rol visual tiene el texto, no repetir `text-4xl`, `leading-8`, `text-[var(...)]`.
- Los componentes compartidos deben ser la fuente de verdad para botones, cards, inputs, badges y mensajes.
- Admin > Apariencia debe modificar tokens base y tokens semanticos derivados.
- Los tokens no deben depender del contexto de admin salvo que sea realmente una pantalla admin.

### Tokens semanticos sugeridos

| Rol | Token actual/base sugerido | Token semantico recomendado |
| --- | --- | --- |
| Titulos principales | `--font-size-page-title`, `--color-heading` | `--text-page-title`, `--color-title` |
| Titulos de seccion | `--font-size-section-title`, `--color-heading` | `--text-section-title`, `--color-section-title` |
| Titulos de cards/productos | `--font-size-section-title` o `1.125rem`, `--color-heading` | `--text-card-title`, `--color-card-title` |
| Descripciones | `--font-size-base`, `--color-muted-foreground` | `--text-description`, `--color-description` |
| Textos secundarios | `--font-size-small`, `--color-muted-foreground` | `--text-muted`, `--color-muted-text` |
| Precios | `--color-price` | `--text-price`, `--color-price` |
| Links | `--color-link`, `--color-link-hover` | `--color-link`, `--color-link-hover` |
| Boton primario | `--color-primary`, `--color-primary-foreground`, `--shadow-button` | `--button-primary-*` |
| Boton secundario | `--color-card`, `--color-border`, `--color-card-foreground` | `--button-secondary-*` |
| Cards | `--color-card`, `--color-card-foreground`, `--color-border`, `--shadow-card` | `--card-*` |
| Inputs | `--color-input`, `--color-input-foreground`, `--color-placeholder`, `--color-ring` | `--input-*` |
| Bordes | `--border-width-base`, `--color-border` | `--border-default-*` |
| Sombras | `--shadow-card`, `--shadow-soft`, `--shadow-button` | `--shadow-card`, `--shadow-elevated`, `--shadow-action` |
| Radios | `--radius-small`, `--radius-medium`, `--radius-large` | `--radius-control`, `--radius-card`, `--radius-section` |

## 4. Tabla de hallazgos por archivo

| Archivo | Componente/seccion | Problema detectado | Clase/valor inconsistente | Recomendacion | Prioridad | Riesgo |
| --- | --- | --- | --- | --- | --- | --- |
| `src/app/globals.css` | Tokens y utilidades globales | Hay tokens base, pero faltan aliases semanticos para titulos, descripcion, cards y controles. | `--font-size-page-title`, `--font-size-section-title` sin clases `page-title`, `description`, etc. | Agregar clases/tokens semanticos antes de migrar componentes. | Alta | Medio |
| `src/modules/appearance/applyAppearanceSettings.ts` | Aplicacion de Admin > Apariencia | No aplica todos los tokens que la UI consume. | faltan `--color-muted`, `--color-surface-strong`, `--color-input`, `--color-hero-*`, `--color-badge` | Extender mapeo luego de definir semantica visual. | Alta | Medio |
| `src/app/(store)/page.tsx` | Home hero | Hero esta mas tokenizado, pero el banner usa negro fijo y CTA secundario local. | `bg-black`, `text-[0.74rem]`, `rounded-full`, `text-sm` | Usar `HeroSection`, `SectionKicker`, `SecondaryButton`; revisar si banner necesita token propio. | Media | Bajo |
| `src/components/home/HeroCarousel.tsx` | Cards del carousel | Card hero usa estilos propios y no `ProductCard` ni `AppCard`. | `rounded-[1.25rem]`, `bg-[var(--color-hero-card)]`, `text-sm`, `button-gold` | Crear `HeroProductCard` o alinear con `AppCard` y `ProductTitle`. | Media | Medio |
| `src/components/home/TrustSignals.tsx` | Barra de confianza | Colores y textos usan tokens, pero no componentes semanticos. | `text-xs`, `text-[var(--color-secondary)]`, `text-[var(--color-heading)]` | Crear `TrustSignal` con `MutedText`/`IconText` o clase semantica. | Baja | Bajo |
| `src/components/home/CtaBanner.tsx` | Archivo vacio | Existe archivo sin contenido exportado. | archivo vacio | Decidir eliminarlo o implementarlo cuando se haga limpieza estructural. | Baja | Bajo |
| `src/components/layout/SiteHeader.tsx` | Header/nav | Navegacion tokenizada, pero controles tienen estilos locales y radios fijos. | `h-10 w-10`, `rounded-full`, `bg-[color-mix(...)]` | Crear `IconButton`/`NavLink` y conservar tokens header. | Media | Medio |
| `src/components/layout/SiteFooter.tsx` | Footer | Usa tokens footer, pero estructura textual no es semantica reusable. | `text-2xl`, `text-sm`, `tracking-[0.18em]` | Usar `FooterTitle`, `FooterLabel`, `FooterMutedText`. | Baja | Bajo |
| `src/components/layout/ThemeToggle.tsx` | Pestaña lateral | Bien conectado a tokens principales, pero usa clases locales complejas. | `h-[3.3rem]`, `rounded-r-[var(--radius-large)]`, ring `color-mix` | Mantener por ahora; documentar como componente especial. | Baja | Bajo |
| `src/components/layout/WhatsAppButton.tsx` | CTA flotante WhatsApp | Color y sombra hardcodeados, no responde a tema ni admin. | `bg-[#25D366]`, `text-white`, `shadow-[0_4px_14px_rgba(...)]` | Definir token `--color-whatsapp` o aceptar excepcion de marca externa. | Baja | Bajo |
| `src/components/catalog/ProductCard.tsx` | Card producto | Es de los mejores ejemplos, pero titulo de producto usa `font-size-section-title`. | `text-[length:var(--font-size-section-title)]` para producto | Crear `ProductTitle` y `ProductDescription`; mantener `AppCard`. | Alta | Bajo |
| `src/components/catalog/ProductGallery.tsx` | Galeria producto | Usa `surface-card` pero sobreescribe radios. | `rounded-[2rem]`, `rounded-[1.4rem]` | Migrar a `AppCard` con variantes `media` y tokens `--radius-card`. | Media | Bajo |
| `src/components/catalog/AvailabilityBadge.tsx` | Badge disponibilidad | Duplica logica visual que tambien existe en `StatusBadge`. | `bg-[color-mix(...)]`, `text-xs`, `rounded-full` | Unificar con `StatusBadge` o `Badge` con tonos semanticos. | Alta | Medio |
| `src/components/catalog/CatalogFilters.tsx` | Filtros tienda | Usa `surface-card` y `form-input`, pero fuerza radio local. | `rounded-[1.8rem]` | Reemplazar por `AppCard`/`FilterPanel`. | Media | Bajo |
| `src/components/catalog/CoffeeSupplyFilterBar.tsx` | Filtros cafe/insumos | Mucha sombra, color-mix y estados locales. | `shadow-[0_18px_42px...]`, `shadow-[0_12px...]`, `rounded-[2rem]` | Crear `SegmentedFilter` con tokens de estado selected/default. | Alta | Medio |
| `src/components/catalog/PriceTag.tsx` | Precio | Buen candidato a componente semantico central. | revisar uso de `--color-price` y tamanos locales | Convertir en fuente de verdad para precio en tienda/admin/checkout. | Alta | Bajo |
| `src/app/(store)/tienda/page.tsx` | Tienda/listado | Falta titulo principal de pagina; solo se muestra kicker y filtros. | solo `section-kicker` | Definir si tienda necesita `PageTitle`/`PageDescription`. | Media | Bajo |
| `src/app/(store)/productos/[slug]/page.tsx` | Detalle producto | Titulo/descripcion usan clases locales y descripcion usa `--color-muted`. | `text-4xl`, `text-base leading-8 text-[var(--color-muted)]` | Usar `PageTitle`, `DescriptionText`, `ProductBulletList`. | Alta | Bajo |
| `src/app/(store)/carrito/page.tsx` | Carrito | Buen layout, pero barra movil usa sombra hardcodeada. | `shadow-[0_-18px_40px_-28px_rgba(...)]`, `text-sm`, `text-xl` | Crear `MobileCheckoutBar` y tokens de sombra/fondo flotante. | Media | Medio |
| `src/components/cart/CartSummary.tsx` | Resumen carrito | Total usa gradiente local y chip local. | `bg-[linear-gradient(...)]`, `rounded-[1.6rem]` | Crear `TotalPanel` con tokens `--color-primary`/`--shadow-soft`. | Media | Medio |
| `src/components/cart/CartLineItem.tsx` | Item carrito | Usa `surface-card` pero controles cantidad/remover son locales. | `rounded-full`, `bg-[var(--input)]`, hover danger local | Crear `QuantityStepper` y `DangerButton`. | Media | Medio |
| `src/app/(store)/checkout/page.tsx` | Checkout page header | Descripcion usa `--color-placeholder`, no semantica de descripcion. | `text-[var(--color-placeholder)]` | Cambiar a `PageDescription`/`--color-description`. | Alta | Bajo |
| `src/components/checkout/CheckoutForm.tsx` | Formulario checkout | Segmentado boleta/factura usa color fijo y blanco. | `bg-[#F2A359] text-white`, `rounded-full` | Crear `SegmentedControl` con `--color-primary`. | Alta | Medio |
| `src/components/checkout/OrderSummary.tsx` | Resumen checkout | Cards internas y total estan locales. | `rounded-[1.4rem]`, `bg-[color-mix(...)]`, `rounded-[1.5rem]` | Reusar `OrderLineItem`, `TotalPanel`, `AppCard`. | Media | Bajo |
| `src/app/(store)/cotizar/page.tsx` | Pagina cotizacion | Sigue patron comun pero local. | `text-4xl`, `text-base leading-8 text-[var(--color-muted)]` | Usar `PageHeader` con `PageTitle` y `PageDescription`. | Alta | Bajo |
| `src/components/forms/QuoteForm.tsx` | Formulario cotizacion | Usa inputs globales, pero no tiene labels visibles ni descripcion semantica. | inputs solo con `placeholder`, `panel-card rounded-[2rem]` | Crear `FormField` con label/ayuda y `FormCard`. | Media | Medio |
| `src/app/(store)/faq/page.tsx` | FAQ | Titulos y respuestas locales. | `text-4xl`, `text-xl`, `text-sm leading-7 text-[var(--color-muted)]` | Usar `PageHeader`, `FAQItem`, `SectionDescription`. | Media | Bajo |
| `src/app/(store)/contacto/page.tsx` | Contacto | Paneles similares con radios locales y texto muted. | `panel-card rounded-[2rem]`, `surface-card rounded-[1.5rem]` | Usar `PageSection`, `InfoCard`, `SectionTitle`. | Media | Bajo |
| `src/app/(store)/nosotros/page.tsx` | Nosotros | Pagina simple con patron repetido. | `text-4xl`, `text-base leading-8 text-[var(--color-muted)]` | Migrar a `PageHeader`. | Media | Bajo |
| `src/app/(store)/despachos/page.tsx` | Despachos | Descripcion larga usa `text-sm` aunque es cuerpo principal. | `text-sm leading-8 text-[var(--color-muted)]` | Usar `RichTextBody` o `PageDescription`. | Media | Bajo |
| `src/components/auth/EmailAuthForm.tsx` | Login segmentado | Usa color primario hardcodeado y `text-white`. | `bg-[#F2A359] text-white` | Migrar a `SegmentedControl`; no tocar auth logic. | Alta | Medio |
| `src/app/(auth)/login/page.tsx` | Login page | Card y titulo locales, descripcion usa muted no administrable. | `rounded-[2rem]`, `text-3xl sm:text-4xl`, `text-[var(--color-muted)]` | Usar `AuthCard`, `PageTitle`, `DescriptionText`; no tocar auth logic. | Media | Bajo |
| `src/components/feedback/StatusBadge.tsx` | Badges de estado | Mejor centralizacion que `AvailabilityBadge`, pero tonos estan como strings de clase. | `border-[color-mix(...)]`, `bg-[color-mix(...)]` | Convertir a `Badge tone="success"` con clases/tokens semanticos. | Alta | Medio |
| `src/components/feedback/EmptyState.tsx` | Empty state | Reusable, pero no usa tokens tipograficos semanticos. | `text-2xl`, `text-sm leading-7` | Mantener componente y ajustar internamente a tokens. | Alta | Bajo |
| `src/app/(account)/mi-cuenta/page.tsx` | Cuenta dashboard | Repite titulo/descripcion/cards locales. | `text-4xl`, `text-base`, `rounded-[1.75rem]` | Usar `PageHeader`, `DashboardCard`, `MutedText`. | Media | Bajo |
| `src/app/(account)/mi-cuenta/pedidos/page.tsx` | Historial pedidos | Misma estructura de titulo y cards locales. | `text-4xl`, `surface-card rounded-[1.5rem]` | Usar `PageHeader`, `OrderCard`. | Media | Bajo |
| `src/app/(account)/mi-cuenta/pedidos/[orderNumber]/page.tsx` | Detalle pedido | Secciones y resumen se parecen a checkout pero no comparten componentes. | `text-4xl`, `text-2xl`, `panel-card rounded-[2rem]` | Reusar `OrderSummaryBlock`, `OrderLineItem`, `PageHeader`. | Media | Medio |
| `src/components/account/ProfileForm.tsx` | Perfil | Formulario comparte estilos, pero titulos/descripciones locales. | `text-2xl`, `text-sm leading-7 text-[var(--color-muted)]` | Usar `FormCard`, `FormTitle`, `FormDescription`. | Media | Bajo |
| `src/app/(admin)/admin/layout.tsx` | Sidebar admin | Usa tokens admin, pero nav link/card son locales. | `rounded-[0.75rem]`, `text-xs`, `text-sm`, `bg-[var(--color-surface-strong)]` | Crear `AdminSidebar`, `AdminNavLink`, `AdminUserCard`. | Media | Medio |
| `src/app/(admin)/admin/page.tsx` | Dashboard admin | Cards y titulos repetidos. | `text-4xl`, `text-3xl`, `rounded-[1.75rem]` | Usar `AdminPageHeader`, `MetricCard`, `AdminPanel`. | Alta | Medio |
| `src/app/(admin)/admin/productos/page.tsx` | Admin productos | Mayor densidad de estilos locales, chips, alerts y cards. | `rounded-[1.75rem]`, `rounded-[1.25rem]`, alert `color-mix` | Migrar despues de shared components; dividir en `AdminProductCard`, `Alert`, `FilterPanel`. | Alta | Alto |
| `src/app/(admin)/admin/categorias/page.tsx` | Admin categorias | Similar a productos, con badges y metric cards locales. | `rounded-[1.5rem]`, `bg-[color-mix(...)]`, `text-xl` | Crear `AdminEntityCard`, `MetricCard`, `Alert`. | Alta | Alto |
| `src/app/(admin)/admin/pedidos/page.tsx` | Admin pedidos | Pantalla mas compleja; muchos radios pequenos y paneles internos. | `rounded-[0.85rem]`, `rounded-[1rem]`, muchos `text-xs/text-sm` | Auditar por separado antes de tocar; migracion por subcomponentes. | Alta | Alto |
| `src/components/admin/ProductForm.tsx` | Form producto | Gran formulario con buenos `form-input`, pero labels/help/cards locales. | `text-sm font-semibold`, `rounded-[1.5rem]`, alerts `color-mix` | Crear `FormSection`, `FormField`, `Alert`, `SidePanel`. | Alta | Alto |
| `src/components/admin/CategoryForm.tsx` | Form categoria | Mismos patrones que ProductForm. | `rounded-[1.25rem]`, `text-sm`, `text-xs` | Reusar componentes de formulario admin. | Alta | Medio |
| `src/components/admin/AdminDataTable.tsx` | Tabla admin | Centralizado pero estilos directos. | `rounded-[1.75rem]`, `text-sm`, `bg-[var(--color-surface-strong)]` | Convertir a `DataTable` tokenizado con variantes. | Media | Medio |
| `src/components/admin/appearance/AppearanceSettingsForm.tsx` | Admin apariencia | Buena referencia de tokens; contiene preview con `style` visual justificado. | `style={previewStyle}`, muchas clases tokenizadas | Mantener como excepcion controlada; extraer `FormSection` si se comparte. | Baja | Medio |

## 5. Top 10 cambios recomendados

1. Definir en `globals.css` una capa semantica: `.page-title`, `.section-title`, `.card-title`, `.description-text`, `.muted-text`, `.price-text`, `.app-card`, `.form-card`, `.status-badge`.
2. Extender `applyAppearanceSettings.ts` para cubrir tokens que ya consume la UI pero que Admin > Apariencia no actualiza: muted, surface, input, badge y hero.
3. Crear componentes base: `PageHeader`, `PageTitle`, `PageDescription`, `SectionTitle`, `SectionDescription`, `MutedText`.
4. Crear componentes de accion: `PrimaryButton`, `SecondaryButton`, `GhostButton`, `DangerButton`, `IconButton`, manteniendo compatibilidad con `.button-primary` y `.button-secondary`.
5. Crear componentes de superficie: `AppCard`, `PanelCard`, `MetricCard`, `InfoCard`, `TotalPanel`.
6. Unificar badges: convertir `AvailabilityBadge` y `StatusBadge` en una API comun `Badge tone/status`.
7. Crear `SegmentedControl` para login y checkout, reemplazando `bg-[#F2A359] text-white`.
8. Normalizar `ProductCard`, `HeroCarousel` y detalle de producto con `ProductTitle`, `ProductDescription`, `PriceText`.
9. Migrar headers de paginas de tienda, cuenta, checkout, cotizacion, FAQ, contacto y admin a `PageHeader`.
10. Reestructurar admin por subcomponentes, empezando por componentes compartidos y dejando `admin/pedidos` para el final por complejidad.

## 6. Componentes reutilizables propuestos

- `PageHeader`: recibe `kicker`, `title`, `description`, `actions`.
- `PageTitle`: usa `--font-size-page-title`, `--color-heading`, responsive controlado.
- `SectionTitle`: usa `--font-size-section-title`.
- `SectionDescription`: texto descriptivo principal, no `placeholder`.
- `CardTitle`: titulo compacto para cards y paneles.
- `ProductTitle`: titulo de producto, ajustado a cards y detalle.
- `MutedText`: texto secundario o ayuda.
- `PriceText`: precio con `--color-price` y tamanos por variante.
- `PrimaryButton`, `SecondaryButton`, `DangerButton`, `IconButton`.
- `AppCard`, `PanelCard`, `MetricCard`, `InfoCard`, `FormCard`.
- `FormField`, `FormInput`, `FormTextarea`, `FormSelect`, `FieldError`, `FieldHelp`.
- `Badge` y `StatusBadge` como wrapper especializado.
- `SegmentedControl`.
- `Alert` con tonos `success`, `warning`, `danger`, `info`.
- `DataTable`.

## 7. Archivos que NO se deben tocar todavia

No tocar en la proxima implementacion de semantica visual:

- `hubcafe-backend/**`
- `server/**`
- `src/modules/payments/**`
- `src/app/api/payments/**`
- `src/modules/payments/providers/flow/**`
- `src/app/api/payments/flow/**`
- `src/app/(store)/checkout/page.tsx` y `src/components/checkout/**` hasta que existan componentes visuales base, para no mezclar UI con flujo de compra.
- `src/modules/checkout/**`
- `src/modules/orders/**`
- `src/lib/env.ts`
- `supabase/**`
- `src/app/(auth)/**` y `src/components/auth/**` salvo una tarea explicitamente visual sobre el segmented control.
- `src/components/home/CategoriesGrid.tsx`: fue eliminado intencionalmente; no restaurar.

## 8. Criterios de aceptacion para la proxima implementacion

- Los cambios deben ser visuales/semanticos, sin modificar datos, auth, checkout, pagos ni Supabase.
- `PageHeader` debe cubrir al menos tienda, cuenta, admin, checkout, cotizacion y paginas informativas.
- Titulos principales no deben repetir `text-4xl` directamente en paginas nuevas o migradas.
- Descripciones no deben usar `--color-placeholder`.
- Botones primarios/secundarios deben salir de un componente o clase global consistente.
- Segmentados de login/checkout deben usar `--color-primary` y `--color-primary-foreground`, sin `bg-[#F2A359] text-white`.
- Badges deben usar una API unica de tonos y responder a los tokens de estado.
- Cards deben usar radios/sombras tokenizados, no `rounded-[2rem]` repetido pagina por pagina.
- Inputs deben seguir `form-input` o componentes derivados.
- Modo claro/oscuro debe conservar contraste en paginas migradas.
- Admin > Apariencia debe seguir funcionando y ampliar su impacto sin romper defaults.
- Validaciones minimas: `npm run -s lint`, `npx tsc --noEmit --incremental false`, `git diff --check`.

## 9. Plan por etapas

### Etapa 1: Fundacion semantica

- Agregar clases/tokens semanticos globales.
- Crear componentes visuales base sin migrar pantallas complejas.
- Extender mapeo de Admin > Apariencia para tokens ya consumidos.
- Verificar contrastes claro/oscuro en home, tienda y admin apariencia.

### Etapa 2: Superficies compartidas

- Migrar `EmptyState`, `StatusBadge`, `AvailabilityBadge`, `PriceTag`, `AdminDataTable`.
- Crear `SegmentedControl` y reemplazar duplicados en auth/checkout solo si la tarea lo permite.
- Migrar `ProductCard`, `CatalogFilters`, `CoffeeSupplyFilterBar`.

### Etapa 3: Storefront

- Migrar home, tienda, detalle producto, cotizar, FAQ, contacto, nosotros y despachos a `PageHeader` y componentes semanticos.
- Normalizar cards, precios, textos secundarios y CTA.
- Revisar que el color principal de Admin > Apariencia afecte CTAs y links de tienda.

### Etapa 4: Cuenta y carrito

- Migrar Mi cuenta, historial y detalle de pedido.
- Crear `OrderCard`, `OrderLineItem`, `TotalPanel`, `QuantityStepper`.
- Mantener carrito/checkout sin tocar logica de compra.

### Etapa 5: Admin

- Migrar layout admin y dashboard.
- Extraer `MetricCard`, `AdminEntityCard`, `FilterPanel`, `Alert`, `FormSection`.
- Dejar `admin/pedidos` para el final por ser la pantalla mas densa y con mayor riesgo visual.

## 10. Observaciones finales

La app esta cerca de tener un sistema visual administrable, pero la capa semantica aun vive dispersa en clases Tailwind locales. El siguiente paso no deberia ser reemplazar todas las clases de golpe, sino crear los nombres correctos para los roles visuales y migrar las superficies compartidas primero. Esa ruta permite que Admin > Apariencia deje de ser un set parcial de colores y se convierta en una configuracion coherente de interfaz.
