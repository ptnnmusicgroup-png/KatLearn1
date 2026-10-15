const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/study-coach.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
