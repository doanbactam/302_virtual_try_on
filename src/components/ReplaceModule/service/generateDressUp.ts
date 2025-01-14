import { env } from "@/env";
import ky from "ky"

type Params = {
    apiKey: string
    dressModel: 'Kling' | 'FASHN' | 'Virtual-Tryon';
    isLongTops: boolean;
    model_image: string;
    garment_image: string;
    clothingType: 'tops' | 'bottoms' | 'one-pieces';
    signal?: AbortSignal
}

type FashnTryon = {
    model_image: string,
    garment_image: string,
    category: 'tops' | 'bottoms' | 'one-pieces';
    long_top: boolean;
}

type VirtualTryOn = {
    human_image: string;
    cloth_image: string;
}

type VirtualTryon = {
    human_image_url: string;
    garment_image_url: string;
}

export type VirtualTryOnTask = {
    code: number;
    data: {
        task_id: string;
        task_status: string;
        task_result?: {
            images: Array<{
                index: number;
                url: string
            }>
        }
    },
    message: string;
    error?: any;
}

export const generateDressUp = async (params: Params) => {
    const { garment_image, model_image, apiKey } = params;
    try {
        let body: FashnTryon | VirtualTryOn | VirtualTryon = {
            model_image,
            garment_image,
            category: params.clothingType,
            long_top: params.isLongTops,
        }
        if (params.dressModel === 'Kling') {
            body = { human_image: model_image, cloth_image: garment_image }
            const virtualTryOnResult = await onVirtualTryOn(body, apiKey, params.signal);
            return virtualTryOnResult;
        }
        if (params.dressModel === 'Virtual-Tryon') {
            body = { human_image_url: model_image, garment_image_url: garment_image }
            const virtualTryOnResult = await onVirtualTryon2(body, apiKey);
            return virtualTryOnResult;
        }
        const fashnTryonResult = await onFashnTryon(body, apiKey, params.signal);
        return fashnTryonResult;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return error;
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

// Fashn-Tryon（虚拟穿衣）
const onFashnTryon = async (body: FashnTryon, apiKey: string, signal?: AbortSignal) => {
    const result = await ky(`${env.NEXT_PUBLIC_API_URL}/302/submit/fashn-tryon`, {
        method: 'post',
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ...body,
            "nsfw_filter": true,
            "garment_photo_type": "auto",
            "cover_feet": true,
            "adjust_hands": true,
            "restore_background": true,
            "restore_clothes": true,
            "guidance_scale": 2,
            "timesteps": 30,
            "seed": 8764440
        }),
        signal,
        timeout: false
    }).then(res => res.json())
    return result;
}

// Virtual-Try-On（虚拟试穿）
const onVirtualTryOn = async (body: VirtualTryOn, apiKey: string, signal?: AbortSignal) => {
    const result: VirtualTryOnTask = await ky(`${env.NEXT_PUBLIC_API_URL}/klingai/kolors-virtual-try-on`, {
        method: 'post',
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ...body,
            "model_name": "kolors-virtual-try-on-v1-5",
        }),
        signal
    }).then(res => res.json())
    return result;
}

// Virtual-Try-On（虚拟试穿结果查询）
export const onVirtualTryOnTask = async (id: string, apiKey: string, signal?: AbortSignal) => {
    const poll = async () => {
        try {
            if (signal?.aborted) {
                return;
            }
            const result: VirtualTryOnTask = await ky.get(`${env.NEXT_PUBLIC_API_URL}/klingai/task/${id}/fetch`, {
                headers: { "Authorization": `Bearer ${apiKey}` },
                signal
            }).json();
            if (result?.data?.task_status === 'succeed') {
                return result; // 任务成功，返回结果
            }
            if (result?.data?.task_status === 'submitted') {
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

// Virtual-Tryon（虚拟穿衣）
const onVirtualTryon2 = async (body: VirtualTryon, apiKey: string) => {
    const result: VirtualTryOnTask = await ky(`${env.NEXT_PUBLIC_API_URL}/302/submit/virtual-tryon`, {
        method: 'post',
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ...body,
            "num_inference_steps": 50,
            "guidance_scale": 2.5,
            "enable_safety_checker": true,
            "output_format": "png",
        })
    }).then(res => res.json())
    return result;
}

// Virtual-Tryon（虚拟试穿结果查询）
export const onVirtualTryonTask2 = async (id: string, apiKey: string, signal?: AbortSignal) => {
    const poll = async () => {
        if (signal?.aborted) {
            return;
        }
        try {
            const result: any = await ky.get(`${env.NEXT_PUBLIC_API_URL}/302/submit/virtual-tryon`, {
                headers: { "Authorization": `Bearer ${apiKey}` },
                searchParams: {
                    request_id: id
                },
                signal,
                timeout: false
            }).json();
            console.log('result', result);

            if (result?.image?.url) {
                return result; // 任务成功，返回结果
            }
            if (result?.status === 'IN_QUEUE' || result?.detail === 'Request is still in progress') {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return poll(); // 递归调用继续轮询
            }
        } catch (error) {
            console.error('Polling error:', error);
            throw error;
        }
    };
    return poll();
}


