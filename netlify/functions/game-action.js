const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/game-action.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
