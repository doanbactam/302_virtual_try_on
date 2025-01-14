import { toast } from "sonner";
import { useAtom } from "jotai";
import { v4 as uuidV4 } from "uuid";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Textarea } from "../ui/textarea";
import { useTranslations } from "next-intl";
import { ErrorToast } from "@/utils/errorToast";
import { appConfigAtom, userAtom } from "@/stores";
import { HandleImage, onGetTaskResult } from "./service";
import { MdOutlineDriveFolderUpload } from "react-icons/md";
import { Beautify, Eliminate, SupplementLight } from "@/constants/svgIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  addFinishedProductData,
  deleteFinishedProductData,
  getFinishedProductLsit,
  updateFinishedProductData,
} from "@/api/indexDB/FinishedProductDB";

export const SecondaryTreatment = (props: {
  onRequest: (paras: { id: number; abortController: AbortController }) => void;
}) => {
  const t = useTranslations();
  const [{ apiKey, modelName }] = useAtom(appConfigAtom);
  const [{ exhibitData }, setConfig] = useAtom(userAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortControllersRef = useRef<AbortController | null>(null);
  const [isTask, setIsTask] = useState(false);
  const uuidRef = useRef("");

  const [form, setFrom] = useState({
    type: "text",
    light_source: "None",
    background_image: "",
    prompt: "",
  });

  const list = [
    {
      value: "Beautify",
      label: t("Beautify"),
      icon: <Beautify />,
    },
    {
      value: "Eliminate",
      label: t("Eliminate"),
      icon: <Eliminate />,
    },
    {
      value: "SupplementLight",
      label: t("SupplementLight"),
      icon: <SupplementLight />,
    },
  ];

  const ButtonList = [
    { value: "text", label: t("text") },
    { value: "image", label: t("image") },
  ];

  const recommendedDesc = [
    {
      direction: "Left Light",
      prompt: t("neon_lights_prompt"),
      name: t("The_neon_lights"),
      image: "https://file.302.ai/gpt/imgs/11.png",
    },
    {
      direction: "Right Light",
      prompt: t("sunset_prompt"),
      name: t("sunset"),
      image:
        "https://file.302.ai/gpt/imgs/20250109/6162a351a8ac49539db85030284e0de2.jpg",
    },
    {
      direction: "Left Light",
      prompt: t("Soft_light_prompt"),
      name: t("Soft_light"),
      image:
        "https://file.302.ai/gpt/imgs/20250109/db7a8cd8a17741248142fdfec22e373e.jpg",
    },
  ];

  const directionLIstanbul = [
    { value: "None", label: t("None") },
    { value: "Left Light", label: t("Left_Light") },
    { value: "Right Light", label: t("Right_Light") },
    { value: "Top Light", label: t("Top_Light") },
    { value: "Bottom Light", label: t("Bottom_Light") },
  ];

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const onHandleImage = async (type: string) => {
    if (!exhibitData?.url || !apiKey) return;
    const uuid = uuidRef.current;
    setIsLoading(true);
    const temp = await addFinishedProductData({
      url: "",
      status: "submitted",
      dressModel: "SecondaryAction",
    });
    if (!temp?.id) return;
    const newData = await getFinishedProductLsit();
    setConfig((v) => ({ ...v, finishedProduct: newData }));
    let abortController = new AbortController();
    abortControllersRef.current = abortController;
    props.onRequest({ id: temp.id, abortController });
    let result = await HandleImage({
      type,
      apiKey,
      prompt: form.prompt,
      image: exhibitData.url,
      signal: abortController.signal,
      light_source: form.light_source,
      modelName: modelName || "gpt-4o-mini",
      background_image:
        fileInputRef.current?.files![0] || form.background_image,
    });
    // Task exceeds 30 seconds, enter polling query results
    if (result.status === "starting") {
      setIsTask(true);
      await updateFinishedProductData(temp.id, {
        status: "submitted",
        taskId: result.id,
      });
      abortController = new AbortController();
      abortControllersRef.current = abortController;
      props.onRequest({ id: temp.id, abortController });
      result = await onGetTaskResult(result.id, apiKey, abortController.signal);
    }
    if (result?.error || result?.status === "failed") {
      if (result?.error?.name !== "AbortError") {
        if (result.error?.err_code) {
          toast.error(() => ErrorToast(result.error?.err_code));
        } else {
          toast.error(t("GenerationFailed"));
        }
      }
      if (!isTask) {
        await deleteFinishedProductData(temp.id);
        const newData = await getFinishedProductLsit();
        setConfig((v) => ({ ...v, finishedProduct: newData }));
        setIsLoading(false);
        return;
      }
    }

    if (result?.imageUrl) {
      const updateResult = await updateFinishedProductData(temp.id, {
        url: result?.imageUrl,
        status: "succeed",
      });
      const newData = await getFinishedProductLsit();
      setConfig((v) => ({
        ...v,
        finishedProduct: newData,
        exhibitData: updateResult,
        activeIndex: 0,
      }));
    }
    onClose(false, uuid);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setFrom((v) => ({ ...v, background_image: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const SupplementLightButton = (item: {
    value: any;
    label?: string;
    icon: any;
  }) => {
    return (
      <Dialog key={item.value} open={open} onOpenChange={onOpenChange}>
        <DialogTrigger key={item.value}>
          <TooltipProvider key={item.value}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  size="icon"
                  style={{ boxShadow: "0 0 2px 0px #00000054" }}
                >
                  {item.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogTrigger>
        <DialogContent className="h-[90%] max-w-fit overflow-y-auto transition-all md:h-auto">
          <DialogHeader>
            <DialogTitle />
            <DialogDescription />
          </DialogHeader>
          <div className="flex w-max flex-col items-center justify-start gap-10 md:flex-row">
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div>{t("Dress_up_diagram")}</div>
                <div className="mt-2 flex h-[220px] w-[200px] justify-center rounded-sm border">
                  <img
                    src={exhibitData.url}
                    className="h-full object-contain"
                  />
                </div>
              </div>
              <div
                className={`hidden text-center ${form.type === "image" && "!block"}`}
              >
                <div>{t("Background_image")}</div>
                <div
                  className="mt-2 flex h-[220px] w-[200px] cursor-pointer items-center justify-center rounded-sm border"
                  onClick={handleClick}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    accept="image/png,image/jpeg,image/jpg"
                  />
                  {form.background_image ? (
                    <img
                      src={form.background_image}
                      className={`h-full object-contain`}
                    />
                  ) : (
                    <div
                      className={`flex flex-col items-center text-slate-500`}
                    >
                      <MdOutlineDriveFolderUpload className="text-[55px]" />
                      <p className="text-sm">{t("Background_image_tips")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-sm">
                  {ButtonList.map((item) => (
                    <div
                      key={item.value}
                      onClick={() =>
                        setFrom((v) => ({ ...v, type: item.value }))
                      }
                      className={`w-max cursor-pointer rounded-[6px] border px-4 py-2 ${item.value === form.type && "bg-[#8e47f0] text-white"}`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
                <Select
                  value={form.light_source}
                  onValueChange={(value) =>
                    setFrom((v) => ({ ...v, light_source: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {directionLIstanbul.map((item, index) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder={t("SupplementLight_placeholder")}
                  className="h-[170px] w-full min-w-[300px] resize-none rounded-sm"
                  value={form.prompt}
                  onChange={(e) =>
                    setFrom((v) => ({ ...v, prompt: e.target.value }))
                  }
                />
                <div className="flex items-center gap-2 text-sm">
                  <div>{t("recommendedDesc")}</div>
                  <div className="flex gap-3">
                    {recommendedDesc.map((item) => (
                      <div
                        key={item.name}
                        className="cursor-pointer border-b border-[#8e47f0] text-[#8e47f0]"
                        onClick={() => {
                          setFrom((v) => ({
                            ...v,
                            prompt: item.prompt,
                            light_source: item.direction,
                            background_image: item.image,
                          }));
                        }}
                      >
                        {item.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={`hidden text-sm text-[#8e47f0] ${isTask && "!block"} `}
          >
            *{t("secondaryTreatment_task_tips")}
          </div>
          <DialogFooter className="gap-4">
            <DialogClose className="h-max rounded-[6px] border bg-white px-4 py-2 text-sm text-black hover:bg-[#f9f9f9]">
              {t("Cancel")}
            </DialogClose>
            <Button
              disabled={
                !form.prompt.trim() ||
                (form.type === "image" && !form.prompt.trim()) ||
                isLoading
              }
              type="submit"
              onClick={() => {
                if (form.type === "text") {
                  onHandleImage("SupplementLightText");
                } else {
                  onHandleImage("SupplementLightImage");
                }
              }}
            >
              {t("confirm")}
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const onOpenChange = async (open: boolean) => {
    if (open) {
      const uuid = uuidV4();
      uuidRef.current = uuid;
    }
    setOpen(open);
    setIsTask(false);
    setIsLoading(false);
    abortControllersRef.current = null;
  };

  const onClose = (open: boolean, uuid: string) => {
    if (!open && uuidRef.current && uuid !== uuidRef.current) {
      console.log("onClose-uuidRef.current", uuidRef.current);
      console.log("onClose-uuid", uuid);
      return;
    }
    setIsLoading(false);
    onOpenChange(open);
  };

  return (
    <div className="flex items-center gap-2">
      {list.map((item) =>
        item.value === "SupplementLight" ? (
          SupplementLightButton(item)
        ) : (
          <TooltipProvider key={item.value}>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onHandleImage(item.value)}
                  variant="icon"
                  size="icon"
                  style={{ boxShadow: "0 0 2px 0px #00000054" }}
                >
                  {item.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      )}
    </div>
  );
};
