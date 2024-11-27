const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { handleAntiLongText } = require("../middlewares/antiLongText");
const { addDeletedMessage } = require("../utils/database");
const { getMensajesRecientes, addMensajeReciente } = require("./antiflood");

const antifloodMiddleware = async (commonFunctions, webMessage) => {
  const groupId = webMessage.key.remoteJid;
  const userId = webMessage.key.participant || webMessage.key.remoteJid;
  const mensaje = webMessage.message;

  const mensajesRecientes = await getMensajesRecientes(groupId, userId);
  const maxMensajes = 5; // Máximo de mensajes permitidos en 1 minuto
  const tiempoEspera = 60000; // Tiempo de espera en milisegundos (1 minuto)

  if (mensajesRecientes.length >= maxMensajes) {
    // El usuario ha enviado demasiados mensajes, eliminar el mensaje actual
    await commonFunctions.deleteMessage(webMessage.key);
    return;
  }

  await addMensajeReciente(groupId, userId, mensaje);
};

exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) {
    return;
  }

  for (const webMessage of messages) {
    const commonFunctions = loadCommonFunctions({ socket, webMessage });
    if (!commonFunctions) {
      continue;
    }

    await antifloodMiddleware(commonFunctions, webMessage);

    if (webMessage.message && webMessage.message.delete) {
      const groupId = webMessage.key.remoteJid;
      const userId = webMessage.key.participant || webMessage.key.remoteJid;
      const messageText = webMessage.message?.conversation || webMessage.message?.extendedTextMessage?.text;
      if (messageText) {
        addDeletedMessage(groupId, userId, messageText);
      }
    }

    await dynamicCommand(commonFunctions);
  }
};

