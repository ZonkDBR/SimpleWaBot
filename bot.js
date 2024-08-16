const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

const client = new Client({ authStrategy: new LocalAuth() });
let spamInterval;
const activeGroupsFile = path.resolve(__dirname, "activeGroups.json");
let activeGroups = new Set(
  JSON.parse(fs.readFileSync(activeGroupsFile, "utf8"))
);

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Silahkan Melakukan Scan QR!");
});

client.on("ready", () => {
  console.log("Client sudah siap!");
});

client.on("message_create", async (message) => {
  const chat = await message.getChat();
  const chatID = chat.id._serialized;
  const senderID = message.author || message.from;

  const isAdmin = async () => {
    const participants = await chat.participants;
    return participants.some(
      (participant) =>
        participant.isAdmin && participant.id._serialized === senderID
    );
  };

  const tagMembers = async (members) => {
    const mentions = [];
    let mentionMessage = "";
    for (const member of members) {
      const contact = await client.getContactById(member.id._serialized);
      mentions.push(contact);
      mentionMessage += `@${member.id.user} `;
    }
    if (message.hasQuotedMsg) {
      const QuotedMsg = await message.getQuotedMessage();
      await QuotedMsg.reply(mentionMessage, null, { mentions });
    } else {
      await message.reply(mentionMessage, null, { mentions });
    }
  };

  switch (true) {
    case message.body.toLocaleLowerCase().startsWith(".on"):
      if (message.fromMe) {
        if (chatID) {
          await message.react("⌛");
          activeGroups.add(chatID);
          fs.writeFileSync(
            activeGroupsFile,
            JSON.stringify(Array.from(activeGroups))
          );
          await message.react("✅");
        } else {
          await message.reply("Gagal!");
          await message.react("❌");
        }
      } else {
        await message.reply("Pffft");
        await message.react("🤡");
      }
      break;
    case message.body.toLocaleLowerCase().startsWith(".off"):
      if (message.fromMe) {
        if (chatID) {
          await message.react("⌛");
          activeGroups.delete(chatID);
          fs.writeFileSync(
            activeGroupsFile,
            JSON.stringify(Array.from(activeGroups))
          );
          await message.react("✅");
        } else {
          await message.reply("Gagal!");
          await message.react("❌");
        }
      } else {
        await message.reply("Pffft");
        await message.react("🤡");
      }
      break;
    case message.body.toLocaleLowerCase().includes(".tagall"):
      if (activeGroups.has(chatID) && chat.isGroup) {
        if (await isAdmin()) {
          await message.react("⌛");
          const participants = await chat.participants;
          await tagMembers(participants);
          await message.react("✅");
        } else {
          await message.reply("Pffft");
          await message.react("🤡");
        }
      } else {
        await message.reply("Hanya bisa digunakan di group!");
        await message.react("❌");
      }
      break;
    case message.body.toLocaleLowerCase().includes(".tagadmin"):
      if (activeGroups.has(chatID) && chat.isGroup) {
        if (await isAdmin()) {
          await message.react("⌛");
          const participants = await chat.participants;
          const admins = participants.filter(
            (participant) => participant.isAdmin
          );
          await tagMembers(admins);
          await message.react("✅");
        } else {
          await message.reply("Pffft");
          await message.react("🤡");
        }
      } else {
        await message.reply("Hanya bisa digunakan di group!");
        await message.react("❌");
      }
      break;
    case message.body.toLocaleLowerCase().includes(".tagmember"):
      if (activeGroups.has(chatID) && chat.isGroup) {
        if (await isAdmin()) {
          await message.react("⌛");
          const participants = await chat.participants;
          const members = participants.filter(
            (participant) => !participant.isAdmin
          );
          await tagMembers(members);
          await message.react("✅");
        } else {
          await message.reply("Pffft");
          await message.react("🤡");
        }
      } else {
        await message.reply("Hanya bisa digunakan di group!");
        await message.react("❌");
      }
      break;
    case message.body.toLocaleLowerCase().includes(".sticker"):
      if (message.fromMe) {
        await message.react("⌛");
        if (message.hasMedia) {
          const media = await message.downloadMedia();
          await message.reply(media, null, { sendMediaAsSticker: true });
          await message.react("✅");
        } else if (message.hasQuotedMsg) {
          const quotedMsg = await message.getQuotedMessage();
          if (quotedMsg.hasMedia) {
            const media = await quotedMsg.downloadMedia();
            await message.reply(media, null, { sendMediaAsSticker: true });
            await message.react("✅");
          } else {
            await message.reply("Tidak ada gambar!");
            await message.react("❌");
          }
        } else {
          await message.reply("Silahkan kirim gambar atau reply gambar!");
          await message.react("❌");
        }
      }
      break;
    case message.body.toLocaleLowerCase().includes(".spam"):
      await message.react("⌛");
      if (spamInterval) {
        clearInterval(spamInterval);
      }
      if (message.hasQuotedMsg) {
        const quotedMsg = await message.getQuotedMessage();
        if (quotedMsg.hasMedia && quotedMsg.type === "sticker") {
          const media = await quotedMsg.downloadMedia();
          spamInterval = setInterval(async () => {
            await chat.sendMessage(media, { sendMediaAsSticker: true });
          }, 1000);
          await message.react("✅");
        } else if (quotedMsg.body) {
          const spamText = quotedMsg.body;
          spamInterval = setInterval(async () => {
            await chat.sendMessage(spamText);
          }, 1000);
          await message.react("✅");
        } else {
          await message.reply("Tidak ada gambar atau sticker.");
          await message.react("❌");
        }
      } else {
        const spamText = message.body.slice(6).trim();
        if (spamText) {
          spamInterval = setInterval(async () => {
            await chat.sendMessage(spamText);
          }, 1000);
          await message.react("✅");
        } else {
          await message.reply("Tidak ada teks.");
          await message.react("❌");
        }
      }
      break;
    case message.body.toLocaleLowerCase().includes(".stop"):
      if (spamInterval) {
        clearInterval(spamInterval);
        await message.react("✅");
      } else {
        await message.reply("Tidak ada spam yang aktif.");
        await message.react("❌");
      }
      break;
    case message.body.toLocaleLowerCase().startsWith(".help"):
      await message.react("⌛");
      await message.reply(
        "Selalu Awali dengan .\n1. On\n2. Off\n3. Tagall\n4. Tagadmin\n5. Tagmember\n6. Sticker\n7. Spam\n8. Stop\n9. Help"
      );
      await message.react("✅");
      break;
    default:
      break;
  }
});

client.on("disconnected", async (reason) => {
  console.log("Client Telah Terputus Karena: ", reason);
  if (reason === "logout") {
    console.log("Logged out dari Whatsapp, Memulai ulang...");
    await client.initialize();
  }
});

client.on("auth_failure", () => {
  console.log("Authentication gagal! Silahkan Scan ulang QR code!");
  client.initialize();
});

client.on("error", async (error) => {
  console.log("Client error: ", error);
  if (error.message.includes("Execution context was destroyed")) {
    console.log(
      "Memulai ulang client due to execution context destruction...."
    );
    await client.initialize();
  }
});

if (!fs.existsSync(activeGroupsFile)) {
  fs.writeFileSync(activeGroupsFile, JSON.stringify([]));
}

client.initialize();