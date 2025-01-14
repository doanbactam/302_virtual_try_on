import { env } from "@/env";

export const upload = (files: FileList) => {
    return Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`${env.NEXT_PUBLIC_AUTH_API_URL}/gpt/api/upload/gpt/image`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`) }
            const imageResult = await response.json();
            return imageResult?.data?.url;
        } catch (error) {
            console.error(`Error uploading file ${file.name}:`, error);
            return null;
        }
    });
} 
