
const Discord = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('vouches.db');

module.exports = {
    name: 'profile',
    description: 'View vouch profile',
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;

        db.get('SELECT vouches, negvouches FROM vouches WHERE user_id = ?', [target.id], (err, row) => {
            if (err) {
                console.error(err);
                return message.reply('An error occurred while fetching the profile.');
            }

            const embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`Vouch Profile - ${target.tag}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .addField('Positive Vouches', row ? row.vouches.toString() : '0', true)
                .addField('Negative Vouches', row ? row.negvouches.toString() : '0', true)
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        });
    },
};
