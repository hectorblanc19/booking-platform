import { createClient } from "@/utils/supabase/server";
import MarketplaceClient from "./MarketplaceClient";

export default async function MarketplacePage({ searchParams }) {
  // ⭐ Next.js 16: searchParams is a Promise → MUST await
  const params = await searchParams;
  const lang = params?.lang === "es" ? "es" : "en";

  const supabase = createClient();

  // ⭐ Fetch active barbers
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

 // ⭐ Fetch businesses
const { data: businesses } = await supabase
  .from("businesses")
  .select(`
    id,
    name,
    phone,
    address,
    map_url,
    category,
    featured,
    photo_url
  `);  

  // ⭐ Add empty lat/lng values because businesses table
  // does not currently have those columns
  const marketplaceBusinesses = (businesses || []).map((business) => ({
    ...business,
    lat: null,
    lng: null,
  }));

  // ⭐ Pass barbers + businesses + language to Marketplace
  return (
    <MarketplaceClient
      barbers={barbers || []}
      businesses={marketplaceBusinesses}
      lang={lang}
    />
  );
}