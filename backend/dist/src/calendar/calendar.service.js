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
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const node_crypto_1 = require("node:crypto");
const prisma_error_1 = require("../prisma/prisma-error");
let CalendarService = class CalendarService {
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
            return await this.prisma.$transaction(async (tx) => {
                const dueDate = new Date(dto.year, dto.month - 1, dto.day);
                const task = await tx.task.create({
                    data: {
                        id: (0, node_crypto_1.randomUUID)(),
                        userId,
                        description: `Evento: ${dto.title}`,
                        origin: 'CALENDAR',
                        dueDate,
                    },
                });
                const event = await tx.calendarEvent.create({
                    data: {
                        id: (0, node_crypto_1.randomUUID)(),
                        userId,
                        title: dto.title,
                        colorHex: dto.colorHex ?? '#3B82F6',
                        eventDate: dueDate,
                        linkedTaskId: task.id,
                    },
                    include: {
                        Task: true,
                    },
                });
                return event;
            });
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
    async findAll(month, year) {
        const userId = await this.getDefaultUserId();
        try {
            return await this.prisma.calendarEvent.findMany({
                where: { userId },
                include: {
                    Task: true,
                },
                orderBy: { eventDate: 'asc' },
            });
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
    async remove(eventId) {
        const userId = await this.getDefaultUserId();
        const event = await this.prisma.calendarEvent.findFirst({
            where: { id: eventId, userId },
        });
        if (!event) {
            throw new common_1.NotFoundException('El evento no existe o no pertenece al usuario');
        }
        try {
            return await this.prisma.$transaction(async (tx) => {
                if (event.linkedTaskId) {
                    await tx.task.delete({
                        where: { id: event.linkedTaskId },
                    }).catch(() => null);
                }
                return tx.calendarEvent.delete({
                    where: { id: eventId },
                });
            });
        }
        catch (error) {
            (0, prisma_error_1.rethrowPrismaError)(error);
        }
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CalendarService);
