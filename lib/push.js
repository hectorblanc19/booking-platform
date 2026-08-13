import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendPushToSubscription(subscription, payload) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 60,
        contentEncoding: "aesgcm",
      }
    );
  } catch (err) {
    console.error("Push send error:", err);

    // ⭐ DELETE EXPIRED / REVOKED TOKENS
    if (
      err.statusCode === 410 ||
      err.statusCode === 404 ||
      err?.headers?.["x-wns-status"] === "revoked" ||
      err?.headers?.["x-wns-notificationstatus"] === "revoked"
    ) {
      // Delete token by endpoint
      await supabase
        .from("push_tokens")
        .delete()
        .eq("subscription->endpoint", subscription.endpoint);

      console.log("Deleted expired push token:", subscription.endpoint);
      return;
    }

    // ⭐ SKIP THROTTLED TOKENS (429)
    if (err.statusCode === 429) {
      console.log("Push throttled — skipping retry:", subscription.endpoint);
      return;
    }
  }
}
