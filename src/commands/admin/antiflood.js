const { PREFIX } = require("../../config");
const { InvalidParameterError } = require("../../errors/InvalidParameterError");
const { activateAntiFloodGroup, deactivateAntiFloodGroup } = require("../../utils/database");

module.exports = {
  name: "antiflood",
  description: "Activa/desactiva el recurso de antiflood en el grupo.",
  commands: ["antiflood"],
  usage: `${PREFIX}antiflood (1/0)`,
  handle: async ({ args, sendReply, sendSuccessReact, remoteJid, userJid }) => {
    if (!args.length) {
      throw new InvalidParameterError("Debes proporcionar un parámetro (1/0)");
    }

    switch (args[0]) {
      case "1":
        activateAntiFloodGroup(remoteJid);
        break;
      case "0":
        deactivateAntiFloodGroup(remoteJid);
        break;
      default:
        throw new InvalidParameterError("Parámetro inválido. Debes proporcionar 1 o 0");
    }

    await sendSuccessReact();
    const context = args[0] === "1" ? "activado" : "desactivado";
    await sendReply(`El antiflood ha sido ${context}!`);
  },
};
