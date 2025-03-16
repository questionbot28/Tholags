const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');

module.exports = {
    name: 'allhelp',
    description: 'Display the all command list.',

    execute(message) {
        const commandFolders = fs.readdirSync('./commands');

        const helpEmbed = new MessageEmbed()
            .setColor(config.color.default)
            .setTitle('Command list')
            .setDescription(`
Here is a list of all available commands:

${commandFolders.map((folder, index) => {
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

    const commands = fs.readdirSync(path.join(__dirname, `../${folder}`)).filter(file => file.endsWith('.js'));
    const commandList = commands.map(command => {
        const commandFile = require(path.join(__dirname, `../${folder}/${command}`));
        commandFile.prefix = prefix; // Add this line to include the prefix in the command object
        return `**${prefix}${commandFile.name}**: ${commandFile.description}\nUsage: ${prefix}${commandFile.name} ${prefix}${commandFile.usage || ''}`;
    }).join('\n\n'); // Use two newlines as separators between commands

    const categorySeparator = index < commandFolders.length - 1 ? '\n\n' : ''; // Add two lines after each category except the last one
    return `# ${folder} Commands :\n${commandList}${categorySeparator}`;
}).join('\n')}
`)
            .setFooter(message.author.tag, message.author.displayAvatarURL({ dynamic: true, size: 64 }))
            .setTimestamp();

        message.channel.send(helpEmbed);
    },
};
