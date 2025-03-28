CREATE TABLE `match` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mapName` text NOT NULL,
	`result` text NOT NULL,
	`scoreSelf` integer NOT NULL,
	`scoreOpponent` integer NOT NULL,
	`duration` text NOT NULL,
	`matchTimestamp` text NOT NULL,
	`matchType` text NOT NULL
);
