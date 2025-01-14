import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { IProportion, userAtom } from "@/stores";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const scaleList: IProportion[] = ['1:1', '9:16', '2:3', '3:4'];

export const PictureScale = (props: { type: 'model' | 'clothing', value: IProportion }) => {
    const t = useTranslations();
    const { type, value } = props;
    const [_, setConfig] = useAtom(userAtom);

    const onSelect = (scale: IProportion) => {
        setConfig((v) => ({ ...v, [type]: { ...v[type], proportion: scale } }))
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="text-sm font-bold">{t("pictureScale")}</div>
            <div className="flex justify-between w-full">
                <Select
                    value={value}
                    onValueChange={(scale: IProportion) => onSelect(scale)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {scaleList.map((scale, index) => (
                                <SelectItem className={`${(type === 'model' && !index) && '!hidden'}`} key={scale} value={scale}>{scale}</SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}