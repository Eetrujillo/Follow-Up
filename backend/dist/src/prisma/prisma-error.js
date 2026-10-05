"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rethrowPrismaError = rethrowPrismaError;
const common_1 = require("@nestjs/common");
const client_1 = require("../../generated/prisma/client");
function rethrowPrismaError(error) {
    if (error instanceof common_1.HttpException) {
        throw error;
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            throw new common_1.ConflictException('El recurso ya existe');
        }
        if (error.code === 'P2025') {
            throw new common_1.NotFoundException('El recurso no existe');
        }
    }
    throw new common_1.InternalServerErrorException('No se pudo completar la operación');
}
