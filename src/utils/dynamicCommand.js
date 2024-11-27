const { DangerError } = require("../errors/DangerError");
const { InvalidParameterError } = require("../errors/InvalidParameterError");
const { WarningError } = require("../errors/WarningError");
const { findCommandImport } = require(".");
const {
  verifyPrefix,
  hasTypeOrCommand,
  isLink,
  isAdmin,
} = require("../middlewares");
const { checkPermission } = require("../middlewares/checkPermission");
const {
  isActiveGroup,
  getAutoResponderResponse,
  isActiveAutoResponderGroup,
  isActiveAntiLinkGroup,
  getLastDeletedMessages, // Nuevo import
} = require("./database");
const { errorLog } = require("../utils/logger");
const { ONLY_GROUP_ID } = require("../config");

exports.dynamicCommand = async (paramsHandler) => {
  const {
    commandName,
    prefix,
    sendWarningReply,
    sendErrorReply,
    remoteJid,
    sendReply,
    socket,
    userJid,
    fullMessage,
    webMessage,
  } = paramsHandler;

  if (isActiveAntiLinkGroup(remoteJid) && isLink(fullMessage)) {
    if (!(await isAdmin({ remoteJid, userJid, socket }))) {
      await socket.groupParticipantsUpdate(remoteJid, [userJid], "remove");

      await sendReply(
        "👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 Baneado por enviar link"
      );

      await socket.sendMessage(remoteJid, {
        delete: {
          remoteJid,
          fromMe: false,
          id: webMessage.key.id,
          participant: webMessage.key.participant,
        },
      });

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
    await sendWarningReply(
      "👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 Grupo desactivado, contacte con el admin"
    );

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
        .map(
          (msg, idx) =>
            `@${msg.userJid.split("@")[0]}:\n*Mensaje ${idx + 1}:* ${msg.text}`
        )
        .join("\n\n");

      await sendReply(
        `Estos son los últimos mensajes borrados:\n\n${formattedMessages}`
      );
    } catch (error) {
      errorLog("Error al obtener mensajes borrados", error);
      await sendErrorReply(
        "Ocurrió un error al intentar recuperar los mensajes borrados."
      );
    }

    return;
  }

  try {
    await command.handle({
      ...paramsHandler,
      type,
    });
  } catch (error) {
    if (error instanceof InvalidParameterError) {
      await sendWarningReply(`Parametros inválidos! ${error.message}`);
    } else if (error instanceof WarningError) {
      await sendWarningReply(error.message);
    } else if (error instanceof DangerError) {
      await sendErrorReply(error.message);
    } else {
      errorLog("Error al ejecutar el comando", error);
      await sendErrorReply(
        `👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 Ocurrio un error al ejecutar el comando ${command.name}!
      
📄 *Detalles*: ${error.message}`
      );
    }
  }
};