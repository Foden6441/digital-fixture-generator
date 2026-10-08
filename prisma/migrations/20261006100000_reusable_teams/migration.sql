CREATE TABLE `competition_teams` (
    `competitionId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `competition_teams_teamId_idx`(`teamId`),
    PRIMARY KEY (`competitionId`, `teamId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `competition_teams` (`competitionId`, `teamId`)
SELECT `competitionId`, `id` FROM `teams`;

ALTER TABLE `competition_teams`
ADD CONSTRAINT `competition_teams_competitionId_fkey`
FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT `competition_teams_teamId_fkey`
FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `teams`
DROP FOREIGN KEY `teams_competitionId_fkey`,
DROP COLUMN `competitionId`;
