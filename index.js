const Discord = require('discord.js');
const fs = require('fs');
const express = require('express');

const app = express();

const port = 3000;
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('vouches.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite3 database:', err.message);
    } else {
        console.log('Connected to SQLite3 database');

        // Create vouches table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS vouches (
            user_id TEXT PRIMARY KEY,
            vouches INTEGER DEFAULT 0,
            negvouches INTEGER DEFAULT 0,
            reasons TEXT DEFAULT '[]',
            todayvouches INTEGER DEFAULT 0,
            last3daysvouches INTEGER DEFAULT 0,
            lastweekvouches INTEGER DEFAULT 0
        )`);
    }
});

app.get('/', (req, res) => res.send('Online Yo boi!'));
app.listen(port, () => console.log('Server is listening on port ' + port));

const client = new Discord.Client();
client.commands = new Discord.Collection();

const config = require('./config.json');
// Use environment variable for token, fallback to config if not present
const token = process.env.DISCORD_BOT_TOKEN || config.token;

if (!token) {
    console.error('No Discord bot token provided! Please set the DISCORD_BOT_TOKEN environment variable.');
    process.exit(1);
}

const commandFolders = fs.readdirSync('./commands');

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);

        let prefix;
        if (folder === 'main') {
            prefix = config.mainPrefix;
        } else if (folder === 'help') {
            prefix = config.helpPrefix;
        } else if (folder === 'vouch') {
            prefix = config.vouchPrefix;
        } else if (folder === 'negvouch') {
            prefix = config.negVouchPrefix;
        } else {
            prefix = config.prefix;
        }

        command.prefix = prefix;

        console.log(`Loaded command: ${prefix}${command.name} `);
        client.commands.set(command.name, command);
    }
}


// Function to check if a channel or role exists in the server
function validateServerConfig() {
    const guilds = client.guilds.cache.array();

    for (const guild of guilds) {
        console.log(`Checking server: ${guild.name} (${guild.id})`);

        // Check if notification channel exists
        const notificationChannel = guild.channels.cache.get(config.notificationChannelId);
        if (!notificationChannel) {
            console.error(`Warning: Notification channel not found in server ${guild.name} (${guild.id}). Check your config.json.`);
        }

        // Check if specified roles exist
        const specifiedRoles = config.specifiedRoleIds || [];
        for (const roleId of specifiedRoles) {
            const role = guild.roles.cache.get(roleId);
            if (!role) {
                console.error(`Warning: Specified role with ID ${roleId} not found in server ${guild.name} (${guild.id}). Check your config.json.`);
            }
        }
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity(`${config.helpPrefix}help │ 𝗡𝗘𝗫𝗨𝗦 𝗚𝟯𝗡`);
    validateServerConfig();
});

client.on('message', async (message) => {
    try {
        if (message.author.bot) return;

        const prefixes = [
            config.vouchPrefix,
            config.negVouchPrefix,
            config.mainPrefix,
            config.helpPrefix
        ];

        let usedPrefix = null;

        for (const prefix of prefixes) {
            if (message.content.startsWith(prefix)) {
                usedPrefix = prefix;
                break;
            }
        }

        if (!usedPrefix) return;

        const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (config.command.notfound_message === true && !client.commands.has(command)) {
            return message.channel.send(
                new Discord.MessageEmbed()
                    .setColor(config.color.red)
                    .setTitle('Unknown command :(')
                    .setDescription(`Sorry, but I cannot find the \`${command}\` command!`)
                    .setFooter(message.author.tag, message.author.displayAvatarURL({ dynamic: true, size: 64 }))
                    .setTimestamp()
            );
        }

        const commandObject = client.commands.get(command);
        if (commandObject && message.content.startsWith(commandObject.prefix)) {
            commandObject.execute(message, args, commandObject.prefix, config.vouchPrefix);
        }

    } catch (error) {
        console.error('Error processing message:', error);
    }
});

const webhookLogFile = 'verified.txt';
const designatedChannelId = '1200663202170675317';

client.on('message', (message) => {
    if (message.webhookID && message.channel.id === designatedChannelId) {
        fs.appendFileSync(webhookLogFile, `${message.content}\n`);
    }
});

client.login(token).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});