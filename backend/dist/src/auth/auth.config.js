"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtOptions = jwtOptions;
function jwtOptions() {
    const secret = process.env.JWT_SECRET?.trim();
    const expiresIn = process.env.JWT_EXPIRES_IN?.trim();
    if (!secret)
        throw new Error('JWT_SECRET es obligatorio y no puede estar vacío');
    if (!expiresIn || !/^\d+$/.test(expiresIn) || Number(expiresIn) <= 0) {
        throw new Error('JWT_EXPIRES_IN debe ser un entero positivo en segundos');
    }
    return {
        secret,
        signOptions: { algorithm: 'HS256', expiresIn: Number(expiresIn) },
    };
}
