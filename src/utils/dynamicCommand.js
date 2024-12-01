const { DangerError } = require("../errors/DangerError");
const { InvalidParameterError } = require("../errors/InvalidParameterError");
const { WarningError } = require("../errors/WarningError");
const { findCommandImport } = require(".");
const { verifyPrefix, hasTypeOrCommand } = require("../middlewares");
const { checkPermission } = require("../middlewares/checkPermission");
const { isActiveGroup, getAutoResponderResponse, isActiveAutoResponderGroup, isActiveAntiLinkGroup, getLastDeletedMessages } = require("./database");
const { errorLog } = require("../utils/logger");
const { ONLY_GROUP_ID } = require("../config");
const { getMensajesRecientes, addMensajeReciente } = require("../utils/database");
const { isActiveAntiFloodGroup } = require("../utils/database");

exports.dynamicCommand = async (paramsHandler) => {
  const { commandName, prefix, sendWarningReply, sendErrorReply, remoteJid, sendReply, socket, userJid, fullMessage, webMessage } = paramsHandler;

  // Verificar si el grupo tiene activado el antiflood
  if (!isActiveAntiFloodGroup(remoteJid)) {
    return;
  }

  // Verificar si el usuario es administrador
  const isUserAdmin = await isAdmin({ remoteJid, userJid, socket });
  if (isUserAdmin) {
    return; // No hacer nada si es admin
  }

  // Obtener los mensajes recientes del usuario
  const mensajesRecientes = await getMensajesRecientes(remoteJid, userJid);

  // Si el usuario ha enviado más de 5 mensajes en menos de 10 segundos, se activa el antiflood
  const tiempoEspera = 10000; // 10 segundos
  const maxMensajes = 5; // Máximo de 5 mensajes
  const ahora = new Date().getTime();
  const mensajesRecientesFiltrados = mensajesRecientes.filter((msg) => ahora - msg.timestamp < tiempoEspera);

  if (mensajesRecientesFiltrados.length > maxMensajes) {
    try {
      await socket.groupParticipantsUpdate(remoteJid, [userJid], "remove");
      await sendReply(`👻 *Krampus.bot* 👻\n\nEl usuario @${userJid.split("@")[0]} fue eliminado por enviar demasiados mensajes en un corto periodo de tiempo.`);
      await socket.sendMessage(remoteJid, { delete: { remoteJid, fromMe: false, id: webMessage.key.id, participant: webMessage.key.participant } });
    } catch (error) {
      console.error("Error eliminando al usuario por flood:", error);
      await sendErrorReply("Hubo un error al intentar eliminar al usuario.");
    }
    return;
  }

  // Añadir el mensaje reciente a la base de datos
  await addMensajeReciente(remoteJid, userJid, fullMessage);

  // Revisión del link anti-flood
  if (isActiveAntiLinkGroup(remoteJid) && isLink(fullMessage)) {
    if (!(await isAdmin({ remoteJid, userJid, socket }))) {
      await socket.groupParticipantsUpdate(remoteJid, [userJid], "remove");
      await sendReply("👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 Baneado por enviar link");
      await socket.sendMessage(remoteJid, { delete: { remoteJid, fromMe: false, id: webMessage.key.id, participant: webMessage.key.participant } });
      return;
    }
  }

  const { type, command } = findCommandImport(commandName);
  if (ONLY_GROUP_ID && ONLY_GROUP_ID !== remoteJid) {
    return;
  }
  if (!verifyPrefix(prefix) || !hasTypeOrCommand({ type, command })) {
    if (isActiveAutoResponderGroup(remoteJid)) {
      const response = getAutoResponderResponse(fullMessage);
      if (response) {
        await sendReply(response);
      }
    }
    return;
  }
  if (!(await checkPermission({ type, ...paramsHandler }))) {
    await sendErrorReply("👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 No tienes permitido usar el comando");
    return;
  }
  
if (!isActiveGroup(remoteJid) && command.name !== "on") {
  await sendWarningReply("👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 Grupo desactivado, contacte con el admin");
  return;
}
if (commandName === "lastdeleted") {
  try {
    const deletedMessages = getLastDeletedMessages(remoteJid, 6);
    if (!deletedMessages || deletedMessages.length === 0) {
      await sendReply("No se encontraron mensajes borrados recientes.");
      return;
    }
    const formattedMessages = deletedMessages
      .map((msg, idx) => `@${msg.userJid.split("@")[0]}:\n*Mensaje ${idx + 1}:* ${msg.text}`)
      .join("\n\n");
    await sendReply(`Estos son los últimos mensajes borrados:\n\n${formattedMessages}`);
  } catch (error) {
    errorLog("Error al obtener mensajes borrados", error);
    await sendErrorReply("Ocurrió un error al intentar recuperar los mensajes borrados.");
  }
  return;
}
try {
  await command.handle({ ...paramsHandler, type });
} catch (error) {
  if (error instanceof InvalidParameterError) {
    await sendWarningReply(`Parametros inválidos! ${error.message}`);
  } else if (error instanceof WarningError) {
    await sendWarningReply(error.message);
  } else if (error instanceof DangerError) {
    await sendErrorReply(error.message);
  } else {
    errorLog("Error al ejecutar el comando", error);
    await sendErrorReply(`👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 Ocurrio un error al ejecutar el comando ${command.name}! 📄 *Detalles*: ${error.message}`);
  }
}
};