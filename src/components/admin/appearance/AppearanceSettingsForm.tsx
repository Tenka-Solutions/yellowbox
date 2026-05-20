"use client";

import type { CSSProperties } from "react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  restoreAppearanceDefaultsAction,
  saveAppearanceSettingsAction,
} from "@/app/(admin)/admin/apariencia/actions";
import type { AppearanceActionState } from "@/app/(admin)/admin/apariencia/actions";
import {
  BORDER_RADIUS_OPTIONS,
  BORDER_WIDTH_OPTIONS,
  SHADOW_PRESET_OPTIONS,
  TYPOGRAPHY_SIZE_OPTIONS,
} from "@/modules/appearance/defaultAppearanceSettings";
import {
  applyAppearanceSettings,
  getAppearanceCssVariables,
} from "@/modules/appearance/applyAppearanceSettings";
import type {
  AppearanceBorderSettings,
  AppearanceFieldErrors,
  AppearanceFooterSettings,
  AppearanceModeSettings,
  AppearanceSettings,
  AppearanceShadowSettings,
  AppearanceThemeMode,
  AppearanceTypographySettings,
} from "@/modules/appearance/types";

type AppearanceSource = "supabase" | "defaults" | "unavailable";

type Option = {
  label: string;
  value: string;
};

const initialActionState: AppearanceActionState = {
  status: "idle",
};

const modeLabels: Record<AppearanceThemeMode, string> = {
  light: "Claro",
  dark: "Oscuro",
};

const sourceLabels: Record<AppearanceSource, string> = {
  supabase: "Supabase",
  defaults: "Defaults locales",
  unavailable: "Defaults locales",
};

const baseColorFields: Array<{
  key: keyof AppearanceModeSettings;
  label: string;
}> = [
  { key: "background", label: "Fondo general" },
  { key: "foreground", label: "Texto principal" },
  { key: "heading", label: "Titulos" },
  { key: "card", label: "Fondo de tarjetas" },
  { key: "border", label: "Bordes" },
  { key: "primary", label: "Color principal" },
  { key: "primaryHover", label: "Principal hover" },
];

const headerColorFields: Array<{
  key: keyof AppearanceModeSettings;
  label: string;
}> = [
  { key: "headerBackground", label: "Fondo header/nav" },
  { key: "headerText", label: "Texto header/nav" },
  { key: "link", label: "Links" },
  { key: "price", label: "Precio/destacados" },
];

const footerFields: Array<{
  key: keyof AppearanceFooterSettings;
  label: string;
}> = [
  { key: "background", label: "Fondo footer" },
  { key: "foreground", label: "Texto footer" },
  { key: "muted", label: "Texto secundario footer" },
];

const borderFields: Array<{
  key: keyof AppearanceBorderSettings;
  label: string;
  options: readonly Option[];
}> = [
  { key: "radiusSmall", label: "Radio pequeno", options: BORDER_RADIUS_OPTIONS },
  { key: "radiusMedium", label: "Radio mediano", options: BORDER_RADIUS_OPTIONS },
  { key: "radiusLarge", label: "Radio grande", options: BORDER_RADIUS_OPTIONS },
  { key: "borderWidth", label: "Grosor de borde base", options: BORDER_WIDTH_OPTIONS },
];

const typographyFields: Array<{
  key: keyof AppearanceTypographySettings;
  label: string;
}> = [
  { key: "base", label: "Texto base" },
  { key: "small", label: "Texto pequeno" },
  { key: "sectionTitle", label: "Titulos seccion" },
  { key: "pageTitle", label: "Titulos principales" },
  { key: "navigation", label: "Navegacion" },
];

const shadowFields: Array<{
  key: keyof AppearanceShadowSettings;
  label: string;
}> = [
  { key: "card", label: "Sombra de tarjetas" },
  { key: "button", label: "Sombra de botones" },
  { key: "soft", label: "Sombra suave general" },
];

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Sin guardar";
  }

  return value.slice(0, 16).replace("T", " ");
}

function normalizeHexTyping(value: string) {
  const nextValue = value.trim().toUpperCase();

  if (!nextValue) {
    return "";
  }

  return nextValue.startsWith("#") ? nextValue : `#${nextValue}`;
}

function getColorInputValue(value: string) {
  return /^#[0-9A-F]{6}$/i.test(value) ? value : "#000000";
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-[var(--color-danger)]">{message}</p>;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="button-primary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-5 sm:p-6">
      <h2 className="text-[length:var(--font-size-section-title)] font-semibold">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ColorControl({
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
        <input
          type="color"
          value={getColorInputValue(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-11 rounded-[var(--radius-small)] border border-[var(--color-border)] bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          maxLength={7}
          pattern="#[0-9A-Fa-f]{6}"
          disabled={disabled}
          onChange={(event) => onChange(normalizeHexTyping(event.target.value))}
          className="form-input form-input-compact font-mono uppercase"
          placeholder="#CC8328"
        />
      </div>
      <FieldError message={error} />
    </label>
  );
}

function SelectControl({
  label,
  value,
  options,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="form-input form-input-compact"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </label>
  );
}

function ModeColorSection({
  mode,
  settings,
  fieldErrors,
  disabled,
  fields,
  onChange,
}: {
  mode: AppearanceThemeMode;
  settings: AppearanceModeSettings;
  fieldErrors?: AppearanceFieldErrors;
  disabled: boolean;
  fields: typeof baseColorFields;
  onChange: (field: keyof AppearanceModeSettings, value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
        {modeLabels[mode]}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <ColorControl
            key={field.key}
            label={field.label}
            value={settings[field.key]}
            disabled={disabled}
            error={fieldErrors?.[`${mode}.${field.key}`]}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </div>
    </div>
  );
}

function AppearancePreview({
  settings,
  previewMode,
  onPreviewModeChange,
}: {
  settings: AppearanceSettings;
  previewMode: AppearanceThemeMode;
  onPreviewModeChange: (mode: AppearanceThemeMode) => void;
}) {
  const previewStyle = useMemo(
    () =>
      ({
        ...getAppearanceCssVariables(settings, previewMode),
        background: "var(--color-background)",
        color: "var(--color-foreground)",
      }) as CSSProperties,
    [previewMode, settings]
  );

  return (
    <div className="grid gap-4">
      <div className="inline-flex w-fit gap-1 rounded-[var(--radius-small)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-1">
        {(["light", "dark"] as AppearanceThemeMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={previewMode === mode}
            onClick={() => onPreviewModeChange(mode)}
            className={`rounded-[var(--radius-small)] px-3 py-1.5 text-xs font-semibold ${
              previewMode === mode
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "text-[var(--color-muted-foreground)]"
            }`}
          >
            {modeLabels[mode]}
          </button>
        ))}
      </div>

      <div
        style={previewStyle}
        className="overflow-hidden rounded-[var(--radius-large)] border border-[var(--color-border)] shadow-[var(--shadow-soft)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-header)] px-4 py-3 text-[var(--color-header-foreground)]">
          <p className="font-semibold">
            HUB<span className="text-[var(--color-primary)]">Cafe</span>
          </p>
          <div className="flex gap-3 text-[length:var(--font-size-navigation)] font-semibold">
            <span>Tienda</span>
            <span>Cotizar</span>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1fr_220px]">
          <div className="rounded-[var(--radius-large)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-[var(--color-card-foreground)] shadow-[var(--shadow-card)]">
            <p className="text-[length:var(--font-size-small)] font-semibold uppercase text-[var(--color-link)]">
              Cafe destacado
            </p>
            <h3 className="mt-2 text-[length:var(--font-size-section-title)] font-semibold text-[var(--color-heading)]">
              Blend oficina premium
            </h3>
            <p className="mt-3 text-[length:var(--font-size-base)] leading-7 text-[var(--color-foreground)]">
              Texto normal de producto con una descripcion breve para revisar
              contraste y lectura.
            </p>
            <p className="mt-4 text-xl font-bold text-[var(--color-price)]">
              $24.990
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="button-primary px-4 py-2">
                Comprar
              </button>
              <a className="font-semibold text-[var(--color-link)]" href="#">
                Ver detalle
              </a>
            </div>
          </div>

          <div className="rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <h4 className="text-[length:var(--font-size-page-title)] font-semibold leading-none text-[var(--color-heading)]">
              Titulo
            </h4>
            <p className="mt-3 text-[length:var(--font-size-small)] leading-6">
              Vista de botones, bordes, sombras y tamanos principales.
            </p>
          </div>
        </div>

        <div className="bg-[var(--color-footer)] px-4 py-3 text-[var(--color-footer-foreground)]">
          <p className="font-semibold">HubCafe</p>
          <p className="text-[length:var(--font-size-small)] text-[var(--color-footer-muted)]">
            Footer mini con texto secundario.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettingsForm({
  initialSettings,
  source,
  warning,
  updatedAt,
  canMutate,
}: {
  initialSettings: AppearanceSettings;
  source: AppearanceSource;
  warning?: string;
  updatedAt: string | null;
  canMutate: boolean;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [previewMode, setPreviewMode] = useState<AppearanceThemeMode>("light");
  const [restoreState, setRestoreState] = useState<AppearanceActionState | null>(
    null
  );
  const [isRestoring, startRestoreTransition] = useTransition();
  async function submitAppearanceSettings(
    previousState: AppearanceActionState,
    formData: FormData
  ) {
    const result = await saveAppearanceSettingsAction(previousState, formData);

    if (result.status === "success" && result.settings) {
      setSettings(result.settings);
      setSavedSettings(result.settings);
      applyAppearanceSettings(result.settings);
      setRestoreState(null);
    }

    return result;
  }

  const [actionState, formAction] = useActionState(
    submitAppearanceSettings,
    initialActionState
  );
  const serializedSettings = useMemo(
    () => JSON.stringify(settings),
    [settings]
  );
  const serializedSavedSettings = useMemo(
    () => JSON.stringify(savedSettings),
    [savedSettings]
  );
  const hasUnsavedChanges = serializedSettings !== serializedSavedSettings;
  const fieldErrors = actionState.fieldErrors;
  const visibleState =
    restoreState?.status === "success" || restoreState?.status === "error"
      ? restoreState
      : actionState.status === "idle"
        ? null
        : actionState;

  function updateModeField(
    mode: AppearanceThemeMode,
    field: keyof AppearanceModeSettings,
    value: string
  ) {
    setRestoreState(null);
    setSettings((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        [field]: value,
      },
    }));
  }

  function updateFooterField(
    mode: AppearanceThemeMode,
    field: keyof AppearanceFooterSettings,
    value: string
  ) {
    setRestoreState(null);
    setSettings((current) => ({
      ...current,
      footer: {
        ...current.footer,
        [mode]: {
          ...current.footer[mode],
          [field]: value,
        },
      },
    }));
  }

  function updateBorderField(
    field: keyof AppearanceBorderSettings,
    value: string
  ) {
    setRestoreState(null);
    setSettings((current) => ({
      ...current,
      borders: {
        ...current.borders,
        [field]: value,
      },
    }));
  }

  function updateTypographyField(
    field: keyof AppearanceTypographySettings,
    value: string
  ) {
    setRestoreState(null);
    setSettings((current) => ({
      ...current,
      typography: {
        ...current.typography,
        [field]: value,
      },
    }));
  }

  function updateShadowField(
    mode: AppearanceThemeMode,
    field: keyof AppearanceShadowSettings,
    value: string
  ) {
    setRestoreState(null);
    setSettings((current) => ({
      ...current,
      shadows: {
        ...current.shadows,
        [mode]: {
          ...current.shadows[mode],
          [field]: value,
        },
      },
    }));
  }

  function handleCancelChanges() {
    setSettings(savedSettings);
    setRestoreState({
      status: "success",
      message: "Cambios no guardados cancelados.",
    });
  }

  function handleRestoreDefaults() {
    if (!window.confirm("Restaurar los valores visuales por defecto?")) {
      return;
    }

    startRestoreTransition(async () => {
      const result = await restoreAppearanceDefaultsAction();
      setRestoreState(result);

      if (result.status === "success" && result.settings) {
        setSettings(result.settings);
        setSavedSettings(result.settings);
        applyAppearanceSettings(result.settings);
      }
    });
  }

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="settings" value={serializedSettings} />

      <section className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-1 text-sm text-[var(--color-muted-foreground)]">
            <p>
              Fuente:{" "}
              <span className="font-semibold text-[var(--color-ink)]">
                {sourceLabels[source]}
              </span>
            </p>
            <p>Ultima actualizacion: {formatUpdatedAt(updatedAt)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SubmitButton disabled={!canMutate} />
            <button
              type="button"
              disabled={!canMutate || isRestoring}
              onClick={handleRestoreDefaults}
              className="button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRestoring ? "Restaurando..." : "Restaurar valores por defecto"}
            </button>
            <button
              type="button"
              disabled={!hasUnsavedChanges}
              onClick={handleCancelChanges}
              className="button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar cambios no guardados
            </button>
          </div>
        </div>

        {!canMutate ? (
          <div className="mt-4 rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-surface-strong)] p-4 text-sm leading-7 text-[var(--color-muted-foreground)]">
            Tu rol puede ver esta configuracion, pero no modificarla.
          </div>
        ) : null}

        {warning ? (
          <div className="mt-4 rounded-[var(--radius-medium)] border border-[color-mix(in_srgb,var(--color-warning)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-warning)_14%,var(--color-card)_86%)] p-4 text-sm font-medium">
            {warning}
          </div>
        ) : null}

        {visibleState?.message ? (
          <div
            className={`mt-4 rounded-[var(--radius-medium)] border p-4 text-sm font-medium ${
              visibleState.status === "success"
                ? "border-[color-mix(in_srgb,var(--color-success)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-card)_86%)]"
                : "border-[color-mix(in_srgb,var(--color-danger)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_14%,var(--color-card)_86%)]"
            }`}
          >
            {visibleState.message}
          </div>
        ) : null}
      </section>

      <FormSection title="Modo claro">
        <ModeColorSection
          mode="light"
          settings={settings.light}
          fields={baseColorFields}
          fieldErrors={fieldErrors}
          disabled={!canMutate}
          onChange={(field, value) => updateModeField("light", field, value)}
        />
      </FormSection>

      <FormSection title="Modo oscuro">
        <ModeColorSection
          mode="dark"
          settings={settings.dark}
          fields={baseColorFields}
          fieldErrors={fieldErrors}
          disabled={!canMutate}
          onChange={(field, value) => updateModeField("dark", field, value)}
        />
      </FormSection>

      <FormSection title="Header y navegacion">
        <div className="grid gap-6 xl:grid-cols-2">
          {(["light", "dark"] as AppearanceThemeMode[]).map((mode) => (
            <ModeColorSection
              key={mode}
              mode={mode}
              settings={settings[mode]}
              fields={headerColorFields}
              fieldErrors={fieldErrors}
              disabled={!canMutate}
              onChange={(field, value) => updateModeField(mode, field, value)}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="Footer">
        <div className="grid gap-6 xl:grid-cols-2">
          {(["light", "dark"] as AppearanceThemeMode[]).map((mode) => (
            <div key={mode}>
              <p className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                {modeLabels[mode]}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                {footerFields.map((field) => (
                  <ColorControl
                    key={field.key}
                    label={field.label}
                    value={settings.footer[mode][field.key]}
                    disabled={!canMutate}
                    error={fieldErrors?.[`footer.${mode}.${field.key}`]}
                    onChange={(value) =>
                      updateFooterField(mode, field.key, value)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Bordes y esquinas">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {borderFields.map((field) => (
            <SelectControl
              key={field.key}
              label={field.label}
              value={settings.borders[field.key]}
              options={field.options}
              disabled={!canMutate}
              error={fieldErrors?.[`borders.${field.key}`]}
              onChange={(value) => updateBorderField(field.key, value)}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="Tipografia">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {typographyFields.map((field) => (
            <SelectControl
              key={field.key}
              label={field.label}
              value={settings.typography[field.key]}
              options={TYPOGRAPHY_SIZE_OPTIONS}
              disabled={!canMutate}
              error={fieldErrors?.[`typography.${field.key}`]}
              onChange={(value) => updateTypographyField(field.key, value)}
            />
          ))}
        </div>
      </FormSection>

      <FormSection title="Sombras">
        <div className="grid gap-6 xl:grid-cols-2">
          {(["light", "dark"] as AppearanceThemeMode[]).map((mode) => (
            <div key={mode}>
              <p className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                {modeLabels[mode]}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-1">
                {shadowFields.map((field) => (
                  <SelectControl
                    key={field.key}
                    label={field.label}
                    value={settings.shadows[mode][field.key]}
                    options={SHADOW_PRESET_OPTIONS}
                    disabled={!canMutate}
                    error={fieldErrors?.[`shadows.${mode}.${field.key}`]}
                    onChange={(value) =>
                      updateShadowField(mode, field.key, value)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Vista previa">
        <AppearancePreview
          settings={settings}
          previewMode={previewMode}
          onPreviewModeChange={setPreviewMode}
        />
      </FormSection>

      <section className="surface-card p-4 sm:p-5">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={!hasUnsavedChanges}
            onClick={handleCancelChanges}
            className="button-secondary px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar cambios no guardados
          </button>
          <SubmitButton disabled={!canMutate} />
        </div>
      </section>
    </form>
  );
}
