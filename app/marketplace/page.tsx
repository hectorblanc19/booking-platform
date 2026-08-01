import { createClient } from "@/utils/supabase/server";
import MarketplaceClient from "./MarketplaceClient";

export default async function MarketplacePage({ searchParams }) {
  // ⭐ Next.js 16: searchParams is a Promise → MUST await
  const params = await searchParams;
  const lang = params?.lang === "es" ? "es" : "en";

  const supabase = createClient();

  // ⭐ Fetch barbers including lat/lng
  const { data: barbers } = await supabase
    .from("barbers")
    .select(`
      id,
      business_id,
      name,
      email,
      phone,
      photo_url,
      address,
      lat,
      lng,
      map_url,
      category,
      featured,
      services
    `)
    .eq("active", true);

  // ⭐ Pass barbers + language to client component
  return <MarketplaceClient barbers={barbers || []} lang={lang} />;
}
