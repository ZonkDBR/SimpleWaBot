const { Client, LocalAuth, Reaction } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const client = new Client({
    authStrategy: new LocalAuth()
});

const activeGroupsFile = path.resolve(__dirname, 'activeGroups.json');

if (!fs.existsSync(activeGroupsFile)) {
    fs.writeFileSync(activeGroupsFile, JSON.stringify([]));
}

let activeGroups = new Set();
if (fs.existsSync(activeGroupsFile)) {
    try {
        const rawData = fs.readFileSync(activeGroupsFile);
        const activeGroupsArray = JSON.parse(rawData);
        activeGroups = new Set(activeGroupsArray);
    } catch (error) {
        console.error('Error reading or parsing active groups: ', error);
    }
}

const saveActiveGroups = () => {
    try {
        const activeGroupsArray = Array.from(activeGroups).filter(id => id !== undefined);
        fs.writeFileSync(activeGroupsFile, JSON.stringify(activeGroupsArray));
    } catch (error) {
        console.error('Error saving active groups: ', error);
    }
};

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Silahkan Scan QR nya');
});

client.on('ready', () => {
    console.log('Client sudah siap!');
});

client.on("message_create", async (message) => {
    const chat = await message.getChat();
    const chatID = chat.id._serialized;
    const senderID = message.author || message.from;

    if (message.body.toLocaleLowerCase() === ".on") {
        if (message.fromMe) {
            if (chatID) {
                await message.react("⌛");
                activeGroups.add(chatID);
                saveActiveGroups();
                await message.react("✅");
            } else {
                await message.reply("Coba Lagi!")
                await message.react("❌")
            }
        } else {
            await message.reply("Kamu siapa?")
        }
    }

    else if (message.body.toLowerCase() === ".off") {
        if (message.fromMe) {
            if (chatID) {
                await message.react("⌛");
                activeGroups.delete(chatID);
                saveActiveGroups();
                await message.react("✅");
            } else {
                await message.reply("Coba Lagi!")
                await message.react("❌")
            }
        } else {
            await message.reply("Kamu siapa?")
        }
    }

    else if (activeGroups.has(chatID) && message.body.toLowerCase() === ".tagall") {
        if (chat.isGroup) {
            const participants = await chat.participants;
            const admins = participants.filter((participant) => participant.isAdmin);
            if (admins.find((admin) => admin.id._serialized === senderID) || message.fromMe) {
                await message.react("⌛");
                let mentions = [];
                let mentionMessage = "";
                for (let participant of participants) {
                    try {
                        const contact = await client.getContactById(participant.id._serialized);
                        mentions.push(contact);
                        mentionMessage += `@${participant.id.user} `;
                    } catch (error) {
                        console.error('Error getting contact:', error);
                    }
                }
                if (message.hasQuotedMsg) {
                    const quotedMsg = await message.getQuotedMessage();
                    await quotedMsg.reply(mentionMessage, null, { mentions });
                    await message.react("✅");
                } else {
                    await message.reply(mentionMessage, null, { mentions });
                    await message.react("✅");
                }
            } else {
                await message.reply("Kamu siapa?")
                await message.react("❌");
            }
        } else {
            await message.reply("Hanya bisa digunakan di group!")
            await message.react("❌");
        }
    }

    else if (activeGroups.has(chatID) && message.body.toLowerCase() === ".tagadmin") {
        if (chat.isGroup) {
            const participants = await chat.participants;
            const admins = participants.filter((participant) => participant.isAdmin);
            if (admins.find((admin) => admin.id._serialized === senderID) || message.fromMe) {
                await message.react("⌛");
                let mentions = [];
                let mentionMessage = "";
                for (let admin of admins) {
                    try {
                        const contact = await client.getContactById(admin.id._serialized);
                        mentions.push(contact);
                        mentionMessage += `@${admin.id.user} `;
                    } catch (error) {
                        console.error('Error getting contact:', error);
                    }
                }
                if (message.hasQuotedMsg) {
                    const quotedMsg = await message.getQuotedMessage();
                    await quotedMsg.reply(mentionMessage, null, { mentions });
                    await message.react("✅");
                } else {
                    await message.reply(mentionMessage, null, { mentions });
                    await message.react("✅");
                }
            } else {
                await message.reply("Kamu siapa?")
                await message.react("❌");
            }
        } else {
            await message.reply("Hanya bisa digunakan di group!")
            await message.react("❌");
        }
    }

    else if (activeGroups.has(chatID) && message.body.toLowerCase() === ".tagmember") {
        if (chat.isGroup) {
          const participants = await chat.participants;
          const admins = participants.filter((participant) => participant.isAdmin);
          if (admins.find((admin) => admin.id._serialized === senderID) || message.fromMe) {
            await message.react("⌛");
            const members = participants.filter((participant) => !participant.isAdmin);
            let mentions = [];
            let mentionMessage = "";
            for (let member of members) {
              try {
                const contact = await client.getContactById(member.id._serialized);
                mentions.push(contact);
                mentionMessage += `@${member.id.user} `;
              } catch (error) {
                console.error('Error getting contact:', error);
              }
            };
            if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                await quotedMsg.reply(mentionMessage, null, { mentions });
                await message.react("✅");
            } else {
                await message.reply(mentionMessage, null, { mentions });
                await message.react("✅");
            }
          } else {
              await message.reply("Kamu siapa?")
              await message.react("❌");
          }
        } else {
            await message.reply("Hanya bisa digunakan di group!");
            await message.react("❌");
        }
    }
});

client.on('disconnected', async (reason) => {
    console.log('Client disconnected:', reason);
    if (reason === 'logout') {
        console.log('Logged out from linked devices. Reinitializing...');
        await client.initialize();
    }
});

client.on('auth_failure', () => {
    console.log('Authentication failed. Please re-scan the QR code.');
    client.initialize();
});

client.on('error', async (error) => {
    console.error('Client error:', error);
    if (error.message.includes('Execution context was destroyed')) {
        console.log('Reinitializing client due to execution context destruction...');
        await client.initialize(); 
    }
});

client.initialize();