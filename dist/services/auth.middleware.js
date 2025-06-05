"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
function authenticateJWT(req, res, next) {
    console.log('Executing authenticateJWT middleware');
    if (req.user) {
        console.log('Skipping authenticateJWT because req.user is already set:', req.user);
        return next();
    }
    if (process.env.NODE_ENV === 'test') {
        console.log('Setting req.user to { id: "1" } in test environment');
        req.user = { id: 1 };
        return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('Unauthorized: Missing or invalid Authorization header');
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        console.log('JWT verified, setting req.user to decoded token:', decoded);
        req.user = decoded;
        next();
    }
    catch (err) {
        console.log('Forbidden: Invalid JWT token');
        res.status(403).json({ message: 'Forbidden' });
    }
}
