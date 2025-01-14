import { toast } from "sonner";
import { useAtom } from "jotai";
import Viewer from "react-viewer";
import { Button } from "../ui/button";
import { CgSpinner } from "react-icons/cg";
import { HiDownload } from "react-icons/hi";
import { onGetTaskResult } from "./service";
import { useTranslations } from "next-intl";
import { FaRegTrashAlt } from "react-icons/fa";
import { VscDebugStart } from "react-icons/vsc";
import { appConfigAtom, userAtom } from "@/stores";
import { BsArrowsFullscreen } from "react-icons/bs";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { SecondaryTreatment } from "./secondaryTreatment";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMonitorMessage } from "@/hooks/global/use-monitor-message";
import {
  onVirtualTryOnTask,
  onVirtualTryonTask2,
} from "../ReplaceModule/service/generateDressUp";
import {
  deleteFinishedProductData,
  getFinishedProductLsit,
  IFinishedProduct,
  updateFinishedProductData,
} from "@/api/indexDB/FinishedProductDB";

export const ContentArea = () => {
  const t = useTranslations();
  const { handleDownload } = useMonitorMessage();

  const [{ apiKey }] = useAtom(appConfigAtom);
  const [
    { finishedProduct, exhibitData, activeIndex, performTasks },
    setConfig,
  ] = useAtom(userAtom);

  const [visible, setVisible] = useState(false);
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map());

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedImageRef = useRef<HTMLDivElement>(null);

  const onDelete = async (id?: number) => {
    if (!id) return;
    await deleteFinishedProductData(id)
      .then(() => {
        const controller = abortControllersRef.current.get(id);
        if (controller) {
          controller.abort();
          abortControllersRef.current.delete(id);
        }
        const index = finishedProduct.findIndex((f) => f.id === id);
        let data = {};
        if (finishedProduct.length > 1) {
          const findSucceededItem = (startIndex: number, direction: 1 | -1) => {
            for (
              let i = startIndex;
              i >= 0 && i < finishedProduct.length;
              i += direction
            ) {
              if (
                finishedProduct[i].id !== id &&
                finishedProduct[i].status === "succeed"
              ) {
                setConfig((v) => ({ ...v, activeIndex: i }));
                return finishedProduct[i];
              }
            }
            return null;
          };
          let nextItem = findSucceededItem(index + 1, 1);
          if (!nextItem) {
            nextItem = findSucceededItem(index - 1, -1);
          }
          data = nextItem || {};
        }
        const newData = finishedProduct.filter((item) => item.id !== id);
        setConfig((v) => ({
          ...v,
          exhibitData: data,
          finishedProduct: newData,
        }));
      })
      .catch(() => {
        toast.error(t("deleteError"));
      });
  };

  const startPolling = useCallback(
    async (item: IFinishedProduct) => {
      if (!item?.taskId || !item?.id) return;

      const abortController = new AbortController();
      abortControllersRef.current.set(item.id, abortController);

      if (item.error) {
        await updateFinishedProductData(item.id!, { ...item, error: false });
        const newData = await getFinishedProductLsit();
        setConfig((v) => ({ ...v, finishedProduct: newData }));
      }
      if (item.dressModel === "Kling") {
        onVirtualTryOnTask(item.taskId, apiKey || "", abortController.signal)
          .then(async (result: any) => {
            if (result?.data?.task_status === "succeed") {
              const updatedItem: IFinishedProduct = {
                ...item,
                status: "succeed",
                url: result.data.task_result?.images[0]?.url || item.url,
                error: false,
              };
              await updateFinishedProductData(item.id!, updatedItem);
              const newData = await getFinishedProductLsit();
              setConfig((v) => ({ ...v, finishedProduct: newData }));
              abortControllersRef.current.delete(item.id!);
            } else if (result?.data?.task_status === "submitted") {
              // If it is still in the submitted state, continue polling
              setTimeout(() => startPolling(item), 3000);
            }
          })
          .catch(async (error) => {
            console.error(`Error polling item ${item.id}:`, error);
            abortControllersRef.current.delete(item.id!);
            await updateFinishedProductData(item.id!, { ...item, error: true });
            const newData = await getFinishedProductLsit();
            setConfig((v) => ({ ...v, finishedProduct: newData }));
          });
      }
      if (item.dressModel === "SecondaryAction") {
        onGetTaskResult(item.taskId, apiKey || "", abortController.signal)
          .then(async (result: any) => {
            try {
              if (result?.status === "succeeded") {
                if (result?.output) {
                  const url = JSON.parse(result.output);
                  await updateFinishedProductData(item.id!, {
                    url,
                    status: "succeed",
                  });
                } else {
                  await updateFinishedProductData(item.id!, {
                    ...item,
                    status: "failed",
                    error: false,
                  });
                }
              }
              if (result?.status === "failed") {
                await updateFinishedProductData(item.id!, {
                  ...item,
                  status: "failed",
                  error: false,
                });
              }
            } catch (error) {
              await updateFinishedProductData(item.id!, {
                ...item,
                status: "failed",
                error: false,
              });
            }
            const newData = await getFinishedProductLsit();
            setConfig((v) => ({ ...v, finishedProduct: newData }));
            abortControllersRef.current.delete(item.id!);
          })
          .catch(async (error) => {
            console.error(`Error polling item ${item.id}:`, error);
            abortControllersRef.current.delete(item.id!);
            await updateFinishedProductData(item.id!, { ...item, error: true });
            const newData = await getFinishedProductLsit();
            setConfig((v) => ({ ...v, finishedProduct: newData }));
          });
      }
      if (item.dressModel === "Virtual-Tryon") {
        onVirtualTryonTask2(item.taskId, apiKey || "", abortController.signal)
          .then(async (res) => {
            if (res?.image?.url) {
              const url = res?.image?.url;
              await updateFinishedProductData(item.id!, {
                url,
                status: "succeed",
              });
              const newData = await getFinishedProductLsit();
              setConfig((v) => ({ ...v, finishedProduct: newData }));
              abortControllersRef.current.delete(item.id!);
            }
          })
          .catch(async (error) => {
            console.error(`Error polling item ${item.id}:`, error);
            abortControllersRef.current.delete(item.id!);
            await updateFinishedProductData(item.id!, { ...item, error: true });
            const newData = await getFinishedProductLsit();
            setConfig((v) => ({ ...v, finishedProduct: newData }));
          });
      }
    },
    [apiKey, setConfig]
  );

  const onCloseViewer = () => {
    const data = finishedProduct[activeIndex];
    if (data?.url) {
      setConfig((v) => ({ ...v, exhibitData: data }));
    }
    setVisible(false);
  };

  useEffect(() => {
    if (abortControllersRef.current) {
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    }
    getFinishedProductLsit().then((res) => {
      if (res) {
        const data = res.filter((item) => {
          if (!item.taskId && !item.url) {
            deleteFinishedProductData(item.id || 0);
          }
          return item.url || (item.taskId && !item.url);
        });
        setConfig((v) => ({ ...v, finishedProduct: data }));
        if (!exhibitData?.url) {
          setConfig((v) => ({ ...v, exhibitData: data[0], activeIndex: 0 }));
        }
        const submittedList = data.filter((f) => f.status === "submitted");
        submittedList.forEach(startPolling);
      }
    });
    return () => {
      // Clean up all ongoing polls
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    startPolling(finishedProduct[0]);
  }, [performTasks]);

  useEffect(() => {
    if (selectedImageRef.current && scrollContainerRef.current) {
      selectedImageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [exhibitData]);

  return (
    <div className="flex h-full flex-col lg:h-[calc(100vh-100px)]">
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden">
        {exhibitData?.url && (
          <div className="absolute top-2 flex w-full items-center justify-between px-2">
            <SecondaryTreatment
              onRequest={(params) => {
                if (abortControllersRef.current.get(params.id)) {
                  abortControllersRef.current.delete(params.id);
                }
                abortControllersRef.current.set(
                  params.id,
                  params.abortController
                );
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="icon"
                size="icon"
                style={{ boxShadow: "0 0 2px 0px #00000054" }}
                onClick={() => handleDownload(exhibitData?.url || "")}
              >
                <HiDownload />
              </Button>
              <Button
                variant="icon"
                size="icon"
                style={{ boxShadow: "0 0 2px 0px #00000054" }}
                onClick={() => setVisible(true)}
              >
                <BsArrowsFullscreen />
              </Button>
              <Button
                variant="icon"
                size="icon"
                style={{ boxShadow: "0 0 2px 0px #00000054" }}
                onClick={() => onDelete(exhibitData.id)}
              >
                <FaRegTrashAlt className="text-red-600" />
              </Button>
            </div>
          </div>
        )}
        <img
          className={`object-contain ${exhibitData?.url && "h-full"}`}
          src={exhibitData?.url || "/images/global/empty.png"}
        />
        {!exhibitData?.url && <p className="text-2xl">{t("empty")}</p>}
      </div>
      <div
        ref={scrollContainerRef}
        className="flex h-[150px] min-h-[150px] items-center gap-5 overflow-x-auto overflow-y-hidden border-t p-3"
      >
        {finishedProduct?.map((item, index) => (
          <div
            key={item?.id}
            ref={exhibitData?.url === item.url ? selectedImageRef : null}
            onClick={() => {
              if (item.status === "succeed") {
                setConfig((v) => ({
                  ...v,
                  exhibitData: item,
                  activeIndex: index,
                }));
              }
            }}
            className={`group relative flex h-[130px] w-[130px] min-w-[130px] cursor-pointer justify-center border ${exhibitData?.url === item.url && "border-[#8e47f0]"}`}
          >
            <img src={item.url} className="h-full w-auto object-contain" />
            <IoIosCloseCircleOutline
              onClick={() => onDelete(item.id)}
              className="absolute right-0 top-0 z-10 hidden cursor-pointer text-[20px] text-red-600 group-hover:!block"
            />
            {item.status === "submitted" && (
              <div className="flex w-full items-center justify-center rounded-xl bg-[hsl(var(--background-backdrop))] backdrop-blur-sm">
                {item?.error ? (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startPolling(item);
                    }}
                  >
                    <VscDebugStart className="text-[65px] text-[#7c3aed]" />
                  </div>
                ) : (
                  <CgSpinner className="animate-spin text-[65px] text-[#7c3aed]" />
                )}
              </div>
            )}
            {item.status === "failed" && (
              <div className="flex flex-col items-center justify-center gap-2 text-sm text-red-600">
                <IoIosCloseCircleOutline className="text-[40px]" />
                {t("failed")}
              </div>
            )}
          </div>
        ))}
      </div>
      <Viewer
        visible={visible}
        activeIndex={activeIndex}
        images={finishedProduct.map((item) => ({ src: item.url }))}
        customToolbar={(toolbars) => [
          ...toolbars,
          {
            key: "download2",
            render: (
              <i className="react-viewer-icon react-viewer-icon-download" />
            ),
            onClick: (activeImage) => {
              handleDownload(activeImage.src);
            },
          },
        ]}
        onChange={(_, index) => {
          setConfig((v) => ({ ...v, activeIndex: index }));
        }}
        onClose={onCloseViewer}
        onMaskClick={onCloseViewer}
      />
    </div>
  );
};
