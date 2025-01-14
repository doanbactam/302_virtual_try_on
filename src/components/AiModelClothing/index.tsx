import { AIModel } from "./Model";
import { AIClothing } from "./Clothing";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export const AIModelClothing = () => {
    const t = useTranslations();
    return (
        <div className="p-4 flex flex-col gap-5 w-full">
            <Tabs defaultValue="model">
                <TabsList className="grid w-full grid-cols-2 h-12 mb-5">
                    <TabsTrigger value="model" className="py-2 data-[state=active]:bg-[#8e47f0] data-[state=active]:text-white">{t('ai_model')}</TabsTrigger>
                    <TabsTrigger value="clothing" className="py-2 data-[state=active]:bg-[#8e47f0] data-[state=active]:text-white">{t('ai_clothing')}</TabsTrigger>
                </TabsList>
                <TabsContent value="model">
                    <AIModel />
                </TabsContent>
                <TabsContent value="clothing">
                    <AIClothing />
                </TabsContent>
            </Tabs>
        </div>
    )
}