import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const match = sqliteTable('match', {
    id: int().primaryKey({ autoIncrement: true }),
    mapName: text().notNull(),
    result: text().notNull(),
    scoreSelf: int().notNull(),
    scoreOpponent: int().notNull(),
    duration: int().notNull(),
    matchTimestamp: text().notNull(),
    matchType: text().notNull(),
    collectionId: int()
        .notNull()
        .references(() => collection.id),
})

export const collection = sqliteTable('collection', {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
})
