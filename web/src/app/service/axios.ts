"use client";

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";

interface CustomHeaders {
  [key: string]: string;
}

interface JwtPayload {
  exp: number;
  iat: number;
  [key: string]: any;
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const decodedToken = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000;
    return decodedToken.exp < currentTime;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true;
  }
};

const createAxiosInstance = (
  baseURL?: string,
  customHeaders?: CustomHeaders,
  timeout?: number
): AxiosInstance => {
  const config: AxiosRequestConfig = {
    baseURL: baseURL || "http://localhost:8088",
    timeout: timeout || 30000,
    headers: {
      "Content-Type": "application/json",
      ...customHeaders
    }
  };

  const instance = axios.create(config);

  instance.interceptors.request.use(
    (config): AxiosRequestConfig | any => {
      const token = Cookies.get("WatchdogToken");

      if (token) {
        if (isTokenExpired(token) && !config.url?.includes("/login")) {
          Cookies.remove("WatchdogToken");
          window.location.href = "/login";
          return Promise.reject(new Error("Session expired"));
        }
      }
      return config;
    },
    (error: AxiosError): Promise<AxiosError> => {
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => {
      return response;
    },
    (error: AxiosError): Promise<AxiosError> => {
      if (error.response && error.response.status === 401) {
        Cookies.remove("WatchdogToken");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export default createAxiosInstance;