import { useAtom } from "jotai";
import Viewer from "react-viewer";
import { userAtom } from "@/stores";
import { Checkbox } from "../ui/checkbox";
import { useTranslations } from "next-intl";
import { HiDownload } from "react-icons/hi";
import { useEffect, useState } from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import { BsArrowsFullscreen } from "react-icons/bs";
import { saveExample } from "@/api/indexDB/ExampleDB";
import { CheckedState } from "@radix-ui/react-checkbox";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { useMonitorMessage } from "@/hooks/global/use-monitor-message";

interface ImageSelectorProps {
    title: string;
    selectedImage: string;
    customList: string[];
    exampleList: string[];
    type: 'model' | 'clothing';
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
    type,
    title,
    selectedImage,
    customList,
    exampleList,
}) => {
    const t = useTranslations();
    const [{ rightMenuTab }, setConfig] = useAtom(userAtom);
    const { handleDownload } = useMonitorMessage()

    const [visible, setVisible] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0)
    const [imageList, setImageList] = useState<string[]>([]);
    const [bulkAction, setBulkAction] = useState({ model: false, clothing: false });
    const [bulkSelect, setBulkSelect] = useState<{ model: string[], clothing: string[] }>({ model: [], clothing: [] });

    const getHeight = () => {
        if (rightMenuTab[type] === 'preset') {
            return { height: 'calc(100vh - 269px)' };
        } else if (bulkAction[type]) {
            return { height: 'calc(100vh - 330px)' };
        } else {
            return { height: 'calc(100vh - 297px)' };
        }
    }

    const onBulkSelect = (image: string) => {
        if (type === 'model' && !bulkAction.model) {
            setConfig((v) => ({ ...v, selcetModel: image }))
            return;
        }
        if (type === 'clothing' && !bulkAction.clothing) {
            setConfig((v) => ({ ...v, selectClothing: image }))
            return;
        }
        if (bulkSelect[type].includes(image)) {
            setBulkSelect((v) => ({ ...v, [type]: v[type].filter(f => f !== image) }))
        } else {
            setBulkSelect((v) => ({ ...v, [type]: [...v[type], image] }))
        }
    }

    const onSelectAll = (checked: CheckedState) => {
        if (checked) {
            setBulkSelect((v) => ({ ...v, [type]: customList }))
        } else {
            setBulkSelect((v) => ({ ...v, [type]: [] }))
        }
    }

    const onSelectTab = (value: 'preset' | 'custom') => {
        setConfig((v) => ({ ...v, rightMenuTab: { ...v.rightMenuTab, [type]: value } }))
    }

    const onDownload = (images: string[]) => {
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            handleDownload(image)
        }
    }

    const onDelete = async (delImages: string[]) => {
        const newData = customList.filter(image => delImages.indexOf(image) === -1)
        if (type === 'clothing') {
            await saveExample({ clothingList: newData })
            setConfig((v) => ({ ...v, clothingList: newData }))
        } else {
            await saveExample({ modelList: newData })
            setConfig((v) => ({ ...v, modelList: newData }))
        }
    }

    useEffect(() => {
        setImageList(rightMenuTab[type] === 'preset' ? exampleList : customList);
        if (!customList?.length) {
            setBulkAction((v) => ({ ...v, [type]: false }))
        }
    }, [rightMenuTab, exampleList, customList])

    return (
        <div className="text-center">
            <div>{title}</div>
            <div className="border rounded-sm mt-2 pb-2 grid gap-2">
                <div className="flex items-center justify-around border-b p-2 text-sm">
                    <div
                        className={`w-[50%] cursor-pointer rounded-sm py-1 ${rightMenuTab[type] === 'preset' && 'bg-[#8e47f0] text-white'}`}
                        onClick={() => onSelectTab('preset')}
                    >
                        {t('preset')}
                    </div>
                    <div
                        className={`w-[50%] cursor-pointer rounded-sm py-1 ${rightMenuTab[type] === 'custom' && 'bg-[#8e47f0] text-white'}`}
                        onClick={() => onSelectTab('custom')}
                    >
                        {t('custom')}
                    </div>
                </div>
                {rightMenuTab[type] === 'custom' && (
                    <div className={`text-sm text-[#8e47f0] cursor-pointer relative ${!imageList?.length && 'text-slate-600'}`}>
                        <div className="w-fit mx-auto" onClick={() => { if (imageList?.length) setBulkAction((v) => ({ ...v, [type]: !v[type] })) }}>{t('bulk_operation')}</div>
                        {bulkAction[type] && (
                            <Checkbox
                                id={`all${type}`}
                                className="absolute right-[17px] top-[2px]"
                                checked={imageList?.length === bulkSelect[type]?.length}
                                onCheckedChange={onSelectAll}
                            />
                        )}
                    </div>
                )}
                <div className="flex flex-col gap-3 px-3 overflow-y-auto" style={getHeight()}>
                    {imageList?.map((image, index) => (
                        <div
                            key={image}
                            onClick={() => onBulkSelect(image)}
                            onDoubleClick={() => { setActiveIndex(index); setVisible(true) }}
                            className={`border rounded-sm h-[150px] w-[150px] min-h-[150px] relative group mx-auto overflow-hidden cursor-pointer
                ${(selectedImage === image && (!bulkAction[type] || rightMenuTab[type] === 'preset')) && 'border-[#8e47f0]'}`
                            }
                        >
                            <img src={image} className="h-[150px] w-[150px] object-contain" />
                            {rightMenuTab[type] === 'custom' && (
                                bulkAction[type] ? (
                                    <Checkbox
                                        id={image}
                                        className="absolute right-0 top-0"
                                        checked={bulkSelect[type]?.includes(image)}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                                        onCheckedChange={() => onBulkSelect(image)}
                                    />
                                ) : (
                                    <div className="absolute px-1 top-1 hidden group-hover:!flex justify-between items-center gap-2 w-full">
                                        <BsArrowsFullscreen
                                            onClick={(e) => { e.stopPropagation(); setActiveIndex(index); setVisible(true) }}
                                            className="text-[#8e47f0] cursor-pointer"
                                        />
                                        <IoIosCloseCircleOutline
                                            onClick={(e) => { e.stopPropagation(); onDelete([image]) }}
                                            className="text-red-600 text-[21px] cursor-pointer"
                                        />
                                    </div>

                                )
                            )}
                            {
                                rightMenuTab[type] === 'preset' && (
                                    <div className="absolute left-1 top-1 hidden group-hover:!flex ">
                                        <BsArrowsFullscreen
                                            onClick={(e) => { e.stopPropagation(); setActiveIndex(index); setVisible(true) }}
                                            className="text-[#8e47f0] cursor-pointer"
                                        />
                                    </div>
                                )
                            }
                        </div>
                    ))}
                </div>
                {bulkAction[type] && rightMenuTab[type] === 'custom' && (
                    <div className="flex justify-evenly items-center border-t pt-2">
                        <HiDownload className="cursor-pointer text-[#8e47f0]" onClick={() => onDownload(bulkSelect[type])} />
                        <FaRegTrashAlt className="cursor-pointer text-red-600" onClick={() => onDelete(bulkSelect[type])} />
                    </div>
                )}
            </div>
            <Viewer
                visible={visible}
                activeIndex={activeIndex}
                images={imageList.map(item => ({ src: item }))}
                customToolbar={(toolbars) => ([
                    ...toolbars,
                    {
                        key: 'download2',
                        render: (<i className="react-viewer-icon react-viewer-icon-download" />),
                        onClick: (activeImage) => { handleDownload(activeImage.src) },
                    }
                ])}
                onClose={() => { setVisible(false) }}
                onMaskClick={() => setVisible(false)}
            />
        </div >
    );
};