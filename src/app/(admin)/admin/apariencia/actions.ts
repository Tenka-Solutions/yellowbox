"use server";

import { revalidatePath } from "next/cache";
import {
  AppearanceAdminError,
  restoreDefaultAppearanceSettings,
  saveAppearanceSettings,
} from "@/modules/appearance/appearanceService";
import type {
  AppearanceFieldErrors,
  AppearanceSettings,
} from "@/modules/appearance/types";

export type AppearanceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: AppearanceFieldErrors;
  settings?: AppearanceSettings;
};

function parseSettingsPayload(formData: FormData) {
  const rawSettings = formData.get("settings");

  if (typeof rawSettings !== "string" || !rawSettings.trim()) {
    throw new AppearanceAdminError("No se recibio la configuracion.");
  }

  try {
    return JSON.parse(rawSettings) as unknown;
  } catch {
    throw new AppearanceAdminError("La configuracion enviada no es valida.");
  }
}

function revalidateAppearancePaths() {
  revalidatePath("/admin/apariencia");
  revalidatePath("/", "layout");
}

export async function saveAppearanceSettingsAction(
  _previousState: AppearanceActionState,
  formData: FormData
): Promise<AppearanceActionState> {
  try {
    const payload = parseSettingsPayload(formData);
    const settings = await saveAppearanceSettings(payload);

    revalidateAppearancePaths();

    return {
      status: "success",
      message: "Apariencia guardada correctamente.",
      settings,
    };
  } catch (error) {
    if (error instanceof AppearanceAdminError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    return {
      status: "error",
      message: "No pudimos guardar la apariencia. Intenta nuevamente.",
    };
  }
}

export async function restoreAppearanceDefaultsAction(): Promise<AppearanceActionState> {
  try {
    const settings = await restoreDefaultAppearanceSettings();

    revalidateAppearancePaths();

    return {
      status: "success",
      message: "Valores por defecto restaurados.",
      settings,
    };
  } catch (error) {
    if (error instanceof AppearanceAdminError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors: error.fieldErrors,
      };
    }

    return {
      status: "error",
      message: "No pudimos restaurar los valores por defecto.",
    };
  }
}
