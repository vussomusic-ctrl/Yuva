// AI helpers backed by Supabase Edge Functions (key lives in Supabase secrets,
// never in the bundle). generateDescription calls the generate-description
// function, which prompts Claude Haiku and returns a listing description.

import { supabase } from "../supabase";

export type DescriptionParams = {
  dealType: string;
  propertyType: string;
  buildType: string | null;
  area: number | null;
  areaUnit: "m2" | "sot";
  rooms: number | null;
  baths: number | null;
  floor: number | null;
  floorTotal: number | null;
  price: number | null;
  currency: string;
  furnished: boolean;
  mortgage: boolean;
  location: string;
};

export async function generateDescription(
  params: DescriptionParams,
  lang: "az" | "ru" | "en",
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-description", {
    body: { params, lang },
  });
  if (error) throw new Error(error.message ?? "generate-description failed");
  const description = (data as { description?: string } | null)?.description?.trim();
  if (!description) throw new Error("empty description");
  return description;
}

export async function translateDescription(
  text: string,
  targetLang: "az" | "ru" | "en",
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("translate-description", {
    body: { text, targetLang },
  });
  if (error) throw new Error(error.message ?? "translate-description failed");
  const translation = (data as { translation?: string } | null)?.translation?.trim();
  if (!translation) throw new Error("empty translation");
  return translation;
}
