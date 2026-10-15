const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/personal-packs.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
