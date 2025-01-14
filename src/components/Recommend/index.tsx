import { useAtom } from "jotai";
import { userAtom } from "@/stores";
import { useTranslations } from "next-intl";
import { PRESETS } from "@/constants/prompt";
import { BsArrowClockwise } from "react-icons/bs";
import { useCallback, useMemo, useState } from "react";

export const Recommend = (props: { type: 'model' | 'clothing' }) => {
    const { type } = props;
    const t = useTranslations();
    const [_, setConfig] = useAtom(userAtom);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRotating, setIsRotating] = useState(false);

    const onSelect = (describe: string) => {
        const text = t(`${type}.${describe}`)
        setConfig((v) => ({ ...v, [type]: { ...v[type], describe: text } }))
    }

    const randomItems = useMemo(() => {
        return [...PRESETS[type]]
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);
    }, [type, refreshKey]);

    const refreshItems = useCallback(() => {
        setRefreshKey(prevKey => prevKey + 1);
        setIsRotating(true);
        setTimeout(() => setIsRotating(false), 500);
    }, []);

    return (
        <div className="flex flex-col gap-2">
            <div className="text-sm font-bold flex gap-2 items-center">
                {t(`${type}.RecommendedDescription`)}
                <BsArrowClockwise className={`text-lg text-[#8e47f0] cursor-pointer transition-transform duration-500 ${isRotating ? 'rotate-360' : ''}`} onClick={refreshItems} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                {
                    randomItems.map(item => (
                        <div className="recommendedDescription" key={item.title} onClick={() => onSelect(item.describe)}>
                            {t(`${type}.${item.title}`)}
                        </div>
                    ))
                }
            </div>
        </div>
    )
}