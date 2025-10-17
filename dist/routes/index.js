"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const address_routes_1 = __importDefault(require("./address.routes"));
// ...existing code...
app.use('/enderecos', address_routes_1.default);
// ...existing code...
