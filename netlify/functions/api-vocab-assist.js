"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/vocab-assist.js");
exports.handler = createHandler(handler);
