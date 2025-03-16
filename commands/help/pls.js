const { Client, MessageEmbed } = require('discord.js');
const config = require('../../config.json');

module.exports = {
  name: 'pls',
  description: 'Show support message',
   usage: 'pls',
  execute(message, usedPrefix) {
   

    const embed = new MessageEmbed()
      .setTitle(' Cheers for our staff!')
      .setDescription(` 🌟Share the love with +vouch @user in the vouching channel <#1200663201407311973>. Your appreciation brightens our day!\n
    If you're not satisfied, type -vouch @user to provide feedback. 🎉`)
      .setColor('#00ff00'); // Green color

   
   
    

    message.channel.send(embed);
  },
};
