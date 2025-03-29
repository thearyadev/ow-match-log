import { drizzle } from 'drizzle-orm/libsql'
import { migrate, } from 'drizzle-orm/libsql/migrator'

export const db = drizzle(`file:${process.env.DB_FILE_PATH}`)

export async function runMigration() {
    try {
        await migrate(db, { migrationsFolder: './drizzle/' })
        console.log('Migration completed ✅')
    } catch (error) {
        console.error('Migration failed 🚨:', error)
    }
}

