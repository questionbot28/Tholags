
const { MessageEmbed } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'verify',
    description: 'Shows verification help',
    execute(message, args) {
        const embed = new MessageEmbed()
            .setColor(config.color.default)
            .setDescription('Use `.check @user` to check if a user is verified\nUse `.verify @user` to verify a user')
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) });
        
        message.channel.send({ embeds: [embed] });
    }
};
