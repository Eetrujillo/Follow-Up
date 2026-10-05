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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const class_validator_1 = require("class-validator");
const users_service_1 = require("../../users/users.service");
const auth_config_1 = require("../auth.config");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    users;
    constructor(users) {
        const options = (0, auth_config_1.jwtOptions)();
        const secret = options.secret;
        if (typeof secret !== 'string') {
            throw new Error('JWT_SECRET debe ser un string válido');
        }
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
            algorithms: ['HS256'],
        });
        this.users = users;
    }
    async validate(payload) {
        if (typeof payload.sub !== 'string' || !(0, class_validator_1.isUUID)(payload.sub) || typeof payload.exp !== 'number') {
            throw new common_1.UnauthorizedException('Token inválido');
        }
        try {
            return await this.users.findOne(payload.sub);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw new common_1.UnauthorizedException('Usuario no autorizado');
            }
            throw error;
        }
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(users_service_1.UsersService)),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], JwtStrategy);
