import type { Sql } from "./db";
import { validatePricing, type PricingSettings } from "./pricing.ts";

export async function readPricing(sql: Sql): Promise<PricingSettings> {
  const rows = await sql<{
    settings: unknown;
  }>`select settings from pricing_settings where id = 'main'`;
  if (!rows[0]) throw new Error("Pricing settings are missing. Apply the database migrations.");
  return validatePricing(rows[0].settings);
}

export async function writePricing(sql: Sql, value: unknown): Promise<PricingSettings> {
  const settings = validatePricing(value);
  const rows = await sql<{ id: string }>`
    update pricing_settings set settings = ${JSON.stringify(settings)}::jsonb, updated_at = now()
    where id = 'main' returning id
  `;
  if (!rows[0]) throw new Error("Pricing settings are missing. Apply the database migrations.");
  return settings;
}
