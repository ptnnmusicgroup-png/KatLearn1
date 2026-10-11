const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/personal-pack-action.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
