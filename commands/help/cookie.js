
const { MessageEmbed } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'cookie',
    description: 'Shows cookie commands help',
    execute(message, args) {
        const embed = new MessageEmbed()
            .setColor(config.color.default)
            .setDescription('`.c-upload` - Upload cookies\n`.csend` - Send cookies\n`.cstock` - Check cookie stock')
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });
        
        message.channel.send({ embeds: [embed] });
    }
};
