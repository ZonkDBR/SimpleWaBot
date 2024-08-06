const { Client, LocalAuth }   = require('whatsapp-web.js');
const qrcode                            = require('qrcode-terminal');
const fs                                = require('fs');
const path                              = require('path');

const client = new Client({ authStrategy: new LocalAuth() });

const activeGroupsFile  = path.resolve(__dirname, 'activeGroups.json');
const loadActiveGroups  = () => {
    try {
        const rawData   = fs.readFileSync(activeGroupsFile);
        return new Set(JSON.parse(rawData));
    } catch (error) {
        console.error('Error Membaca atau Menambahkan Active Groups: ', error);
        return new Set();
    }
};

const saveActiveGroups = (activeGroups) => {
    try {
        const activeGroupsArray = Array.from(activeGroups).filter(id => id !== undefined);
        fs.writeFileSync(activeGroupsFile, JSON.stringify(activeGroupsArray));
    } catch (error) {
        console.error('Error Menyimpan Active Groups: ', error);
    }
};

const activeGroups      = loadActiveGroups();

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("Silahkan Melakukan Scan QR!");
});

client.on('ready', () => {
   console.log('Client sudah siap!'); 
});

client.on("message_create", async (message) => {
    const chat      = await message.getChat();
    const chatID    = chat.id._serialized;
    const senderID  = message.author || message.from;

    const isAdmin           = async () => {
        const participants  = await chat.participants;
        const admins        = participants.filter(participant => participant.isAdmin);
        return admins.find((admin) => admin.id._serialized === senderID || message.fromMe);
    };

    const tagMembers        = async (members) => {
        let mentions        = [];
        let mentionMessage  = "";
        for (let member of members) {
            try {
                const contact = await client.getContactById(member.id._serialized);
                mentions.push(contact);
                mentionMessage += `@${member.id.user} `;
            } catch (error) {
                console.error("Error mendapatkan contact: ", error);
            }
        }
        if (message.hasQuotedMsg) {
            const QuotedMsg = await message.getQuotedMessage();
            await QuotedMsg.reply(mentionMessage, null, { mentions });
        } else {
            await message.reply(mentionMessage, null, { mentions });
        }
    };

    switch (message.body.toLowerCase()) {
        case ".on":
            if (message.fromMe) {
                if (chatID) {
                    await message.react("⌛");
                    activeGroups.add(chatID);
                    saveActiveGroups(activeGroups);
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
        case ".off":
            if (message.fromMe) {
                if (chatID) {
                    await message.react("⌛");
                    activeGroups.delete(chatID);
                    saveActiveGroups(activeGroups);
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
        case ".tagall":
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
        case ".tagadmin":
            if (activeGroups.has(chatID) && chat.isGroup) {
                if (await isAdmin()) {
                    await message.react("⌛");
                    const participants = await chat.participants;
                    const admins = participants.filter(participant => participant.isAdmin);
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
        case ".tagmember":
            if (activeGroups.has(chatID) && chat.isGroup) {
                if (await isAdmin()) {
                    await message.react("⌛");
                    const participants = await chat.participants;
                    const members = participants.filter(participant => !participant.isAdmin);
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
        default:
            break;
    }
});

client.on('disconnected', async (reason) => {
    console.log('Client Telah Terputus Karena: ', reason);
    if (reason === 'logout') {
        console.log('Logged out dari Whatsapp, Memulai ulang...');
        await client.initialize();
    } 
});

client.on('auth_failure', () => {
    console.log('Authentication gagal! Silahkan Scan ulang QR code!');
    client.initialize();
});

client.on('error', async (error) => {
    console.log("Client error: ", error);
    if (error.message.includes('Execution context was destroyed')) {
        console.log("Memulai ulang client due to execution context destructioon....");
        await client.initialize();
    }
});

if (!fs.existsSync(activeGroupsFile)) {
    fs.writeFileSync(activeGroupsFile, JSON.stringify([]));
}

client.initialize();