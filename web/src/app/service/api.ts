import {env} from "next-runtime-env";
import createAxiosInstance from "./axios";
import qs from 'qs';
import {ApiWrapper, getTokenFromCookie} from "@/utils";

const CONSTANTS = {
    PAGINATION: {
        DEFAULT_PAGE_INDEX: 1,
        MAX_PAGE_SIZE: 100
    },
    TIMEOUT: 30000,
    URLS: {
        DEFAULT_API_URL: 'http://localhost:9999',
    },
} as const;

export interface StandardPaginationParams {
    pageIndex?: number;
    pageSize?: number;
}

const getEnvVar = (key: string, defaultValue: string): string => {
    return env(key) || process.env[key] || defaultValue;
};

export const validateStandardPaginationParams = (params: StandardPaginationParams): Required<StandardPaginationParams> => {
    const {pageIndex = CONSTANTS.PAGINATION.DEFAULT_PAGE_INDEX, pageSize = CONSTANTS.PAGINATION.MAX_PAGE_SIZE} = params;
    return {
        pageIndex: Math.max(pageIndex, CONSTANTS.PAGINATION.DEFAULT_PAGE_INDEX),
        pageSize: Math.min(pageSize, CONSTANTS.PAGINATION.MAX_PAGE_SIZE)
    };
};

const BASE_API_URL = getEnvVar("NEXT_PUBLIC_API_URL", CONSTANTS.URLS.DEFAULT_API_URL);
const baseApiClient = createAxiosInstance(BASE_API_URL, {}, CONSTANTS.TIMEOUT);

const authorizedRequest = async <T>(
    requestFn: () => Promise<T>,
    errorMessage = 'Please login first'
): Promise<T> => {
    const token = getTokenFromCookie();
    if (!token) {
        return Promise.reject(errorMessage);
    }

    baseApiClient.defaults.headers.common['Authorization'] = token;
    return requestFn();
};

export const api: any = {
    login: (params: any) => {
        return baseApiClient.post<ApiWrapper<any>>(`/login`, params);
    },

    getHostList: () => {
        return authorizedRequest(() => {
            return baseApiClient.get<ApiWrapper<any>>(`/hosts`);
        });
    },

    getStorageNodesByHost: (host: string) => {
        return authorizedRequest(() => {
            return baseApiClient.get<ApiWrapper<any>>(`/list?${qs.stringify({host})}`);
        });
    },

    getConfig: () => {
        return authorizedRequest(() => {
            return baseApiClient.get<ApiWrapper<any>>(`/config`);
        });
    },

    setConfig: (params: any) => {
        return authorizedRequest(() => baseApiClient.post<ApiWrapper<any>>(`/config`, params));
    },
};