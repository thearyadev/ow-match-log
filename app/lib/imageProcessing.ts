import sharp from 'sharp'

export function convertImageUrlToBuffer(imageUrl: string): Buffer {
    const base64ImageData = imageUrl.split(',')[1]
    return Buffer.from(base64ImageData, 'base64')
}
export async function preprocessImage(imageUrl: string): Promise<string> {
    const buffer = convertImageUrlToBuffer(imageUrl)
    const imageObject = sharp(buffer)
    // get image dimensions
    const { width, height } = (await imageObject.metadata()) as {
        width: number
        height: number
    }
    // shrink and crop
    const resizedImage = await imageObject
        .extract({
            width: Math.round(width / 1.38),
            height: Math.round(height / 1.9),
            top: Math.round(height / 3.2),
            left: Math.round(width / 4.26),
        })
        .toBuffer()

    return `data:image/jpeg;base64,${resizedImage.toString('base64')}`
}
