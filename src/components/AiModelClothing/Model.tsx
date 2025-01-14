import { toast } from "sonner"
import { useAtom } from "jotai"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { upload } from "@/api/upload"
import { Loader2 } from "lucide-react"
import { Recommend } from "../Recommend"
import { useRef, useState } from "react"
import { Textarea } from "../ui/textarea"
import { useTranslations } from "next-intl"
import { PictureScale } from "../PictureScale"
import { appConfigAtom, userAtom } from "@/stores"
import { getExample, saveExample } from "@/api/indexDB/ExampleDB"
import { modelClothingGeneration } from "@/services/modelClothingGeneration"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { ErrorToast } from "@/utils/errorToast"
import { TbExclamationCircle } from "react-icons/tb";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"

export const AIModel = () => {
    const t = useTranslations();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isLoading, setIsLoading] = useState(false)
    const [{ apiKey, modelName }] = useAtom(appConfigAtom);
    const [{ model }, setConfig] = useAtom(userAtom);

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const onModelGeneration = async () => {
        if (!apiKey || !modelName) return;
        setIsLoading(true)
        try {
            const result = await modelClothingGeneration({ ...model, apiKey, modelName, type: 'model' });
            if (result?.error) {
                toast.error(() => (ErrorToast(result.error?.err_code)));
            }
            if (result?.images?.length > 0) {
                const image = result.images[0].url;
                const dataList = await getExample()
                const newModelList = dataList?.modelList ? [image, ...dataList.modelList] : [image]
                await saveExample({ modelList: newModelList })
                setConfig((v) => ({ ...v, modelList: newModelList, rightMenuTab: { ...v.rightMenuTab, model: 'custom' } }))
                toast.success(t('ModelGenerationFinish'));
            }
        } catch (error) {
            console.log('===========', error);
            toast.success(t('ModelGenerationError'));
        }
        setIsLoading(false)
    }

    const onUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const toastId = toast.loading(t('upload_loading'));
        console.log(toastId);
        try {
            const results = await Promise.all(upload(files));
            const successfulUploads = results.filter(url => url !== null);
            if (successfulUploads.length > 0) {
                const dataList = await getExample()
                const newModelList = dataList?.modelList ? [...successfulUploads, ...dataList.modelList] : successfulUploads
                await saveExample({ modelList: newModelList })
                setConfig((v) => ({ ...v, modelList: newModelList, rightMenuTab: { ...v.rightMenuTab, model: 'custom' } }))
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
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            onUpload(files);
        }
    };

    const onUpdateModelData = (name: 'gender' | 'age' | 'describe', value: string) => {
        setConfig((v) => ({ ...v, model: { ...v.model, [name]: value } }))
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <div className="text-sm font-bold">{t("ModelSettings")}</div>
                <div className="text-sm">
                    <div className="flex">
                        <div>{t('gender')}：</div>
                        <RadioGroup value={model.gender} onValueChange={(value) => onUpdateModelData('gender', value)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Male" id="r1" />
                                <Label htmlFor="r1">{t('Male')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Female" id="r2" />
                                <Label htmlFor="r2">{t('Female')}</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                <div className="text-sm">
                    <div className="flex flex-wrap">
                        <div>{t('age')}：</div>
                        <RadioGroup value={model.age} onValueChange={(value) => onUpdateModelData('age', value)} className="flex gap-4 flex-wrap">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Child" id="r1" />
                                <Label htmlFor="r1">{t('children')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Youth" id="r2" />
                                <Label htmlFor="r2">{t('youth')}</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="MiddleAgedElderly" id="r2" />
                                <Label htmlFor="r2">{t('MiddleAgedElderly')}</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <div className="text-sm font-bold flex items-center gap-2">
                    {t("ModelDescription")}
                    <TooltipProvider delayDuration={200}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-pointer text-[#8e47f0]"><TbExclamationCircle className="text-lg" /></div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="w-[200px]">{t('ModelDescriptionTooltip')}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <Textarea
                    value={model.describe}
                    className="h-40 resize-none"
                    placeholder={t('modelPlaceholder')}
                    onChange={(e) => onUpdateModelData('describe', e.target.value)}
                />
            </div>
            <Recommend type="model" />
            <PictureScale type="model" value={model.proportion} />
            <Button onClick={onModelGeneration} disabled={isLoading}>
                {t('GenerateModels')}
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            </Button>
            <>
                <div className="text-[#8e47f0] text-center text-sm cursor-pointer" onClick={handleClick}>
                    {t('UploadmodelslocallyImg')}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/png,image/jpeg,image/jpg"
                    style={{ display: 'none' }}
                />
            </>
        </div>
    )
}