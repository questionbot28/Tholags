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
        Discord.Intents.FLAGS.GUILD_PRESENCES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Discord.Intents.FLAGS.GUILD_INVITES,
        Discord.Intents.FLAGS.GUILD_MEMBERS
    ],
    partials: ['CHANNEL', 'MESSAGE', 'REACTION'] 
});

// Attach database to client before connecting
client.db = new sqlite3.Database('vouches.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite3 database:', err.message);
    } else {
        console.log('Connected to SQLite3 database');
        // Create tables if they don't exist
        client.db.serialize(() => {
            // Existing vouches table
            client.db.run(`CREATE TABLE IF NOT EXISTS vouches (
                user_id TEXT PRIMARY KEY,
                vouches INTEGER DEFAULT 0,
                negvouches INTEGER DEFAULT 0,
                reasons TEXT DEFAULT '[]',
                todayvouches INTEGER DEFAULT 0,
                last3daysvouches INTEGER DEFAULT 0,
                lastweekvouches INTEGER DEFAULT 0
            )`);

            // New invites table
            client.db.run(`CREATE TABLE IF NOT EXISTS invites (
                user_id TEXT PRIMARY KEY,
                total_invites INTEGER DEFAULT 0,
                regular_invites INTEGER DEFAULT 0,
                leaves INTEGER DEFAULT 0,
                bonus_invites INTEGER DEFAULT 0,
                fake_invites INTEGER DEFAULT 0,
                invite_codes TEXT DEFAULT '[]'
            )`);
        });
    }
});

// Cache for storing guild invites
const guildInvites = new Map();

// Event to cache invites when bot starts
client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setActivity(`${config.helpPrefix}help │ 𝗡𝗘𝗫𝗨𝗦 𝗚𝟯𝗡`);

    // Cache all guild invites
    client.guilds.cache.forEach(async (guild) => {
        try {
            const firstInvites = await guild.invites.fetch();
            guildInvites.set(guild.id, new Map(firstInvites.map((invite) => [invite.code, invite.uses])));
        } catch (err) {
            console.error(`Error caching invites for guild ${guild.id}:`, err);
        }
    });
});

// Event to update invite cache when new invite is created
client.on('inviteCreate', async (invite) => {
    try {
        const invites = guildInvites.get(invite.guild.id);
        invites.set(invite.code, invite.uses);
        guildInvites.set(invite.guild.id, invites);
    } catch (err) {
        console.error('Error handling new invite:', err);
    }
});

// Event to track who used an invite
client.on('guildMemberAdd', async (member) => {
    try {
        const cachedInvites = guildInvites.get(member.guild.id);
        const newInvites = await member.guild.invites.fetch();

        const usedInvite = newInvites.find(invite => {
            const cachedUses = cachedInvites.get(invite.code) || 0;
            return invite.uses > cachedUses;
        });

        if (usedInvite) {
            const inviter = await client.users.fetch(usedInvite.inviter.id);

            // Update database
            client.db.get('SELECT * FROM invites WHERE user_id = ?', [inviter.id], (err, row) => {
                if (err) {
                    console.error('Error checking inviter:', err);
                    return;
                }

                if (!row) {
                    // Create new record
                    client.db.run('INSERT INTO invites (user_id, total_invites, regular_invites, invite_codes) VALUES (?, 1, 1, ?)',
                        [inviter.id, JSON.stringify([usedInvite.code])]);
                } else {
                    // Update existing record
                    const inviteCodes = JSON.parse(row.invite_codes);
                    inviteCodes.push(usedInvite.code);

                    client.db.run('UPDATE invites SET total_invites = total_invites + 1, regular_invites = regular_invites + 1, invite_codes = ? WHERE user_id = ?',
                        [JSON.stringify(inviteCodes), inviter.id]);
                }
            });
        }

        // Update the cache with new uses
        guildInvites.set(member.guild.id, new Map(newInvites.map((invite) => [invite.code, invite.uses])));
    } catch (err) {
        console.error('Error handling member join:', err);
    }
});

app.get('/', (req, res) => res.send('Bot is running!'));
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

// Handle commands
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefixes = [
        config.vouchPrefix,
        config.negVouchPrefix,
        config.mainPrefix,
        config.helpPrefix,
        config.basicPrefix,
        config.freePrefix,
        config.boostPrefix,
        config.premiumPrefix,
        config.cookiePrefix,
        config.extremePrefix
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
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) {
        if (config.command.notfound_message) {
            await message.channel.send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setColor(config.color.red)
                        .setTitle('Unknown command :(')
                        .setDescription(`Sorry, but I cannot find the \`${commandName}\` command!`)
                        .setFooter({ 
                            text: message.author.tag, 
                            iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                        })
                        .setTimestamp()
                ]
            });
        }
        return;
    }

    try {
        const command = client.commands.get(commandName);
        if (command.prefix === usedPrefix) {
            await command.execute(message, args, usedPrefix);
        }
    } catch (error) {
        console.error('Error executing command:', error);
        await message.channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setColor(config.color.red)
                    .setTitle('Error')
                    .setDescription('There was an error executing that command!')
                    .setFooter({ 
                        text: message.author.tag, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setTimestamp()
            ]
        });
    }
});

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