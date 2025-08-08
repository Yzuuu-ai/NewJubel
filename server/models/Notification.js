// Prisma model sudah didefinisikan di schema.prisma
// File ini hanya untuk export prisma client jika diperlukan
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;