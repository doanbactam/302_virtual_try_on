import { toast } from "sonner"
import { useAtom } from "jotai"
import { Button } from "../ui/button"
import { upload } from "@/api/upload"
import { Loader2 } from "lucide-react"
import { Recommend } from "../Recommend"
import { useRef, useState } from "react"
import { Textarea } from "../ui/textarea"
import { CgSpinner } from "react-icons/cg"
import { useTranslations } from "next-intl"
import { PictureScale } from "../PictureScale"
import { ErrorToast } from "@/utils/errorToast"
import { appConfigAtom, userAtom } from "@/stores"
import { getExample, saveExample } from "@/api/indexDB/ExampleDB"
import { MdOutlineDriveFolderUpload } from "react-icons/md"
import { modelClothingGeneration } from "@/services/modelClothingGeneration"

export const AIClothing = () => {
    const t = useTranslations();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [{ apiKey, modelName }] = useAtom(appConfigAtom);
    const [{ clothing }, setConfig] = useAtom(userAtom);

    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploadLoading, setIsUploadLoading] = useState(false);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const onClothingGeneration = async () => {
        if (!apiKey || !modelName) return;
        setIsLoading(true)
        try {
            const result = await modelClothingGeneration({ ...clothing, apiKey, modelName, type: 'clothing' });
            if (result?.error) {
                toast.error(() => (ErrorToast(result.error?.err_code)));
            }
            if (result?.images?.length > 0) {
                const image = result.images[0].url;
                const dataList = await getExample()
                const newClothingList = dataList?.modelList ? [image, ...dataList.clothingList] : [image]
                await saveExample({ clothingList: newClothingList })
                setConfig((v) => ({ ...v, clothingList: newClothingList, rightMenuTab: { ...v.rightMenuTab, clothing: 'custom' } }))
                toast.success(t('ClothingGenerationFinish'));
            }
        } catch (error) {
            toast.success(t('ClothingGenerationError'));
        }
        setIsLoading(false)
    }

    const onUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const toastId = toast.loading(t('upload_loading'));
        setIsUploadLoading(true);
        try {
            const results = await Promise.all(upload(files));
            const successfulUploads = results.filter(url => url !== null);
            if (successfulUploads.length > 0) {
                const dataList = await getExample()
                const newClothingList = dataList?.clothingList ? [...successfulUploads, ...dataList.clothingList] : successfulUploads
                await saveExample({ clothingList: newClothingList })
                setConfig((v) => ({ ...v, clothingList: newClothingList, rightMenuTab: { ...v.rightMenuTab, clothing: 'custom' } }))
                toast.success(t('uploadFinish'), { id: toastId });
            } else {
                toast.error(t('upload_error'), { id: toastId });
            }
        } catch (error) {
            toast.error(t('upload_error'), { id: toastId });
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setIsUploadLoading(false);
    };

    const onUpdateModelData = (name: 'describe', value: string) => {
        setConfig((v) => ({ ...v, clothing: { ...v.clothing, [name]: value } }))
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (isUploadLoading) return;
        const files = event.target.files;
        if (files) {
            onUpload(files);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isUploadLoading) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (isUploadLoading) return;
        const files = event.dataTransfer.files;
        if (files) {
            onUpload(files);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="pb-5 border-b cursor-pointer">
                <div
                    className={`border flex flex-col items-center justify-center gap-3 rounded-[8px] p-3 relative ${isDragging ? 'bg-gray-100' : ''}`}
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isUploadLoading && (
                        <div className='absolute left-0 top-0 flex flex-col justify-center items-center w-full h-full bg-[hsl(var(--background-backdrop))] backdrop-blur-sm rounded-xl'>
                            <CgSpinner className='animate-spin text-5xl text-[#7c3aed] mb-2' />
                            <span className='text-sm text-[hsl(var(--background-reverse))]'>{t('home.isUploadLoading')}</span>
                        </div>
                    )}
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        accept="image/png,image/jpeg,image/jpg"
                    />
                    <MdOutlineDriveFolderUpload className="text-4xl" />
                    <div className="flex flex-col items-center justify-center text-sm">
                        <p>{t('upload_text')}</p>
                        <p>{t('or')}</p>
                        <p>{t('upload_text2')}</p>
                    </div>
                    <div className="text-slate-600 text-xs">{t('upload_support_format')}</div>
                </div>
            </div>
            <div className="flex flex-col gap-3">
                <div className="text-sm font-bold">{t("ClothingDescription")}</div>
                <Textarea
                    value={clothing.describe}
                    className="h-40 resize-none"
                    placeholder={t('clothingPlaceholder')}
                    onChange={(e) => onUpdateModelData('describe', e.target.value)}
                />
            </div>
            <Recommend type="clothing" />
            <PictureScale type="clothing" value={clothing.proportion} />
            <Button onClick={onClothingGeneration}  disabled={isLoading || !clothing.describe.trim()}>
                {t('GenerateClothing')}
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            </Button>
        </div>
    )
}