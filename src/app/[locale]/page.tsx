
"use client";
import { useTranslations } from "next-intl";
import { FaChevronDown } from "react-icons/fa";
import { ContentArea } from "@/components/ContentArea";
import { ReplaceModule } from "@/components/ReplaceModule";
import { AIModelClothing } from "@/components/AiModelClothing";
import { appConfigAtom } from "@/stores";
import { useAtom } from "jotai";

export default function Home() {
  const t = useTranslations();
  const [{ hideBrand }] = useAtom(appConfigAtom);

  return (
    <div className="mx-auto w-full 2xl:w-[80vw] lg:px-0 px-5">
      <div className='h-20 w-full flex items-center justify-center gap-5 py-3'>
        {!hideBrand && <img src="/images/global/logo-mini.png" className='h-full' />}
        <h2 className='text-[26px] font-bold'>{t('home.title')}</h2>
      </div>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-80px)] lg:gap-0 gap-5 h-full overflow-y-auto pb-5">
        <div className="w-full lg:w-[350px] lg:min-w-[350px] lg:border lg:border-r-0 overflow-y-auto">
          <input type="checkbox" id="toggleAIModelClothing" className="hidden" />
          <label htmlFor="toggleAIModelClothing" className="flex items-center justify-between text-sm cursor-pointer border px-4 py-2 rounded-sm text-[#8e47f0] lg:hidden">
            {t('Add_clothing_models')} <FaChevronDown className="transform transition-transform duration-200" />
          </label>
          <div className="content-wrapper">
            <AIModelClothing />
          </div>
        </div>

        <div className="flex-1 border overflow-y-hidden order-first lg:order-none">
          <ContentArea />
        </div>

        <div className="border-b lg:hidden"></div>

        <div className="w-full lg:w-[400px] lg:min-w-[400px]  lg:border lg:border-l-0  overflow-y-hidden">
          <input type="checkbox" id="toggleReplaceModule" className="hidden" />
          <label htmlFor="toggleReplaceModule" className="flex items-center justify-between text-sm cursor-pointer border px-4 py-2 rounded-sm text-[#8e47f0] lg:hidden">
            {t('Add_ReplaceModule')} <FaChevronDown className="transform transition-transform duration-200" />
          </label>
          <div className="content-wrapper">
            <ReplaceModule />
          </div>
        </div>

      </div>
    </div>
  );
}