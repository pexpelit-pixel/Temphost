const BOT_TOKEN = "7077466795:AAE1Rdq0VR6KCdS34xCxr8ow9liF_FOWftw";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ===== VIEW =====
    if (url.pathname.startsWith("/view/")) {
      const id = url.pathname.split("/view/")[1];
      const key = new Request(`${url.origin}/view/${id}`, { method: "GET" });

      const cached = await caches.default.match(key);
      if (!cached) {
        return new Response("Expired / not found", { status: 404 });
      }

      return cached;
    }

    // ===== WEBHOOK TELEGRAM =====
    if (url.pathname === "/webhook" && request.method === "POST") {
      const update = await request.json();
      const msg = update?.message;

      if (!msg) return new Response("ok");

      const chatId = msg.chat.id;
      const origin = url.origin;
      const id = crypto.randomUUID().replace(/-/g, "");

      let html = null;

      // text jadi html
      if (msg.text) {
        html = msg.text;
      }

      // file html
      if (msg.document) {
        const fileId = msg.document.file_id;

        const infoRes = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
        );
        const info = await infoRes.json();

        if (!info.ok) {
          await send(chatId, "Gagal ambil file");
          return new Response("ok");
        }

        const filePath = info.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        const fileRes = await fetch(fileUrl);
        html = await fileRes.text();
      }

      if (!html) {
        await send(chatId, "Kirim HTML / file .html");
        return new Response("ok");
      }

      const key = new Request(`${origin}/view/${id}`, { method: "GET" });

      const res = new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=3600"
        },
      });

      await caches.default.put(key, res);

      const link = `${origin}/view/${id}`;
      await send(chatId, `✅ Temp host:\n${link}`);

      return new Response("ok");
    }

    return new Response("Bot aktif 🚀");
  },
};

// helper kirim telegram
async function send(chatId, text) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
          }
