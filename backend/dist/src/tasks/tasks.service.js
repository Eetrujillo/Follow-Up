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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const node_crypto_1 = require("node:crypto");
const prisma_error_1 = require("../prisma/prisma-error");
let TasksService = class TasksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDefaultUserId() {
        const user = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!user) {
            throw new common_1.NotFoundException('No hay usuarios registrados');
        }
        return user.id;
    }
    async create(dto) {
        const userId = await this.getDefaultUserId();
        try {
            return await this.prisma.task.create({
                data: {
                    id: (0, node_crypto_1.randomUUID)(),
                    userId,
                    description: dto.description,
                    origin: dto.origin ?? 'DASHBOARD',
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                },
            });
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
    async findAll() {
        const userId = await this.getDefaultUserId();
        try {
            return await this.prisma.task.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
    async update(taskId, dto) {
        const userId = await this.getDefaultUserId();
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, userId },
        });
        if (!task) {
            throw new common_1.NotFoundException('La tarea no existe o no pertenece al usuario');
        }
        try {
            return await this.prisma.task.update({
                where: { id: taskId },
                data: {
                    ...(dto.description !== undefined && { description: dto.description }),
                    ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
                    ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
                },
            });
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
    async remove(taskId) {
        const userId = await this.getDefaultUserId();
        const task = await this.prisma.task.findFirst({
            where: { id: taskId, userId },
        });
        if (!task) {
            throw new common_1.NotFoundException('La tarea no existe o no pertenece al usuario');
        }
        try {
            return await this.prisma.task.delete({
                where: { id: taskId },
            });
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
