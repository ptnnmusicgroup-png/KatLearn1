"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/admin-hub.js");
exports.handler = createHandler(handler);
