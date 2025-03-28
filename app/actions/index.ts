import { createServerFn } from '@tanstack/react-start'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'

export const getOpenAiClient = () => {
    return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    })
}
