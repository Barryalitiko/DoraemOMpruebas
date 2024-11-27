
const { PREFIX } = require("../../config");
const { getLastDeletedMessages } = require("../../utils/database");

module.exports = {
  name: "lastdeleted",
  description: "Muestra los últimos 6 mensajes borrados en el grupo.",
  usage: `${PREFIX}lastdeleted`,
  commands: ["lastdeleted"],
  async handle({ remoteJid, sendReply }) {
    try {
      // Obtener los últimos 6 mensajes borrados
      const deletedMessages = getLastDeletedMessages(remoteJid);
      if (!deletedMessages || deletedMessages.length === 0) {
        await sendReply("No se encontraron mensajes borrados recientes.");
        return;
      }

      // Formatear los mensajes para mostrarlos
      const formattedMessages = deletedMessages
        .map((msg, idx) => {
          const userId = msg.userId.split("@")[0];
          return `@${userId}:\n*Mensaje ${idx + 1}:* ${msg.messageText}`;
        })
        .join("\n\n");

      // Enviar la respuesta con los mensajes
      await sendReply(`Estos son los últimos mensajes borrados:\n\n${formattedMessages}`);
    } catch (error) {
      console.error("Error al obtener los mensajes borrados:", error);
      await sendReply("Ocurrió un error al intentar recuperar los mensajes borrados.");
    }
  },
};
