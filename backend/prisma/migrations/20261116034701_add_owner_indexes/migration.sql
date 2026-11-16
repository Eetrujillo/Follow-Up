-- Every list endpoint filters by owner (`where: { userId }`), and the schema had
-- no index on those columns, so each listing was a sequential scan.
CREATE INDEX "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");
CREATE INDEX "Document_userId_idx" ON "Document"("userId");
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");
CREATE INDEX "Task_userId_idx" ON "Task"("userId");
