const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setup',
    description: 'Sets up ticket system categories',
    async execute(message, args) {
        // Check if user has administrator permissions
        if (!message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
            return message.reply({ content: 'You do not have permission to use this command.' });
        }

        try {
            // Create ticket categories
            const categories = ['Tickets', 'Closed Tickets'];
            const createdCategories = [];

            for (const categoryName of categories) {
                try {
                    const category = await message.guild.channels.create(categoryName, {
                        type: 'GUILD_CATEGORY',
                        permissionOverwrites: [
                            {
                                id: message.guild.id,
                                deny: [Discord.Permissions.FLAGS.VIEW_CHANNEL]
                            },
                            {
                                id: message.client.user.id,
                                allow: [
                                    Discord.Permissions.FLAGS.VIEW_CHANNEL,
                                    Discord.Permissions.FLAGS.SEND_MESSAGES,
                                    Discord.Permissions.FLAGS.MANAGE_CHANNELS,
                                    Discord.Permissions.FLAGS.MANAGE_ROLES
                                ]
                            }
                        ]
                    });
                    createdCategories.push(category.id);
                    console.log(`Created category: ${categoryName} with ID: ${category.id}`);
                } catch (categoryError) {
                    console.error(`Error creating category ${categoryName}:`, categoryError);
                    throw new Error(`Failed to create category ${categoryName}: ${categoryError.message}`);
                }
            }

            // Update config.json with new category IDs
            const configPath = path.join(__dirname, '..', '..', 'config.json');
            console.log('Config path:', configPath);

            let config;
            try {
                const configData = fs.readFileSync(configPath, 'utf8');
                config = JSON.parse(configData);
                config.ticketcategories = createdCategories;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log('Updated config.json with category IDs:', createdCategories);
            } catch (fileError) {
                console.error('Error handling config file:', fileError);
                throw new Error(`Failed to update config file: ${fileError.message}`);
            }

            return message.reply({ content: 'Ticket system has been set up successfully! You can now use the `.ticket` command to create a ticket panel.' });

        } catch (error) {
            console.error('Error setting up ticket system:', error);
            return message.reply({ content: `There was an error setting up the ticket system: ${error.message}` });
        }
    }
};