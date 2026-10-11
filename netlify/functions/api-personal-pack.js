"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/personal-pack.js");
exports.handler = createHandler(handler);
