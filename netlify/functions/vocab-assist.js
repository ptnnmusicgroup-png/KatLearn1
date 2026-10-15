const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/vocab-assist.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
