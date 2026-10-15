const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/context-example.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
