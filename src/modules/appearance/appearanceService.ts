import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRoles } from "@/modules/auth/server";
import {
  SITE_APPEARANCE_KEY,
  defaultAppearanceSettings,
} from "@/modules/appearance/defaultAppearanceSettings";
import {
  validateAppearanceSettings,
  getSafeAppearanceSettings,
} from "@/modules/appearance/validateAppearanceSettings";
import type {
  AppearanceFieldErrors,
  AppearanceSettings,
} from "@/modules/appearance/types";

const READ_ROLES = ["super_admin", "catalog_editor", "sales_manager"];
const MUTATION_ROLES = ["super_admin", "catalog_editor"];

export type AppearanceSettingsSource =
  | "supabase"
  | "defaults"
  | "unavailable";

export class AppearanceAdminError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors?: AppearanceFieldErrors
  ) {
    super(message);
    this.name = "AppearanceAdminError";
  }
}

function hasAnyRole(roles: string[], allowedRoles: string[]) {
  return roles.some((role) => allowedRoles.includes(role));
}

async function getReadContext() {
  const roles = await getAuthenticatedUserRoles();

  if (!hasAnyRole(roles, READ_ROLES)) {
    throw new AppearanceAdminError("No tienes permisos para ver apariencia.");
  }

  return {
    roles,
    canMutate: hasAnyRole(roles, MUTATION_ROLES),
  };
}

async function getMutationClient() {
  const roles = await getAuthenticatedUserRoles();

  if (!hasAnyRole(roles, MUTATION_ROLES)) {
    throw new AppearanceAdminError(
      "Solo super administradores o editores pueden modificar apariencia."
    );
  }

  const client = createSupabaseAdminClient();

  if (!client) {
    throw new AppearanceAdminError(
      "Supabase admin no esta configurado. Revisa SUPABASE_SERVICE_ROLE_KEY en el entorno servidor."
    );
  }

  return client;
}

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  const client = createSupabaseAdminClient();

  if (!client) {
    return defaultAppearanceSettings;
  }

  const { data, error } = await client
    .from("site_appearance_settings")
    .select("settings")
    .eq("site_key", SITE_APPEARANCE_KEY)
    .maybeSingle();

  if (error || !data?.settings) {
    return defaultAppearanceSettings;
  }

  return getSafeAppearanceSettings(data.settings);
}

export async function getAppearanceAdminData(): Promise<{
  settings: AppearanceSettings;
  source: AppearanceSettingsSource;
  canMutate: boolean;
  updatedAt: string | null;
  warning?: string;
}> {
  const context = await getReadContext();
  const client = createSupabaseAdminClient();

  if (!client) {
    return {
      settings: defaultAppearanceSettings,
      source: "unavailable",
      canMutate: context.canMutate,
      updatedAt: null,
      warning:
        "Supabase admin no esta configurado. Se muestran valores por defecto.",
    };
  }

  const { data, error } = await client
    .from("site_appearance_settings")
    .select("settings, updated_at")
    .eq("site_key", SITE_APPEARANCE_KEY)
    .maybeSingle();

  if (error) {
    return {
      settings: defaultAppearanceSettings,
      source: "unavailable",
      canMutate: context.canMutate,
      updatedAt: null,
      warning:
        "No fue posible leer la apariencia desde Supabase. Se muestran valores por defecto.",
    };
  }

  if (!data?.settings) {
    return {
      settings: defaultAppearanceSettings,
      source: "defaults",
      canMutate: context.canMutate,
      updatedAt: null,
    };
  }

  const validation = validateAppearanceSettings(data.settings);

  if (!validation.success) {
    return {
      settings: defaultAppearanceSettings,
      source: "defaults",
      canMutate: context.canMutate,
      updatedAt:
        typeof data.updated_at === "string" ? data.updated_at : null,
      warning:
        "La apariencia guardada tiene valores invalidos. Se cargaron defaults seguros.",
    };
  }

  return {
    settings: validation.settings,
    source: "supabase",
    canMutate: context.canMutate,
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : null,
  };
}

export async function saveAppearanceSettings(input: unknown) {
  const validation = validateAppearanceSettings(input);

  if (!validation.success) {
    throw new AppearanceAdminError(
      "Revisa los campos marcados antes de guardar.",
      validation.fieldErrors
    );
  }

  const client = await getMutationClient();
  const { error } = await client.from("site_appearance_settings").upsert(
    {
      site_key: SITE_APPEARANCE_KEY,
      settings: validation.settings,
    },
    {
      onConflict: "site_key",
    }
  );

  if (error) {
    throw new AppearanceAdminError(
      "No pudimos guardar la apariencia en Supabase."
    );
  }

  return validation.settings;
}

export async function restoreDefaultAppearanceSettings() {
  return saveAppearanceSettings(defaultAppearanceSettings);
}
