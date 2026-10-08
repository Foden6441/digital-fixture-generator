ALTER TABLE `venues`
ADD COLUMN `homeTeamId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `venues_homeTeamId_key` ON `venues`(`homeTeamId`);

ALTER TABLE `venues`
ADD CONSTRAINT `venues_homeTeamId_fkey`
FOREIGN KEY (`homeTeamId`) REFERENCES `teams`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
