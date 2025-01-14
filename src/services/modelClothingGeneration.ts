'use server'
import { env } from '@/env';
import ky from 'ky';
import { OpenAI } from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

type IParams = {
    type: 'model' | 'clothing';
    apiKey: string;
    gender?: string;
    age?: string;
    describe: string;
    proportion: string;
    modelName: string
}

const modelSystemPrompt = `You are a professional model image description expert, specializing in creating detailed model image descriptions based on user input. Please extract and organize the model's characteristics from the user's provided description. 
The description should include, but is not limited to, the following aspects: gender, age range, standing pose, clothing, image background, and expression. If the user does not provide certain information, please randomly generate it using the following default values: female, in her twenties, standing pose, fashionable casual wear, gray background, smiling expression.

In the generated description, be sure to emphasize the following keywords: model image, studio shot, full-body composition, fashion photography. Ensure that all descriptive terms are separated by commas and translated into English. The generated description should begin with "Super Portrait v2" to ensure the correct image generation trigger.

Example output format: Super Portrait v2, [approximate age] [ethnicity] [gender] with [skin tone], [expression], wearing [clothing], [background features], full-body composition, fashion photography, [standing pose], [overall style]

Example output: Super Portrait v2, A young European woman with fair skin, gentle smile, wearing a white sweater cardigan, a cream-colored smooth silk slip dress, white Mary Jane shoes, studio lighting, pink background, full-body composition, fashion photography, standing pose, casual elegant style.`


const clothingSystemPrompt = `You are a professional fashion description expert. Based on user input, create concise clothing descriptions focusing on essential features. Extract the garment's characteristics from the user's provided details, including color, department, detail, fabric elasticity, fit, hemline, material, neckline, pattern, sleeve length, style, type, and waistline. If certain information is missing, use default values: color - black, department - dresses, detail - simple design, fabric elasticity - medium stretch, fit - regular, hemline - knee-length, material - cotton blend, neckline - round neck, pattern - solid, sleeve length - short, style - casual, type - A-line, waistline - regular.
Ensure that the generated description is for the clothing item only, without any individuals wearing it, and specify a white background. In the generated description, emphasize key features using concise language. Ensure all terms are separated by commas and translated into English. The description should begin with "Fashion Item" to ensure context.
Example output format: Fashion Item, [Color] [Department] with [Detail], featuring [Fabric-Elasticity] fabric, [Fit] fit. The [Hemline] hemline. Made from [Material], with a [Neckline] neckline and [Pattern] pattern. [Sleeve-Length] sleeves, [Style] style, [Type], [Waistline] waistline.
Example output: Fashion Item, Light pink trench coat with cream-colored lining, featuring medium stretch fabric, regular fit. Knee-length hemline. Made from high-quality fabric, with a classic collar neckline and solid pattern. Long sleeves, versatile style, trench coat, belted waistline.`

const clothingNegativePrompt = `partial, incomplete, cropped,folded, missing parts, close-up`;

export const modelClothingGeneration = async (params: IParams) => {
    const { apiKey, proportion, describe, modelName, type } = params;
    const fetchUrl = env.NEXT_PUBLIC_API_URL + '/v1'
    const openai = new OpenAI({ apiKey, baseURL: fetchUrl });

    const messages: Array<ChatCompletionMessageParam> = [
        { role: 'system', content: type === 'model' ? modelSystemPrompt : clothingSystemPrompt },
        { role: "user", content: (params?.age && params?.gender) ? `${params.gender},${params.age},${describe}` : describe }
    ]

    try {
        const response = await openai.chat.completions.create({
            model: modelName,
            stream: false,
            messages
        });
        if (response?.choices[0]?.message?.content) {
            const prompt = response?.choices[0]?.message?.content;
            const result = await onGeneration({ prompt, proportion, apiKey, type })
            return result;
        }
        return { error: 'Generation failed' }
    } catch (error: any) {
        return { ...error }
    }
}

// 翻译为英语
export const translateIntoEnglish = async (params: { apiKey: string, text: string, modelName: string }) => {
    const { apiKey, modelName, text } = params;
    const fetchUrl = env.NEXT_PUBLIC_API_URL + '/v1'
    const openai = new OpenAI({ apiKey, baseURL: fetchUrl });

    const messages: Array<ChatCompletionMessageParam> = [
        { role: 'system', content: 'Translate into English' },
        { role: "user", content: text }
    ]
    try {
        const response = await openai.chat.completions.create({
            model: modelName,
            stream: false,
            messages
        });
        if (response?.choices[0]?.message?.content) {
            const prompt = response?.choices[0]?.message?.content;
            return prompt;
        }
        return { error: 'Generation failed' }
    } catch (error: any) {
        return { ...error }
    }
}


const onGeneration = async (props: { prompt: string, proportion: string, apiKey: string, type: 'model' | 'clothing'; }) => {
    const { prompt, apiKey, proportion, type } = props;
    try {
        const body = JSON.stringify({
            prompt,
            image_size: fluxSize(proportion),
            num_inference_steps: 28,
            guidance_scale: 3.5,
            negative_prompt: type === 'clothing' ? `${clothingNegativePrompt}, body, limbs, nsfw ,head` : '',
            loras: type === 'clothing' ? [] : [
                {
                    path: "strangerzonehf/Flux-Super-Portrait-LoRA",
                    scale: 1
                }
            ]
        })
        const result = await ky(`${env.NEXT_PUBLIC_API_URL}/302/submit/flux-lora`, {
            method: 'post',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body,
            timeout: false,
        }).then(res => res.json())
        return result;
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
}

const fluxSize = (type: string) => {
    switch (type) {
        case '1:1':
            return { width: 1024, height: 1024 }
        case '2:3':
            return { width: 836, height: 1254 }
        case '3:4':
            return { width: 887, height: 1182 }
        case '9:16':
            return { width: 768, height: 1365 }
    }
}

