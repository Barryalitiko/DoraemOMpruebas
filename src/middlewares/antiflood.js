const { isActiveAntiFloodGroup } = require('../utils/database');

const antifloodMiddleware = async (message, next) => {
  const groupId = message.chat.remoteJid;
  const isAntiFloodEnabled = await isActiveAntiFloodGroup(groupId);

  if (isAntiFloodEnabled) {
    const floodThreshold = 5; // ajusta este valor según tus necesidades
    const recentMessages = await message.chat.getRecentMessages(10);
    const isFlood = recentMessages.filter((msg) => msg.from === message.from).length >= floodThreshold;

    if (isFlood) {
      await message.delete();
      return;
    }
  }

  next();
};

module.exports = antifloodMiddleware;
