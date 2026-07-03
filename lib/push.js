import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendPushToSubscription(subscription, payload) {
  return webpush.sendNotification(
    subscription,
    JSON.stringify(payload),
    {
      TTL: 60,
      contentEncoding: "aesgcm",
    }
  );
}
