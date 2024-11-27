const mensajesRecientes = {};

const getMensajesRecientes = async (groupId, userId) => {
  const key = `${groupId}-${userId}`;
  if (!mensajesRecientes[key]) {
    mensajesRecientes[key] = [];
  }
  return mensajesRecientes[key];
};

const addMensajeReciente = async (groupId, userId, mensaje) => {
  const key = `${groupId}-${userId}`;
  const mensajes = await getMensajesRecientes(groupId, userId);
  mensajes.push({ mensaje, timestamp: new Date().getTime() });
  mensajesRecientes[key] = mensajes;
  // Eliminar mensajes antiguos
  const tiempoEspera = 60000; // 1 minuto
  const ahora = new Date().getTime();
  mensajesRecientes[key] = mensajesRecientes[key].filter((mensaje) => ahora - mensaje.timestamp < tiempoEspera);
};
