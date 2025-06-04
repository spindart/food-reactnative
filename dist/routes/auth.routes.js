"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const validation_middleware_1 = require("../services/validation.middleware");
const router = (0, express_1.Router)();
router.post('/register', (0, validation_middleware_1.validateBody)(validation_middleware_1.usuarioRegisterSchema), async (req, res) => {
    await auth_controller_1.AuthController.register(req, res);
});
router.post('/login', (0, validation_middleware_1.validateBody)(validation_middleware_1.usuarioLoginSchema), async (req, res) => {
    await auth_controller_1.AuthController.login(req, res);
});
router.post('/logout', (req, res) => {
    res.status(200).json({ message: 'Logout realizado com sucesso' });
});
exports.default = router;
