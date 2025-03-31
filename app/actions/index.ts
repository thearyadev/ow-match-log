import OpenAI from 'openai'
import { tryCatch } from '@/lib/try-catch'

export const getOpenAiClient = () => {
    return
}

async function balls(a: number) {
    if (a === 1) {
        throw new Error('a is 1')
    }
    return a + 1
}

async function t() {
    const { data: result, error } = await tryCatch(balls(1))
    if (error) {
        console.error(error)
        return
    }
    const r = result
}
