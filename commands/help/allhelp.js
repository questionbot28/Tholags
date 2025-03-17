const { MessageEmbed } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'allhelp',
    description: 'Shows all commands',
    execute(message, args) {
        const embed = new MessageEmbed()
            .setColor(config.color.default)
            .setDescription('**Main Commands**\n`.gen` - Generate accounts\n`.stock` - Check stock\n`.redeem` - Redeem a code\n\n**Cookie Commands**\n`.c-upload` - Upload cookies\n`.csend` - Send cookies\n`.cstock` - Check cookie stock\n\n**Verification**\n`.check` - Check verification\n`.verify` - Verify a user')
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        message.channel.send({ embeds: [embed] });
    }
};