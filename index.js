addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

const BOT_TOKEN = "7077466795:AAE1Rdq0VR6KCdS34xCxr8ow9liF_FOWftw";

async function handle(request) {
  const url = new URL(request.url);

  // ===== VIEW =====
  if (url.pathname.startsWith("/view/")) {
    const id = url.pathname.split("/view/")[1];

    const html = await HTML_STORE.get(id);

    if (!html) {
      return new Response("Expired / not found", { status: 404 });
    }

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  }

  // ===== WEBHOOK =====
  if (url.pathname === "/webhook" && request.method === "POST") {
    const update = await request.json();
    const msg = update.message;

    if (!msg) return new Response("ok");

    const chatId = msg.chat.id;
    const origin = url.origin;

    let html = null;

    // text
    if (msg.text) {
      html = msg.text;
    }

    // file html
    if (msg.document) {
      const fileId = msg.document.file_id;

      const infoRes = await fetch(
        "https://api.telegram.org/bot" + BOT_TOKEN + "/getFile?file_id=" + fileId
      );
      const info = await infoRes.json();

      if (!info.ok) {
        await send(chatId, "Gagal ambil file");
        return new Response("ok");
      }

      const filePath = info.result.file_path;
      const fileUrl =
        "https://api.telegram.org/file/bot" + BOT_TOKEN + "/" + filePath;

      const fileRes = await fetch(fileUrl);
      html = await fileRes.text();
    }

    if (!html) {
      await send(chatId, "Kirim HTML / file .html");
      return new Response("ok");
    }

    const id = crypto.randomUUID().replace(/-/g, "");

    // 🔥 simpan ke KV (1 jam)
    await HTML_STORE.put(id, html, {
      expirationTtl: 3600
    });

    const link = origin + "/view/" + id;

    await send(chatId, "✅ KV Host:\n" + link + "\n⏳ 1 jam");

    return new Response("ok");
  }

  return new Response("OK 🚀");
}

async function send(chatId, text) {
  return fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text
    })
  });
}