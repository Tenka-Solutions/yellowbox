import type {
  AppearanceSettings,
  AppearanceThemeMode,
} from "@/modules/appearance/types";

type CssVariableMap = Record<`--${string}`, string>;

function getReadableTextColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.58 ? "#232D2F" : "#FFFFFF";
}

export function getCurrentAppearanceMode(): AppearanceThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function getAppearanceCssVariables(
  settings: AppearanceSettings,
  mode: AppearanceThemeMode
): CssVariableMap {
  const colors = settings[mode];
  const footer = settings.footer[mode];
  const shadows = settings.shadows[mode];
  const primaryForeground = getReadableTextColor(colors.primary);

  return {
    "--color-background": colors.background,
    "--color-foreground": colors.foreground,
    "--color-heading": colors.heading,
    "--color-card": colors.card,
    "--color-card-foreground": colors.foreground,
    "--color-border": colors.border,
    "--color-primary": colors.primary,
    "--color-primary-hover": colors.primaryHover,
    "--color-primary-foreground": primaryForeground,
    "--color-header": colors.headerBackground,
    "--color-header-foreground": colors.headerText,
    "--color-header-muted": colors.headerText,
    "--color-link": colors.link,
    "--color-link-hover": colors.primaryHover,
    "--color-price": colors.price,
    "--color-footer": footer.background,
    "--color-footer-foreground": footer.foreground,
    "--color-footer-muted": footer.muted,
    "--color-admin-background": colors.background,
    "--color-admin-card": colors.card,
    "--color-admin-foreground": colors.foreground,
    "--color-admin-muted": colors.foreground,
    "--color-admin-border": colors.border,
    "--color-admin-link": colors.link,
    "--color-admin-link-hover": colors.primaryHover,
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--border": colors.border,
    "--primary": colors.primary,
    "--primary-hover": colors.primaryHover,
    "--card": colors.card,
    "--card-foreground": colors.foreground,
    "--color-page": colors.background,
    "--color-ink": colors.foreground,
    "--color-dark": colors.heading,
    "--color-gold": colors.primary,
    "--color-accent": colors.primary,
    "--color-accent-strong": colors.primaryHover,
    "--radius-small": settings.borders.radiusSmall,
    "--radius-medium": settings.borders.radiusMedium,
    "--radius-large": settings.borders.radiusLarge,
    "--border-width-base": settings.borders.borderWidth,
    "--font-size-base": settings.typography.base,
    "--font-size-small": settings.typography.small,
    "--font-size-section-title": settings.typography.sectionTitle,
    "--font-size-page-title": settings.typography.pageTitle,
    "--font-size-navigation": settings.typography.navigation,
    "--shadow-card": shadows.card,
    "--shadow-button": shadows.button,
    "--shadow-soft": shadows.soft,
  };
}

export function applyAppearanceSettings(
  settings: AppearanceSettings,
  target?: HTMLElement,
  mode = getCurrentAppearanceMode()
) {
  if (typeof document === "undefined" && !target) {
    return;
  }

  const element = target ?? document.documentElement;
  const variables = getAppearanceCssVariables(settings, mode);

  Object.entries(variables).forEach(([name, value]) => {
    element.style.setProperty(name, value);
  });
}
