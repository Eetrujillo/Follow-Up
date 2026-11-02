export class Document {
  id!: string;
  folderId!: string;
  userId!: string;
  title!: string;
  contentHtml!: string;
  fromNotepad!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
