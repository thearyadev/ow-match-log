import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const match = sqliteTable('match', {
    id: int().primaryKey({ autoIncrement: true }),
    mapName: text().notNull(),
    result: text().notNull(),
    scoreSelf: int().notNull(),
    scoreOpponent: int().notNull(),
    duration: text().notNull(),
    matchTimestamp: text().notNull(),
    matchType: text().notNull(),
})
