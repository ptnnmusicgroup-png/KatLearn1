"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/context-example.js");
exports.handler = createHandler(handler);
