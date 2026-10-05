import { Injectable } from '@nestjs/common';

@Injectable()
export class FoldersService {
  create(_body?: unknown) { return 'This action adds a new folder'; }
  findAll() { return 'This action returns all folders'; }
  findOne(id: number) { return `This action returns a #${id} folder`; }
  update(id: number, _body?: unknown) { return `This action updates a #${id} folder`; }
  remove(id: number) { return `This action removes a #${id} folder`; }
}
