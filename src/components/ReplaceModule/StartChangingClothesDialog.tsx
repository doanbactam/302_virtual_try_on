import { toast } from "sonner";
import { useAtom } from "jotai";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ErrorToast } from "@/utils/errorToast";
import { appConfigAtom, userAtom } from "@/stores";
import { generateDressUp, onVirtualTryOnTask, onVirtualTryonTask2, VirtualTryOnTask } from "./service/generateDressUp";
import { addFinishedProductData, getFinishedProductLsit, updateFinishedProductData } from "@/api/indexDB/FinishedProductDB";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"

type IForm = {
    isLongTops: boolean;
    dressModel: 'Kling' | 'FASHN' | 'Virtual-Tryon';
    clothingType: 'tops' | 'bottoms' | 'one-pieces';
}

export const StartChangingClothesDialog = () => {
    const t = useTranslations();
    const [{ apiKey }] = useAtom(appConfigAtom);
    const [{ selcetModel, selectClothing }, setConfig] = useAtom(userAtom);
    const abortControllersRef = useRef<AbortController | null>(null);
    const taskIdRef = useRef<string>('')

    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isTask, setIsTask] = useState(false);
    const [form, setFrom] = useState<IForm>({ dressModel: 'Kling', clothingType: 'tops', isLongTops: false })

    const ClothingType = [
        { value: 'tops', label: t('Tops') },
        { value: 'bottoms', label: t('Bottoms') },
        { value: 'one-pieces', label: t('Suits') },
    ]

    const DressModel = [
        { value: 'Kling', label: 'Kling' },
        { value: 'FASHN', label: 'FASHN' },
        { value: 'Virtual-Tryon', label: 'Virtual-Tryon' },
    ]

    const onGenerateDressUp = async () => {
        if (!apiKey) return;
        setIsLoading(true)
        try {
            const params = {
                ...form,
                apiKey,
                model_image: selcetModel,
                garment_image: selectClothing
            }
            const abortController = new AbortController();
            abortControllersRef.current = abortController
            const generateResult = await generateDressUp({ ...params, signal: abortController.signal });
            console.log('========generateResult', generateResult);

            if (generateResult?.error) {
                if (generateResult?.error?.name === 'AbortError') {
                    setIsLoading(false)
                    return;
                }
                toast.error(() => (ErrorToast(generateResult.error?.err_code)));
                setIsLoading(false)
                return;
            }
            if (generateResult?.detail) {
                if (generateResult?.detail?.name === 'PhotoTypeError') {
                    toast.error(t('PhotoTypeError'));
                } else if (generateResult?.detail?.name === 'NSFWError') {
                    toast.error(t('NSFWError'));
                } else {
                    toast.error(t('Failed_to_change_clothes'));
                }
                setIsLoading(false)
                return;
            }
            if (form.dressModel === 'Kling' && generateResult?.data?.task_id) {
                await onGetVirtualTryOnTask(generateResult);
            }
            if (form.dressModel === 'Virtual-Tryon' && generateResult?.request_id) {
                await onGetVirtualTryOnTask2(generateResult);
            }
            if (form.dressModel === 'FASHN' && generateResult?.images?.length > 0) {
                const url = generateResult?.images[0].url;
                const result = await addFinishedProductData({ url, status: 'succeed', dressModel: 'FASHN' });
                setConfig((v) => ({ ...v, exhibitData: result, activeIndex: 0, finishedProduct: [{ ...result }, ...v.finishedProduct] }))
                toast.error(t('Successful_dress_up'));
                setIsLoading(false)
                setOpen(false)
            }
        } catch (error) {
            toast.error(t('Failed_to_change_clothes'));
            setIsLoading(false)
            return;
        }
    }

    const onGetVirtualTryOnTask = async (generateResult: VirtualTryOnTask) => {
        if (generateResult?.data?.task_status === 'submitted') {
            setIsTask(true);
            const { task_id: taskId, task_status: status } = generateResult.data
            taskIdRef.current = taskId;
            const result = await addFinishedProductData({ url: '', status, taskId, dressModel: 'Kling' });
            setConfig((v) => ({ ...v, finishedProduct: [{ ...result }, ...v.finishedProduct] }))
            const abortController = new AbortController();
            abortControllersRef.current = abortController
            const taskResult = await onVirtualTryOnTask(taskId, apiKey || '', abortController.signal);
            if (taskResult?.error) {
                toast.error(() => (ErrorToast(taskResult.error?.err_code)));
                if (result?.id) {
                    await updateFinishedProductData(result.id, { error: true });
                    const newData = await getFinishedProductLsit();
                    setConfig((v) => ({ ...v, finishedProduct: newData }));
                }
                setIsLoading(false)
                return;
            }
            if (taskResult?.data.task_status === 'succeed') {
                if (taskResult?.data?.task_result && taskResult?.data?.task_result?.images?.length > 0) {
                    const url = taskResult.data.task_result.images[0].url;
                    if (result?.id) {
                        const updateResult = await updateFinishedProductData(result.id, { url, status: 'succeed' });
                        if (taskIdRef.current === taskId) {
                            const newData = await getFinishedProductLsit();
                            setConfig((v) => ({ ...v, exhibitData: updateResult, activeIndex: 0, finishedProduct: newData }));
                            toast.success(t('Successful_dress_up'));
                            setIsLoading(false)
                            setOpen(false)
                        } else {
                            const newData = await getFinishedProductLsit();
                            setConfig((v) => ({ ...v, finishedProduct: newData }));
                        }
                    }
                }
            }
        } else {
            if (generateResult?.error?.name !== 'AbortError') {
                toast.error(t('Failed_to_change_clothes'));
            }
            setIsLoading(false)
            return;
        }
    }

    const onGetVirtualTryOnTask2 = async (generateResult: any) => {
        if (generateResult?.status === 'IN_QUEUE') {
            setIsTask(true);
            const taskId = generateResult.request_id
            taskIdRef.current = generateResult.request_id;
            const result = await addFinishedProductData({ url: '', status: 'submitted', taskId, dressModel: 'Virtual-Tryon' });
            setConfig((v) => ({ ...v, finishedProduct: [{ ...result }, ...v.finishedProduct] }))
            const abortController = new AbortController();
            abortControllersRef.current = abortController
            const taskResult = await onVirtualTryonTask2(taskId, apiKey || '', abortController.signal);
            if (taskResult?.error) {
                toast.error(() => (ErrorToast(taskResult.error?.err_code)));
                if (result?.id) {
                    await updateFinishedProductData(result.id, { error: true });
                    const newData = await getFinishedProductLsit();
                    setConfig((v) => ({ ...v, finishedProduct: newData }));
                }
                setIsLoading(false)
                return;
            }
            if (taskResult?.image?.url) {
                const url = taskResult?.image?.url;
                if (result?.id) {
                    const updateResult = await updateFinishedProductData(result.id, { url, status: 'succeed' });
                    if (taskIdRef.current === taskId) {
                        const newData = await getFinishedProductLsit();
                        setConfig((v) => ({ ...v, exhibitData: updateResult, activeIndex: 0, finishedProduct: newData }));
                        toast.success(t('Successful_dress_up'));
                        setIsLoading(false)
                        setOpen(false)
                    } else {
                        const newData = await getFinishedProductLsit();
                        setConfig((v) => ({ ...v, finishedProduct: newData }));
                    }
                }
            }
        } else {
            if (generateResult?.error?.name !== 'AbortError') {
                toast.error(t('Failed_to_change_clothes'));
            }
            setIsLoading(false)
            return;
        }
    }

    const onOpenChange = (open: boolean) => {
        if (!open && isLoading) {
            abortControllersRef.current?.abort();
            setConfig((v) => ({ ...v, performTasks: !v.performTasks }));
            if (form.dressModel === 'FASHN' || (['Kling', 'Virtual-Tryon'].indexOf(form.dressModel) > -1 && !isTask)) {
                toast.error(t('task_close'));
            }
        }
        setOpen(open);
        setIsLoading(false)
        setIsTask(false)
        abortControllersRef.current = null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={!(selectClothing && selcetModel)}>{t('Start_changing_clothes')}</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('You_have_selected')}</DialogTitle>
                    <DialogDescription />
                </DialogHeader>
                <div className="">
                    <div className="flex gap-5 justify-evenly items-center">
                        <div className="text-center text-sm">
                            <div className="mb-2">{t('Model_diagram')}</div>
                            <div className="border rounded-sm w-[150px] h-[150px] overflow-hidden flex justify-center">
                                <img src={selcetModel} className="h-full object-contain" />
                            </div>
                        </div>
                        <div className="text-[45px] text-slate-600">+</div>
                        <div className="text-center text-sm">
                            <div className="mb-2">{t('Clothing_image')}</div>
                            <div className="border rounded-sm w-[150px] h-[150px] overflow-hidden flex justify-center">
                                <img src={selectClothing} className="h-full object-contain" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm ">
                    {t('Dress_up_model')}
                    <Select
                        value={form.dressModel}
                        disabled={isLoading}
                        onValueChange={(dressModel: 'Kling' | 'FASHN') => setFrom((v) => ({ ...v, dressModel }))}
                    >
                        <SelectTrigger className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {DressModel.map(item => (<SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                {
                    form.dressModel === 'FASHN' &&
                    <div className="flex items-center justify-between text-sm border-2 border-dashed p-4 rounded-sm">
                        <div className="flex items-center gap-2">
                            {t('Clothing_type')}
                            <Select
                                value={form.clothingType}
                                onValueChange={(clothingType: 'tops' | 'bottoms' | 'one-pieces') => setFrom((v) => ({ ...v, clothingType }))}
                            >
                                <SelectTrigger className="w-28">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {ClothingType.map(item => (<SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            {t('Is_it_a_long_top')}
                            <Switch id="isLong" checked={form.isLongTops} onCheckedChange={(isLongTops) => setFrom((v) => ({ ...v, isLongTops }))} />
                        </div>
                    </div>
                }
                <div className={`text-[#8e47f0] text-sm hidden ${isTask && '!block'} `}>
                    {t('task_tips')}
                </div>
                <DialogFooter className="flex items-center">
                    <DialogClose className="text-black bg-white hover:bg-[#f9f9f9] border px-4 py-2 rounded-[6px] text-sm" >{t('Cancel')}</DialogClose>
                    <Button onClick={onGenerateDressUp} disabled={isLoading}>
                        {t('confirm')}
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}