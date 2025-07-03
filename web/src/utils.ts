import { toast } from "sonner";

export function unixTimestampToDateFormat(timestamp: number) {
    // 2006-01-02 15:04:05
    // Create a new Date object, multiplying by 1000 to convert seconds to milliseconds
    const date = new Date(timestamp * 1000);

    // Extract date components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    // Combine components into desired format
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export interface ApiResponse<T> {
    code?: number;
    data: T;
    msg?: string;
    total?: number;
}

export interface ApiWrapper<T> {
    status: number;
    data: ApiResponse<T>;
}

export const getTokenFromCookie = () => {
    try {
        const cookies = document.cookie;
        const cookieEntry = cookies.split("; ").find(row => row.startsWith("WatchdogToken="));
        if (!cookieEntry) {
            toast.error("Access token not found in cookies");
            throw new Error("Access token not found in cookies");
        }
        return cookieEntry.split("=")[1];
    } catch (error) {
        toast.error("Failed to retrieve access token: " + error);
        return null;
    }
};

export function httpResponseError(error: any) {
    let errorMessage = "Unknown error";
    if (error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
            errorMessage = `Client error (${status}): ${error.response.data?.message || 'Request parameter error'}`;
        } else if (status >= 500) {
            errorMessage = `Server error (${status}): ${error.response.data?.message || 'Server internal error'}`;
        }
    } else if (error.request) {
        errorMessage = "Unknown error, please check network or contact maintainer";
    } else {
        errorMessage = error.message || errorMessage;
    }
    toast.error(errorMessage)
}
