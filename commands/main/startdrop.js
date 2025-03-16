const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const config = require('../../config.json'); // Adjust the path based on your project structure

module.exports = {
  name: 'startdrop',
  description: 'Start a drop session',
  usage: 'startdrop',
  execute(message) {
    // Check if the command is used in the allowed channel
    const allowedChannelId = config.dropChannelId;
    if (message.channel.id !== allowedChannelId) {
      const channelErrorEmbed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Error')
        .setDescription(`This command can only be used in the <#${allowedChannelId}> channel.`);
      return message.channel.send(channelErrorEmbed);
    }

    // Check if the user has the required role to use the command
    const staffRoleIds = config.staffRoleIds; // Replace with your actual staff role IDs
    const hasStaffRole = message.member.roles.cache.some(role => staffRoleIds.includes(role.id));

    if (!hasStaffRole) {
      const roleErrorEmbed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Error')
        .setDescription('You do not have permission to use this command.');

      return message.channel.send(roleErrorEmbed);
    }

    // Check if drop session is already active
    if (config.dropSessionActive) {
      const errorEmbed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Error')
        .setDescription('A drop session is already in progress.');

      return message.channel.send(errorEmbed);
    }

    // Check cooldown and total drop limit
    const cooldownFile = './cooldown.json'; // Path to the cooldown file
    const cooldownData = JSON.parse(fs.readFileSync(cooldownFile, 'utf8'));

    const cooldownDuration = 2 * 60 * 60 * 1000; // 24 hours in milliseconds
    const elapsedTime = Date.now() - cooldownData.startdrop;

    if (cooldownData.startdrop && elapsedTime < cooldownDuration) {
      const remainingTime = cooldownDuration - elapsedTime;
      const hours = Math.floor(remainingTime / (60 * 60 * 1000));
      const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));

      const cooldownErrorEmbed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Error')
        .setDescription(`Cooldown in effect. Please wait for ${hours} hours and ${minutes} minutes before starting another drop session.`);

      return message.channel.send(cooldownErrorEmbed);
    }

    // Check total drop limit
    if (cooldownData.totalDrops >= 3) {
      const limitErrorEmbed = new MessageEmbed()
        .setColor('#FF0000')
        .setTitle('Error')
        .setDescription('The maximum limit of 4 drops has been reached for the 24-hour period.');

      return message.channel.send(limitErrorEmbed);
    }

    // Update dropSessionActive status to true in config.json
    config.dropSessionActive = true;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    // Update cooldown timestamp and totalDrops count for startdrop
    cooldownData.startdrop = Date.now();
    cooldownData.totalDrops += 1;
    fs.writeFileSync(cooldownFile, JSON.stringify(cooldownData, null, 2));

    // Continue with your logic for starting a drop session
    // ...

    // Send success message
    const successEmbed = new MessageEmbed()
      .setColor('#00FF00')
      .setTitle('Drop Started!')
      .setDescription('A new drop session has started! Hurry up and get the drops!!');

    message.channel.send('<@&1200669551168340068>');
    message.channel.send(successEmbed);
  }
};
