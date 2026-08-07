import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req) {
  const body = await req.json();
  const { barber_id, day_of_week, start_time, end_time, is_closed } = body;

  // Update barber_availability
  await supabase.from("barber_availability").upsert(
    {
      barber_id,
      day_of_week,
      start_time,
      end_time,
      is_closed,
    },
    { onConflict: "barber_id,day_of_week" }
  );

  // Update barbers.working_days (dashboard)
  const { data: barber } = await supabase
    .from("barbers")
    .select("working_days")
    .eq("id", barber_id)
    .single();

  const updated = {
    ...barber.working_days,
    [day_of_week]: {
      start_time,
      end_time,
      is_closed,
    },
  };

  await supabase
    .from("barbers")
    .update({ working_days: updated })
    .eq("id", barber_id);

  return NextResponse.json({ success: true, updated });
}
