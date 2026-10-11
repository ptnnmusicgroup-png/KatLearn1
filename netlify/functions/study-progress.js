const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/study-progress.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
