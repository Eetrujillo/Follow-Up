"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dummyHash = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const node_util_1 = require("node:util");
const node_crypto_1 = require("node:crypto");
const deriveKey = (0, node_util_1.promisify)(node_crypto_1.scrypt);
const HASH_PATTERN = /^scrypt\$16384\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
exports.dummyHash = `scrypt$16384$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
async function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString('hex');
    const key = (await deriveKey(password, salt, 64));
    return `scrypt$16384$8$1$${salt}$${key.toString('hex')}`;
}
async function verifyPassword(password, hash) {
    if (typeof hash !== 'string')
        return false;
    const match = HASH_PATTERN.exec(hash);
    if (!match)
        return false;
    try {
        const candidate = (await deriveKey(password, match[1], 64));
        const stored = Buffer.from(match[2], 'hex');
        return candidate.length === stored.length && (0, node_crypto_1.timingSafeEqual)(candidate, stored);
    }
    catch {
        return false;
    }
}
