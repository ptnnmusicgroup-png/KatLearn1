"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/student-school-request.js");
exports.handler = createHandler(handler);
