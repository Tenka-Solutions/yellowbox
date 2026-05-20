export type AppearanceThemeMode = "light" | "dark";

export type AppearanceModeSettings = {
  background: string;
  foreground: string;
  heading: string;
  card: string;
  border: string;
  primary: string;
  primaryHover: string;
  headerBackground: string;
  headerText: string;
  link: string;
  price: string;
};

export type AppearanceFooterSettings = {
  background: string;
  foreground: string;
  muted: string;
};

export type AppearanceBorderSettings = {
  radiusSmall: string;
  radiusMedium: string;
  radiusLarge: string;
  borderWidth: string;
};

export type AppearanceTypographySettings = {
  base: string;
  small: string;
  sectionTitle: string;
  pageTitle: string;
  navigation: string;
};

export type AppearanceShadowSettings = {
  card: string;
  button: string;
  soft: string;
};

export type AppearanceSettings = {
  version: 1;
  light: AppearanceModeSettings;
  dark: AppearanceModeSettings;
  footer: Record<AppearanceThemeMode, AppearanceFooterSettings>;
  borders: AppearanceBorderSettings;
  typography: AppearanceTypographySettings;
  shadows: Record<AppearanceThemeMode, AppearanceShadowSettings>;
};

export type AppearanceFieldErrors = Record<string, string>;

export type AppearanceValidationResult =
  | {
      success: true;
      settings: AppearanceSettings;
    }
  | {
      success: false;
      fieldErrors: AppearanceFieldErrors;
    };
