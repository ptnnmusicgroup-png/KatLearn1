const runLegacyHandler = require("../legacy-handler.cjs");
const apiHandler = require("../../api/student-assigned-packs.js");

exports.handler = (event, context) => runLegacyHandler(event, context, apiHandler);
