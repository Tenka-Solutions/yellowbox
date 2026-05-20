import type { AppearanceSettings } from "@/modules/appearance/types";

export const SITE_APPEARANCE_KEY = "hubcafe";

export const BORDER_RADIUS_OPTIONS = [
  { label: "Recto", value: "0rem" },
  { label: "Sutil", value: "0.5rem" },
  { label: "Suave", value: "0.75rem" },
  { label: "Medio", value: "1.25rem" },
  { label: "Grande", value: "1.8rem" },
  { label: "Extra grande", value: "2.25rem" },
] as const;

export const BORDER_WIDTH_OPTIONS = [
  { label: "Fino", value: "1px" },
  { label: "Medio", value: "2px" },
  { label: "Marcado", value: "3px" },
] as const;

export const TYPOGRAPHY_SIZE_OPTIONS = [
  { label: "XS", value: "0.75rem" },
  { label: "Pequeno", value: "0.875rem" },
  { label: "Base", value: "1rem" },
  { label: "Medio", value: "1.125rem" },
  { label: "Grande", value: "1.25rem" },
  { label: "Titulo seccion", value: "1.5rem" },
  { label: "Titulo", value: "2rem" },
  { label: "Titulo principal", value: "2.25rem" },
  { label: "Hero", value: "2.75rem" },
] as const;

export const SHADOW_PRESET_OPTIONS = [
  { label: "Sin sombra", value: "none" },
  {
    label: "Tarjeta clara",
    value: "0 18px 45px -38px rgba(35, 45, 47, 0.16)",
  },
  {
    label: "Suave clara",
    value: "0 24px 60px -42px rgba(35, 45, 47, 0.18)",
  },
  {
    label: "Boton claro",
    value: "0 18px 34px -24px rgba(204, 131, 40, 0.38)",
  },
  {
    label: "Tarjeta oscura",
    value: "0 20px 50px -36px rgba(0, 0, 0, 0.7)",
  },
  {
    label: "Suave oscura",
    value: "0 30px 70px -42px rgba(0, 0, 0, 0.75)",
  },
  {
    label: "Boton oscuro",
    value: "0 18px 34px -24px rgba(204, 131, 40, 0.42)",
  },
  {
    label: "Definida",
    value: "0 20px 42px -28px rgba(35, 45, 47, 0.32)",
  },
] as const;

export const defaultAppearanceSettings: AppearanceSettings = {
  version: 1,
  light: {
    background: "#FFFFFF",
    foreground: "#232D2F",
    heading: "#232D2F",
    card: "#FFFFFF",
    border: "#E6D7CC",
    primary: "#CC8328",
    primaryHover: "#B47122",
    headerBackground: "#FFFFFF",
    headerText: "#232D2F",
    link: "#7C4E18",
    price: "#CC8328",
  },
  dark: {
    background: "#232D2F",
    foreground: "#F6E7DA",
    heading: "#F6E7DA",
    card: "#2B3437",
    border: "#725B60",
    primary: "#CC8328",
    primaryHover: "#E09A3A",
    headerBackground: "#232D2F",
    headerText: "#F6E7DA",
    link: "#E4C3AD",
    price: "#E09A3A",
  },
  footer: {
    light: {
      background: "#232D2F",
      foreground: "#FFFFFF",
      muted: "#E4C3AD",
    },
    dark: {
      background: "#1D2628",
      foreground: "#F6E7DA",
      muted: "#D8B9A5",
    },
  },
  borders: {
    radiusSmall: "0.75rem",
    radiusMedium: "1.25rem",
    radiusLarge: "1.8rem",
    borderWidth: "1px",
  },
  typography: {
    base: "1rem",
    small: "0.875rem",
    sectionTitle: "1.5rem",
    pageTitle: "2.25rem",
    navigation: "0.875rem",
  },
  shadows: {
    light: {
      card: "0 18px 45px -38px rgba(35, 45, 47, 0.16)",
      button: "0 18px 34px -24px rgba(204, 131, 40, 0.38)",
      soft: "0 24px 60px -42px rgba(35, 45, 47, 0.18)",
    },
    dark: {
      card: "0 20px 50px -36px rgba(0, 0, 0, 0.7)",
      button: "0 18px 34px -24px rgba(204, 131, 40, 0.42)",
      soft: "0 30px 70px -42px rgba(0, 0, 0, 0.75)",
    },
  },
};
