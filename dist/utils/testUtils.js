"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.mockAuthentication = exports.seedTestDatabase = exports.clearTestDatabase = exports.teardownTestDatabase = exports.setupTestDatabase = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const setupTestDatabase = async () => {
    // Add logic to seed the database with test data if needed
    console.log('Setting up test database...');
};
exports.setupTestDatabase = setupTestDatabase;
const teardownTestDatabase = async () => {
    // Add logic to clean up the database after tests
    console.log('Tearing down test database...');
    await prisma.$disconnect();
};
exports.teardownTestDatabase = teardownTestDatabase;
const clearTestDatabase = async () => {
    await prisma.produto.deleteMany(); // Delete related products first
    await prisma.avaliacao.deleteMany();
    await prisma.estabelecimento.deleteMany();
};
exports.clearTestDatabase = clearTestDatabase;
const seedTestDatabase = async () => {
    await (0, exports.clearTestDatabase)();
    await prisma.estabelecimento.create({
        data: {
            id: 1,
            nome: 'Test Establishment',
            descricao: 'A test establishment for unit tests.',
            endereco: '123 Test Street',
            avaliacao: 4.5,
            avaliacoesCount: 10,
            donoId: 1,
        },
    });
    await prisma.estabelecimento.create({
        data: {
            id: 2,
            nome: 'Another Test Establishment',
            descricao: 'Another test establishment for unit tests.',
            endereco: '456 Test Avenue',
            avaliacao: 4.0,
            avaliacoesCount: 5,
            donoId: 1,
        },
    });
};
exports.seedTestDatabase = seedTestDatabase;
const mockAuthentication = (app) => {
    console.log('Applying mock authentication middleware');
    app.use((req, res, next) => {
        if (!req.user) {
            console.log('Setting req.user to { id: 1 }');
            req.user = { id: 1 }; // Use integer ID for consistency
        }
        else {
            console.log('req.user already set by another middleware:', req.user);
        }
        next();
    });
};
exports.mockAuthentication = mockAuthentication;
