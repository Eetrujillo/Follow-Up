"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateNotepadDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_notepad_dto_1 = require("./create-notepad.dto");
class UpdateNotepadDto extends (0, mapped_types_1.PartialType)(create_notepad_dto_1.CreateNotepadDto) {
}
exports.UpdateNotepadDto = UpdateNotepadDto;
