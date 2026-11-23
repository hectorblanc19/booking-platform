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

    return { success: true };
  } catch (err) {
    console.error("Push send error:", err);

    // Remove expired or revoked subscriptions.
    if (
      err.statusCode === 410 ||
      err.statusCode === 404 ||
      err?.headers?.["x-wns-status"] === "revoked" ||
      err?.headers?.["x-wns-notificationstatus"] === "revoked"
    ) {
      const { error: deleteError } = await supabase
        .from("push_tokens")
        .delete()
        .eq("subscription->endpoint", subscription.endpoint);

      if (deleteError) {
        throw deleteError;
      }

      console.log("Deleted expired push token:", subscription.endpoint);
      return { success: false, expired: true };
    }

    // Temporary failures, including HTTP 429, must be retryable.
    throw err;
  }
}
