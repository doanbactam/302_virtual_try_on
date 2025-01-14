import { useAtom } from "jotai";
import {  useEffect } from "react";
import { userAtom } from "@/stores";
import { useTranslations } from "next-intl";
import { ImageSelector } from "./ImageSelector";
import { getExample } from "@/api/indexDB/ExampleDB";
import { StartChangingClothesDialog } from "./StartChangingClothesDialog";
import { clothingExampleList, modelExampleList } from "@/constants/prompt";

export const ReplaceModule = () => {
    const t = useTranslations();
    const [{ selcetModel, selectClothing, modelList, clothingList }, setConfig] = useAtom(userAtom);

    useEffect(() => {
        getExample().then((res) => {
            console.log(res);
            if (res?.id) {
                setConfig((v) => ({
                    ...v,
                    modelList: res.modelList,
                    clothingList: res.clothingList
                }))
            }
        })
    }, [])

    return (
        <div className="p-3 flex flex-col gap-3 h-full">
            <div className="grid grid-cols-2 gap-3 h-full">
                <ImageSelector
                    type="model"
                    title={t('Model_diagram')}
                    customList={modelList}
                    selectedImage={selcetModel}
                    exampleList={modelExampleList}
                />
                <ImageSelector
                    type="clothing"
                    title={t('Clothing_image')}
                    customList={clothingList}
                    selectedImage={selectClothing}
                    exampleList={clothingExampleList}
                />
            </div>
            <StartChangingClothesDialog />
        </div>
    )
}