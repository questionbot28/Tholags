const Discord = require('discord.js');
const fs = require('fs');
const express = require('express');

const app = express();
const port = 3000;
const sqlite3 = require('sqlite3').verbose();

// Initialize Discord client with all required intents
const client = new Discord.Client({ 
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
        Discord.Intents.FLAGS.GUILD_WEBHOOKS,
        Discord.Intents.FLAGS.GUILD_PRESENCES
    ] 
});

// Database setup
const db = new sqlite3.Database('vouches.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite3 database:', err.message);
    } else {
        console.log('Connected to SQLite3 database');
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

client.commands = new Discord.Collection();

const config = require('./config.json');
const token = process.env.DISCORD_BOT_TOKEN || config.token;

if (!token) {
    console.error('No Discord bot token provided! Please set the DISCORD_BOT_TOKEN environment variable.');
    process.exit(1);
}

// Load commands
const commandFolders = fs.readdirSync('./commands');
for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        let prefix = config[`${folder}Prefix`] || config.mainPrefix;
        command.prefix = prefix;
        console.log(`Loaded command: ${prefix}${command.name} `);
        client.commands.set(command.name, command);
    }
}

// Handle ticket creation
async function handleTicketCreation(interaction, category) {
    const guild = interaction.guild;
    console.log('Attempting to create ticket with category:', category);
    console.log('Available ticket categories:', config.ticketcategories);

    const ticketCategory = guild.channels.cache.get(config.ticketcategories[0]);

    if (!ticketCategory) {
        await interaction.reply({ content: 'Ticket category not found! Please check category IDs in config.', ephemeral: true });
        console.error('Ticket category not found. Available categories:', config.ticketcategories);
        console.error('Guild channels:', Array.from(guild.channels.cache.map(c => `${c.name}: ${c.id}`)));
        return;
    }

    try {
        console.log('Creating ticket channel in category:', ticketCategory.name);
        const ticketChannel = await guild.channels.create(`ticket-${interaction.user.username}`, {
            type: 'GUILD_TEXT',
            parent: ticketCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [Discord.Permissions.FLAGS.VIEW_CHANNEL],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        Discord.Permissions.FLAGS.VIEW_CHANNEL,
                        Discord.Permissions.FLAGS.SEND_MESSAGES,
                        Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY
                    ],
                },
                {
                    id: client.user.id,
                    allow: [
                        Discord.Permissions.FLAGS.VIEW_CHANNEL,
                        Discord.Permissions.FLAGS.SEND_MESSAGES,
                        Discord.Permissions.FLAGS.READ_MESSAGE_HISTORY
                    ],
                },
            ],
        });

        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`${category} Support Ticket`)
            .setDescription(`Welcome ${interaction.user}!\nSupport will be with you shortly.\n\nCategory: ${category}`)
            .setTimestamp();

        const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageButton()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle('DANGER')
                    .setEmoji('🔒')
            );

        await ticketChannel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: `Ticket created! Please check ${ticketChannel}`, ephemeral: true });
    } catch (error) {
        console.error('Error creating ticket channel:', error);
        return interaction.reply({ content: `Error creating ticket: ${error.message}`, ephemeral: true });
    }
}

// Event handlers
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity(`${config.helpPrefix}help │ 𝗡𝗘𝗫𝗨𝗦 𝗚𝟯𝗡`);
});

// Handle interactions (buttons and dropdowns)
client.on('interactionCreate', async interaction => {
    if (interaction.isSelectMenu() && interaction.customId === 'ticket_menu') {
        await handleTicketCreation(interaction, interaction.values[0]);
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const channel = interaction.channel;
        await interaction.reply('Closing ticket in 5 seconds...');
        setTimeout(() => channel.delete(), 5000);
    }
});

// Handle commands
client.on('messageCreate', async (message) => {
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

    if (!client.commands.has(command)) {
        if (config.command.notfound_message) {
            return message.channel.send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setColor(config.color.red)
                        .setTitle('Unknown command :(')
                        .setDescription(`Sorry, but I cannot find the \`${command}\` command!`)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp()
                ]
            });
        }
        return;
    }

    try {
        const commandObject = client.commands.get(command);
        if (commandObject && message.content.startsWith(commandObject.prefix)) {
            await commandObject.execute(message, args, commandObject.prefix, config.vouchPrefix);
        }
    } catch (error) {
        console.error('Error executing command:', error);
        message.reply('There was an error executing that command!');
    }
});

// Log webhook messages
const webhookLogFile = 'verified.txt';
const designatedChannelId = '1200663202170675317';

client.on('messageCreate', (message) => {
    if (message.webhookId && message.channel.id === designatedChannelId) {
        fs.appendFileSync(webhookLogFile, `${message.content}\n`);
    }
});

client.login(token).catch(error => {
    console.error('Failed to login:', error);
    process.exit(1);
});