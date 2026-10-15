const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/ai-regenerate-word.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
