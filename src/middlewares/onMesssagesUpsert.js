const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { handleAntiLongText } = require("../middlewares/antiLongText");
const { addDeletedMessage } = require("../utils/database");
const { getMensajesRecientes, addMensajeReciente } = require("./antiflood");
const { handleAntiFlood } = require("../middlewares/antiFlood");

const antifloodMiddleware = async (commonFunctions, webMessage, socket) => {
  const groupId = webMessage.key.remoteJid;
  const userId = webMessage.key.participant || webMessage.key.remoteJid;
  const mensaje = webMessage.message;

  // Verificar si el grupo tiene antiflood activado
  if (!isActiveAntiFloodGroup(groupId)) {
    return;
  }

  const mensajesRecientes = await getMensajesRecientes(groupId, userId);
  const maxMensajes = 5; // Máximo de mensajes permitidos en 1 minuto
  const tiempoEspera = 60000; // 1 minuto en milisegundos

  if (mensajesRecientes.length >= maxMensajes) {
    // El usuario ha enviado demasiados mensajes, eliminar el mensaje actual
    await commonFunctions.deleteMessage(webMessage.key);
    return true; // Indica que el mensaje ha sido bloqueado por el antiflood
  }

  // Añadir el mensaje reciente a la base de datos
  await addMensajeReciente(groupId, userId, mensaje);
  return false; // El mensaje pasa la verificación
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

    // Middleware para antiflood
    const isFlooded = await antifloodMiddleware(commonFunctions, webMessage, socket);

    // Si el mensaje fue bloqueado por antiflood, no procesarlo más
    if (isFlooded) {
      continue;
    }

    if (webMessage.message && webMessage.message.delete) {
      const groupId = webMessage.key.remoteJid;
      const userId = webMessage.key.participant || webMessage.key.remoteJid;
      const messageText = webMessage.message?.conversation || webMessage.message?.extendedTextMessage?.text;
      if (messageText) {
        addDeletedMessage(groupId, userId, messageText);
      }
    }

    // Ejecutar el comando dinámico si no es un mensaje de flood
    await dynamicCommand(commonFunctions);
  }
};