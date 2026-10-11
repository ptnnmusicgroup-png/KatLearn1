"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/student-assigned-packs.js");
exports.handler = createHandler(handler);
