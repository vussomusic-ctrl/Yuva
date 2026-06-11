// agencies DB row → UI `Agency` (snake → camel). Mirrors lib/adapters/listing.ts:
// the only place that knows the snake_case agency columns; UI stays camelCase.

export type AgencyRow = {
  id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_partner: boolean;
  created_at: string;
};

export type Agency = {
  id: string;
  name: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isPartner: boolean;
  createdAt: string;
};

export function rowToAgency(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    isPartner: row.is_partner,
    createdAt: row.created_at,
  };
}
