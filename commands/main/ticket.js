const Discord = require('discord.js');

module.exports = {
    name: 'ticket',
    description: 'Creates a ticket panel with dropdown menu',
    async execute(message, args) {
        // Check if user has permission to create ticket panel
        if (!message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
            return message.reply({ content: 'You do not have permission to use this command.' });
        }

        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('🎫 Create a Support Ticket')
            .setDescription('Please select a category from the dropdown menu below to create a ticket.')
            .setFooter({ text: 'NEXUS GƧN Support' });

        // Create selection menu
        const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageSelectMenu()
                    .setCustomId('ticket_menu')
                    .setPlaceholder('Select ticket category')
                    .addOptions([
                        {
                            label: 'General Support',
                            description: 'Get help with general questions',
                            value: 'General Support',
                            emoji: '❓'
                        },
                        {
                            label: 'Account Issues',
                            description: 'Report issues with accounts',
                            value: 'Account Issues',
                            emoji: '👤'
                        },
                        {
                            label: 'Generator Issues',
                            description: 'Report issues with the generator',
                            value: 'Generator Issues',
                            emoji: '⚙️'
                        }
                    ])
            );

        try {
            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Error sending ticket menu:', error);
            message.reply({ content: 'There was an error creating the ticket menu.' });
        }
    }
};