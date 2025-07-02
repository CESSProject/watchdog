"use client";
import React, { Fragment, useCallback, useEffect, useState } from "react";
import Miners, { HostModel } from "./miners";
import axios from "axios";
import { env } from "next-runtime-env";
import { MonitorIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

import { toast, Toaster } from "sonner";
import { api } from "@/app/service/api";
import { ApiWrapper, httpResponseError } from "@/utils";

// API URL constant
const API_URL = env("NEXT_PUBLIC_API_URL") || "http://localhost:13081";

/**
 * Host Management Page
 * Allows users to select and view miners by host
 */
export default function HostManagementPage() {
  // State declarations
  const [hosts, setHosts] = useState<string[]>([]);
  const [hostData, setHostData] = useState<HostModel | null>(null);
  const [selectedHost, setSelectedHost] = useState<string>("");

  /**
   * Fetch available hosts from API
   * @returns {Promise<string|undefined>} First host if available
   */
  const fetchHosts = useCallback(async () => {
    try {
      const res = await api.getHostList();

      if (res.status >= 200 && res.status < 300) {
        if (res.data) {
          setHosts(res.data);
          if (res.data.length > 0) {
            setSelectedHost(res.data[0]);
            return res.data[0];
          } else {
            setSelectedHost("");
          }
        } else {
          toast.error("Failed to retrieve user data");
          return [];
        }
      } else {
        toast.error(`Request error: ${res.status}`);
        return [];
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      httpResponseError(error);
      return [];
    } finally {
    }
  }, []);

  /**
   * Fetch data for a specific host
   * @param {string} host - Host to fetch data for
   */
  const fetchHostData = useCallback(async (host: string) => {
    if (!host) {
      toast.error("No host selected", {
        description: "Please select a host to view its data."
      });
      return;
    }
    try {
      const res = await api.getStorageNodesByHost(host);

      if (res.status >= 200 && res.status < 300 && Array.isArray(res.data)) {
        const data: HostModel = res.data[0];
        setHostData(data);
      } else {
        toast.error(`Request error: ${res.status}`);
        return [];
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      httpResponseError(error);
      return [];
    } finally {
    }

  }, []);

  // Initial data loading
  useEffect(() => {
    fetchHosts()
      .then(firstHost => {
        if (firstHost) {
          fetchHostData(firstHost).then();
        }
      })
      .catch(error => {
        console.error("Error in initial data loading:", error);
      });
  }, [fetchHosts, fetchHostData]);

  /**
   * Handle host selection change
   * @param {string} host - Selected host
   */
  const handleHostChange = (host: string) => {
    setSelectedHost(host);
    fetchHostData(host).then();
  };

  return (
    <Fragment>
      <div className="font-mono transition-colors duration-300">
        {/* Host selection controls */}
        <div className="flex justify-center items-center mt-6">
          {hosts.length > 0 && (
            <>
              <MonitorIcon className="mr-2 h-6 w-6 text-black dark:text-white" />
              <Select
                value={selectedHost}
                onValueChange={handleHostChange}
              >
                <SelectTrigger
                  className="w-[250px] bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-700"
                >
                  <SelectValue placeholder="Select a host" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-700">
                  {hosts.map((host) => (
                    <SelectItem
                      key={host}
                      value={host}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {host}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        {/* Miner data display */}
        {hostData && (
          <div className="mt-4 space-y-12 text-black dark:text-white transition-colors duration-300">
            <Miners key={hostData?.Host || ""} host={hostData} />
          </div>
        )}

        <Toaster
          position="top-center"
          expand={false}
          richColors={false}
          closeButton
          theme="system" // Uses system preference, will follow dark/light mode
          className="font-mono"
        />
      </div>
    </Fragment>
  );
}