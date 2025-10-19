-- AddForeignKey
ALTER TABLE "StockLog" ADD CONSTRAINT "StockLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
