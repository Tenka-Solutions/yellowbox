export const siteConfig = {
  name: "SMK Vending",
  defaultTitle: "SMK Vending | Ecommerce de café, máquinas e insumos",
  description:
    "Ecommerce profesional de máquinas de café, café en grano, café instantáneo, vasos e insumos para oficinas, cafeterías, retail y negocios en Chile.",
  keywords: [
    "SMK Vending",
    "máquinas de café Chile",
    "café en grano",
    "café instantáneo",
    "vasos horeca",
    "insumos vending",
    "equipamiento cafetería",
    "tienda vending Chile",
  ],
  contact: {
    salesEmail: "ventas@smkvending.cl",
    supportEmail: "ventas@smkvending.cl",
    phone: "",
    region: "Chile",
  },
  trustSignals: [
    "Pago seguro y validado en backend",
    "Precios en CLP con IVA incluido",
    "Despacho coordinado para todo Chile",
    "Catálogo listo para compra directa y cotización",
  ],
  businessSegments: [
    "Empresas y oficinas",
    "Cafeterías",
    "Minimarkets",
    "Negocios y retail",
  ],
};

export const publicNavigation = [
  { href: "/tienda", label: "Tienda" },
  { href: "/categorias/maquinas", label: "Máquinas" },
  { href: "/categorias/cafe-insumos", label: "Café e insumos" },
  { href: "/categorias/vasos-accesorios", label: "Vasos y accesorios" },
  { href: "/cotizar", label: "Cotizar" },
  { href: "/contacto", label: "Contacto" },
];

export const adminNavigation = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/cotizaciones", label: "Cotizaciones" },
  { href: "/admin/apariencia", label: "Apariencia" },
  { href: "/admin/usuarios", label: "Usuarios" },
];
