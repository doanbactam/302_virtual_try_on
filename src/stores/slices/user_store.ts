import { IFinishedProduct } from "../../api/indexDB/FinishedProductDB";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
export type IProportion = '1:1' | '9:16' | '2:3' | '3:4';
export type UserConfigState = {
    model: {
        gender: 'Male' | 'Female';
        age: 'Child' | 'Youth' | 'MiddleAgedElderly';
        describe: string;
        proportion: IProportion;
    },
    clothing: {
        describe: string;
        proportion: IProportion;
    },
    selcetModel: string,
    selectClothing: string,
    modelList: string[],
    clothingList: string[],
    finishedProduct: IFinishedProduct[];
    exhibitData: Partial<IFinishedProduct>;
    activeIndex: number;
    rightMenuTab: { model: 'preset' | 'custom', clothing: 'preset' | 'custom' };
    performTasks?: boolean;
};

export const userAtom = atomWithStorage<UserConfigState>(
    "userConfig",
    {
        model: {
            gender: 'Male',
            age: 'Child',
            describe: '',
            proportion: '9:16',
        },
        clothing: {
            describe: '',
            proportion: '9:16',
        },
        selcetModel: '',
        selectClothing: '',
        modelList: [],
        clothingList: [],
        finishedProduct: [],
        exhibitData: {},
        activeIndex: 0,
        rightMenuTab: {
            model: 'preset',
            clothing: 'preset'
        },
        performTasks: true,
    },
    createJSONStorage(() =>
        typeof window !== "undefined"
            ? sessionStorage
            : {
                getItem: () => null,
                setItem: () => null,
                removeItem: () => null,
            }
    ),
    {
        getOnInit: true,
    }
);
