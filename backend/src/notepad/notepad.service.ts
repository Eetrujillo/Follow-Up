import { Injectable } from '@nestjs/common';

@Injectable()
export class NotepadService {
  create(_body?: unknown) { return 'This action adds a new notepad'; }
  findAll() { return 'This action returns all notepad'; }
  findOne(id: number) { return `This action returns a #${id} notepad`; }
  update(id: number, _body?: unknown) { return `This action updates a #${id} notepad`; }
  remove(id: number) { return `This action removes a #${id} notepad`; }
}
