const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/admin-hub.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
