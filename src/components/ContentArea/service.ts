import { env } from "@/env"
import { translateIntoEnglish } from "@/services/modelClothingGeneration";
import ky from "ky"

type Prams = {
    type: string;
    apiKey: string;
    image: string;
    prompt: string;
    light_source: string;
    signal: AbortSignal;
    background_image?: File | string;
    modelName: string;
}

type ITaskResult = {
    "completed_at": string,
    "created_at": string,
    "error": string,
    "id": string,
    "model": string,
    "output": string,
    "started_at": string,
    "status": string
}
const ALLOWED_SIZES = [256, 320, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024];

export const HandleImage = async (params: Prams) => {
    const { type, image, apiKey, signal, modelName } = params;
    try {
        if (type === 'Eliminate') {
            const eliminateResult: any = await onEliminate(image, apiKey, signal);
            if (eliminateResult?.image?.url) {
                return { imageUrl: eliminateResult?.image?.url }
            }
            return eliminateResult;
        }
        if (type === 'Beautify') {
            const beautifyResult: any = await onBeautify(image, apiKey, signal);
            if (beautifyResult?.output) {
                return { imageUrl: beautifyResult?.output }
            }
            return beautifyResult;
        }
        if (type === 'SupplementLightText') {
            const text = await translateIntoEnglish({ apiKey, text: params?.prompt, modelName });
            if (text?.error) {return text;}
            const supplementLightTextResult: any = await onSupplementLightText({ image, apiKey, signal, light_source: params?.light_source, prompt: text || params?.prompt })
            if (supplementLightTextResult?.images) {
                const url = supplementLightTextResult?.images[0]?.url;
                return { imageUrl: url }
            }
            return supplementLightTextResult;
        }
        if (type === 'SupplementLightImage') {
            const text = await translateIntoEnglish({ apiKey, text: params?.prompt, modelName });
            if (text?.error) { return text; }
            const supplementLightImageResult: any = await onSupplementLightImage({
                image, apiKey, signal,
                prompt: text || params?.prompt,
                light_source: params?.light_source,
                background_image: params?.background_image
            })
            if (supplementLightImageResult?.output) {
                const url = JSON.parse(supplementLightImageResult.output)[0]
                return { imageUrl: url }
            }
            return supplementLightImageResult;
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return { error: { name: error.name } };
        }
        if (error.response) {
            // 尝试从响应中解析错误信息
            try {
                const errorData = await error.response.json();
                return errorData;
            } catch (parseError) {
                return { error: parseError }
            }
        } else {
            return { error: error.message }
        }
    }
}

// 背景消除
const onEliminate = async (image: string, apiKey: string, signal: AbortSignal) => {
    return await ky.post(`${env.NEXT_PUBLIC_API_URL}/302/submit/removebg-v2`, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            image_url: image
        }),
        timeout: false,
        signal
    }).then(res => res.json())
}

// 高清人像
const onBeautify = async (image: string, apiKey: string, signal: AbortSignal) => {
    return await ky.post(`${env.NEXT_PUBLIC_API_URL}/302/submit/upscale`, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            image,
            scale: 4,
            face_enhance: true,
        }),
        timeout: false,
        signal
    }).then(res => res.json())
}

// 二次打光(text)
const onSupplementLightText = async (param: { image: string, apiKey: string, light_source: string, prompt: string, signal: AbortSignal }) => {
    const { image, apiKey, light_source, prompt, signal } = param;
    return await ky.post(`${env.NEXT_PUBLIC_API_URL}/302/submit/relight-v2`, {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            image_url: image,
            prompt,
            bg_source: light_source
        }),
        timeout: false,
        signal
    }).then(res => res.json())
}

// 二次打光(text)
const onSupplementLightImage = async (param: { image: string, apiKey: string, light_source: string, prompt: string, signal: AbortSignal, background_image?: File | string }) => {
    const { image, apiKey, light_source, prompt, signal, background_image } = param;
    const result = await imageUrlToFile(image);
    const formData = new FormData;
    formData.append('prompt', prompt)
    formData.append('bg_source', light_source)
    console.log('result', result);
    if (result.file) {
        formData.append('subject_image', result.file)
        formData.append('width', `${result.width}`)
        formData.append('height', `${result.height}`)
    }
    if (background_image) {
        if (typeof background_image === 'string') {
            const backgroundFile = await imageUrlToFile(background_image)
            if (backgroundFile?.file) {
                formData.append('background_image', backgroundFile.file)
            }
        } else {
            formData.append('background_image', background_image)
        }
    }
    return await ky.post(`${env.NEXT_PUBLIC_API_URL}/302/submit/relight-background`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        timeout: false,
        signal
    }).then(res => res.json())
}

// 查询任务结果
export const onGetTaskResult = (id: string, apiKey: string, signal: AbortSignal) => {
    const poll = async () => {
        try {
            if (signal?.aborted) {
                return;
            }
            const result: ITaskResult = await ky.get(`${env.NEXT_PUBLIC_API_URL}/302/task/${id}/fetch`, {
                headers: { "Authorization": `Bearer ${apiKey}` },
                signal
            }).json();
            if (['succeeded', 'failed'].indexOf(result.status) > -1) {
                return result; // 任务成功，返回结果
            }
            if (result.status === 'starting') {
                await new Promise(resolve => setTimeout(resolve, 3000));
                return poll(); // 递归调用继续轮询
            }
        } catch (error: any) {
            if (error.response) {
                // 尝试从响应中解析错误信息
                try {
                    const errorData = await error.response.json();
                    return errorData;
                } catch (parseError) {
                    return { error: parseError }
                }
            } else {
                return { error: error.message }
            }
        }
    };
    return poll();
}

async function imageUrlToFile(imageUrl: string, fileName = 'image.jpg'): Promise<{ file: File | null, width: number, height: number }> {
    try {
        // 获取图片数据
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 将响应转换为 Blob
        const blob = await response.blob();

        // 创建 File 对象
        const file = new File([blob], fileName, { type: blob.type });

        // 创建一个 URL 对象
        const blobUrl = URL.createObjectURL(blob);

        // 创建一个 Promise 来加载图片并获取宽高
        const dimensions = await new Promise<{ width: number, height: number }>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = reject;
            img.src = blobUrl;
        });

        // 清理 URL 对象
        URL.revokeObjectURL(blobUrl);

        return { file, ...scaleImage({ ...dimensions }) };
    } catch (error) {
        console.error('Error converting image URL to File:', error);
        return { file: null, width: 1920, height: 1080 };
    }
}

function scaleImage(params: { width: number, height: number }): { width: number, height: number } {
    // const { width, height } = params;
    let width = params.width;
    let height = params.height;
    // 如果宽度和高度都小于或等于最大允许值，无需缩放
    if (width <= 1024 && height <= 1024) {
        return { width, height };
    }

    let aspectRatio = width / height;

    // 确定哪个维度超出了最大值，并基于此计算新的尺寸
    if (width > height) {
        width = 1024;
        height = Math.round(width / aspectRatio);
    } else {
        height = 1024;
        width = Math.round(height * aspectRatio);
    }

    // 找到最接近的允许尺寸
    function findNearestSize(size: number): number {
        return ALLOWED_SIZES.reduce((prev, curr) =>
            Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
        );
    }

    width = findNearestSize(width);
    height = findNearestSize(height);

    return { width, height };
}