"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const password_1 = require("../auth/password");
const prisma_error_1 = require("../prisma/prisma-error");
function toPublicUser(user) {
    const { id, fullName, email, createdAt } = user;
    return { id, fullName, email, createdAt };
}
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existingUser)
            throw new common_1.ConflictException('El correo electrónico ya está registrado');
        try {
            const user = await this.prisma.user.create({
                data: {
                    id: (0, node_crypto_1.randomUUID)(),
                    fullName: dto.fullName,
                    email: dto.email,
                    passwordHash: await (0, password_1.hashPassword)(dto.password),
                },
                select: { id: true, fullName: true, email: true, createdAt: true },
            });
            return toPublicUser(user);
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
    async findOne(id) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
                select: { id: true, fullName: true, email: true, createdAt: true },
            });
            if (!user)
                throw new common_1.NotFoundException('Usuario no encontrado');
            return toPublicUser(user);
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
    findCredentialsByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
            select: { id: true, passwordHash: true },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
