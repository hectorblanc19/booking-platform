export const dynamic = "force-dynamic";

import webpush from "web-push";

export async function GET() {
  try {
    webpush.setVapidDetails(
      "mailto:your-email@example.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    await webpush.sendNotification(
      {
        endpoint: "https://fcm.googleapis.com/fcm/send/dc_-trTdOGY:APA91bHCU_ZKRZ0o4sM1m39l9EtEK4UHkfoKSbpwpITTYFpGlf6iV0uS7G7OACLnEfVTtZiWxQF4n-8ZpnUClTVi_QUf3UzM5jm3QahEPgsV9CAp125hur7YI2kuPuzEl3MeDqijZotT",
        keys: {
          auth: "89ltSQvwow-B56LFr18Y4A",
          p256dh: "BDRH2LN8F-_st9QQnMcggmMCaCFj87Ez_jKUuTKrqlSZA0FaFFz3sutPudrAPBY7az6lHu0Z0aNXUr5-Ei0EYi8"
        }
      },
      JSON.stringify({
        title: "FlowPayDR Test",
        message: "Push notification working!"
      }),
      {
        TTL: 60,
        contentEncoding: "aesgcm"
      }
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: err.message });
  }
}
