// agencies DB row → UI `Agency` (snake → camel). Mirrors lib/adapters/listing.ts:
// the only place that knows the snake_case agency columns; UI stays camelCase.

export type AgencyRow = {
  id: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  is_partner: boolean;
  created_at: string;
};

export type Agency = {
  id: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  isPartner: boolean;
  createdAt: string;
  listingsCount: number;
};

export function rowToAgency(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? null,
    coverUrl: row.cover_url ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    description: row.description ?? null,
    isPartner: row.is_partner,
    createdAt: row.created_at,
    listingsCount: 0, // unknown from a plain agencies row; set by the count RPC
  };
}

// Row from the partner_agencies_with_counts() RPC — agency columns + the
// aggregate. Postgres bigint may arrive as number or string, so coerce.
export type AgencyWithCountRow = AgencyRow & { listings_count: number | string };

export function rowWithCountToAgency(row: AgencyWithCountRow): Agency {
  return { ...rowToAgency(row), listingsCount: Number(row.listings_count) || 0 };
}
