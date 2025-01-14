export type SEOData = {
  supportLanguages: string[];
  fallbackLanguage: string;
  languages: Record<
    string,
    { title: string; description: string; image: string }
  >;
};

export const SEO_DATA: SEOData = {
  // TODO: Change to your own support languages
  supportLanguages: ["zh", "en", "ja"],
  fallbackLanguage: "en",
  // TODO: Change to your own SEO data
  languages: {
    zh: {
      title: "AI 换衣",
      description: "使用AI进行虚拟试穿",
      image: "/images/global/desc_zh.png",
    },
    en: {
      title: "AI Virtual Try On",
      description: "Using AI for virtual try on",
      image: "/images/global/desc_en.png",
    },
    ja: {
      title: "AIバーチャル試着",
      description: "AIを使ってバーチャル試着",
      image: "/images/global/desc_ja.png",
    },
  },
};
