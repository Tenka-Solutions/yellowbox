import {
  BORDER_RADIUS_OPTIONS,
  BORDER_WIDTH_OPTIONS,
  SHADOW_PRESET_OPTIONS,
  TYPOGRAPHY_SIZE_OPTIONS,
  defaultAppearanceSettings,
} from "@/modules/appearance/defaultAppearanceSettings";
import type {
  AppearanceBorderSettings,
  AppearanceFieldErrors,
  AppearanceFooterSettings,
  AppearanceModeSettings,
  AppearanceSettings,
  AppearanceShadowSettings,
  AppearanceThemeMode,
  AppearanceTypographySettings,
  AppearanceValidationResult,
} from "@/modules/appearance/types";

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const colorFields: Array<keyof AppearanceModeSettings> = [
  "background",
  "foreground",
  "heading",
  "card",
  "border",
  "primary",
  "primaryHover",
  "headerBackground",
  "headerText",
  "link",
  "price",
];
const footerFields: Array<keyof AppearanceFooterSettings> = [
  "background",
  "foreground",
  "muted",
];
const borderFields: Array<keyof AppearanceBorderSettings> = [
  "radiusSmall",
  "radiusMedium",
  "radiusLarge",
  "borderWidth",
];
const typographyFields: Array<keyof AppearanceTypographySettings> = [
  "base",
  "small",
  "sectionTitle",
  "pageTitle",
  "navigation",
];
const shadowFields: Array<keyof AppearanceShadowSettings> = [
  "card",
  "button",
  "soft",
];

const radiusValues = new Set(BORDER_RADIUS_OPTIONS.map((option) => option.value));
const borderWidthValues = new Set(
  BORDER_WIDTH_OPTIONS.map((option) => option.value)
);
const typographyValues = new Set(
  TYPOGRAPHY_SIZE_OPTIONS.map((option) => option.value)
);
const shadowValues = new Set(SHADOW_PRESET_OPTIONS.map((option) => option.value));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHexColor(
  value: unknown,
  fallback: string,
  path: string,
  errors: AppearanceFieldErrors
) {
  if (typeof value !== "string" || !value.trim()) {
    errors[path] = "Ingresa un color HEX valido.";
    return fallback;
  }

  const nextValue = value.trim().toUpperCase();

  if (!HEX_COLOR_PATTERN.test(nextValue)) {
    errors[path] = "Usa formato #RRGGBB.";
    return fallback;
  }

  return nextValue;
}

function readOption(
  value: unknown,
  fallback: string,
  allowedValues: Set<string>,
  path: string,
  errors: AppearanceFieldErrors
) {
  if (typeof value !== "string" || !value.trim()) {
    errors[path] = "Selecciona un valor.";
    return fallback;
  }

  const nextValue = value.trim();

  if (!allowedValues.has(nextValue)) {
    errors[path] = "Valor fuera del rango permitido.";
    return fallback;
  }

  return nextValue;
}

function readThemeSettings(
  value: unknown,
  mode: AppearanceThemeMode,
  errors: AppearanceFieldErrors
): AppearanceModeSettings {
  const source = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    errors[mode] = "Configuracion de modo invalida.";
  }

  return colorFields.reduce((settings, field) => {
    settings[field] = normalizeHexColor(
      source[field],
      defaultAppearanceSettings[mode][field],
      `${mode}.${field}`,
      errors
    );

    return settings;
  }, {} as AppearanceModeSettings);
}

function readFooterSettings(
  value: unknown,
  mode: AppearanceThemeMode,
  errors: AppearanceFieldErrors
): AppearanceFooterSettings {
  const source = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    errors[`footer.${mode}`] = "Configuracion de footer invalida.";
  }

  return footerFields.reduce((settings, field) => {
    settings[field] = normalizeHexColor(
      source[field],
      defaultAppearanceSettings.footer[mode][field],
      `footer.${mode}.${field}`,
      errors
    );

    return settings;
  }, {} as AppearanceFooterSettings);
}

function readBorderSettings(
  value: unknown,
  errors: AppearanceFieldErrors
): AppearanceBorderSettings {
  const source = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    errors.borders = "Configuracion de bordes invalida.";
  }

  return borderFields.reduce((settings, field) => {
    const allowedValues =
      field === "borderWidth" ? borderWidthValues : radiusValues;

    settings[field] = readOption(
      source[field],
      defaultAppearanceSettings.borders[field],
      allowedValues,
      `borders.${field}`,
      errors
    );

    return settings;
  }, {} as AppearanceBorderSettings);
}

function readTypographySettings(
  value: unknown,
  errors: AppearanceFieldErrors
): AppearanceTypographySettings {
  const source = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    errors.typography = "Configuracion de tipografia invalida.";
  }

  return typographyFields.reduce((settings, field) => {
    settings[field] = readOption(
      source[field],
      defaultAppearanceSettings.typography[field],
      typographyValues,
      `typography.${field}`,
      errors
    );

    return settings;
  }, {} as AppearanceTypographySettings);
}

function readShadowSettings(
  value: unknown,
  mode: AppearanceThemeMode,
  errors: AppearanceFieldErrors
): AppearanceShadowSettings {
  const source = isRecord(value) ? value : {};

  if (!isRecord(value)) {
    errors[`shadows.${mode}`] = "Configuracion de sombras invalida.";
  }

  return shadowFields.reduce((settings, field) => {
    settings[field] = readOption(
      source[field],
      defaultAppearanceSettings.shadows[mode][field],
      shadowValues,
      `shadows.${mode}.${field}`,
      errors
    );

    return settings;
  }, {} as AppearanceShadowSettings);
}

export function validateAppearanceSettings(
  value: unknown
): AppearanceValidationResult {
  const errors: AppearanceFieldErrors = {};

  if (!isRecord(value)) {
    return {
      success: false,
      fieldErrors: {
        settings: "La configuracion debe ser un objeto controlado.",
      },
    };
  }

  const footerSource = isRecord(value.footer) ? value.footer : {};
  const shadowsSource = isRecord(value.shadows) ? value.shadows : {};

  if (value.version !== 1) {
    errors.version = "Version de apariencia no soportada.";
  }

  const settings: AppearanceSettings = {
    version: 1,
    light: readThemeSettings(value.light, "light", errors),
    dark: readThemeSettings(value.dark, "dark", errors),
    footer: {
      light: readFooterSettings(footerSource.light, "light", errors),
      dark: readFooterSettings(footerSource.dark, "dark", errors),
    },
    borders: readBorderSettings(value.borders, errors),
    typography: readTypographySettings(value.typography, errors),
    shadows: {
      light: readShadowSettings(shadowsSource.light, "light", errors),
      dark: readShadowSettings(shadowsSource.dark, "dark", errors),
    },
  };

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      fieldErrors: errors,
    };
  }

  return {
    success: true,
    settings,
  };
}

export function getSafeAppearanceSettings(value: unknown): AppearanceSettings {
  const validation = validateAppearanceSettings(value);

  return validation.success ? validation.settings : defaultAppearanceSettings;
}
