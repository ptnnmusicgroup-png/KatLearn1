"use strict";
const { createHandler } = require("../adapter");
const handler = require("../../api/personal-packs.js");
exports.handler = createHandler(handler);
