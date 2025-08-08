/*
  Warnings:

  - A unique constraint covering the columns `[nomor_telepon]` on the table `profile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Profile_nomor_telepon_key` ON `profile`(`nomor_telepon`);
