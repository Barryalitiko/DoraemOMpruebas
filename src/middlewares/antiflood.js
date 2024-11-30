const { getMensajesRecientes, isActiveAntiFloodGroup } = require("../utils/database");
const { isAdmin } = require("../utils/loadCommonFunctions");

exports.handleAntiFlood = async ({ client, webMessage, sendReact, sendReply, socket }) => {
  const remoteJid = webMessage.key.remoteJid;
  const userId = webMessage.key.participant || webMessage.key.remoteJid;

  // Verificar si el grupo tiene activado el antiflood
  if (!isActiveAntiFloodGroup(remoteJid)) {
    return;
  }

  // Verificar si el usuario es administrador
  const isUserAdmin = await isAdmin({ remoteJid, userJid: userId, socket });
  if (isUserAdmin) {
    return; // No hacer nada si es admin
  }

  // Obtener los mensajes recientes del usuario
  const mensajesRecientes = await getMensajesRecientes(remoteJid, userId);

  // Si el usuario ha enviado más de 5 mensajes en menos de 10 segundos, se activa el antiflood
  const tiempoEspera = 10000; // 10 segundos
  const maxMensajes = 5; // Máximo de 5 mensajes
  const ahora = new Date().getTime();
  const mensajesRecientesFiltrados = mensajesRecientes.filter((msg) => ahora - msg.timestamp < tiempoEspera);

  if (mensajesRecientesFiltrados.length >= maxMensajes) {
    try {
      await client.groupParticipantsUpdate(remoteJid, [userId], "remove");
      await client.sendMessage(remoteJid, {
        text: `👻 *Krampus.bot* 👻\n\nEl usuario @${userId.split("@")[0]} fue eliminado por enviar demasiados mensajes en un corto periodo de tiempo.`,
        mentions: [userId],
      });
      await sendReact("❌");
    } catch (error) {
      console.error("Error eliminando al usuario por flood:", error);
      await sendReply("Hubo un error al intentar eliminar al usuario.");
    }
  }
};

