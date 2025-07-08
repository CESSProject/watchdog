"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { env } from "next-runtime-env";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Plus } from "lucide-react";
import { toast, Toaster } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { api } from "@/app/service/api";
import { ApiWrapper, httpResponseError } from "@/utils";

// Define the Zod schema for form validation
const hostsSchema = z.object({
  ip: z.string().min(1, "IP address is required"),
  port: z.string().min(1, "Port is required"),
  ca_path: z.string().optional(),
  cert_path: z.string().optional(),
  key_path: z.string().optional()
});

const emailSchema = z.object({
  smtp_endpoint: z.string().optional(),
  smtp_port: z.number().int().positive().optional().nullable(),
  smtp_account: z.string().optional(),
  smtp_password: z.string().optional(),
  receiver: z.array(z.string())
});

const alertSchema = z.object({
  enable: z.boolean(),
  webhook: z.array(z.string()),
  email: emailSchema
});

const serverSchema = z.object({
  port: z.number().int().positive(),
  external: z.boolean()
});

const configSchema = z.object({
  server: serverSchema,
  scrapeInterval: z.number().int().positive("Interval must be a positive number"),
  hosts: z.array(hostsSchema),
  alert: alertSchema
});

// Type inference from Zod schema
type ConfigFormValues = z.infer<typeof configSchema>;

/**
 * Watchdog Configuration Page
 * Allows users to manage and update system configuration
 */
export default function ConfigurationPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Initialize form with Zod resolver
  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      server: {
        port: 13081,
        external: false
      },
      scrapeInterval: 60,
      hosts: [],
      alert: {
        enable: false,
        webhook: [],
        email: {
          smtp_endpoint: "",
          smtp_port: 587,
          smtp_account: "",
          smtp_password: "",
          receiver: []
        }
      }
    }
  });

  // Watch fields for dynamic rendering
  const watchHosts = form.watch("hosts") || [];
  const watchWebhooks = form.watch("alert.webhook") || [];
  const watchReceivers = form.watch("alert.email.receiver") || [];

  // Fetch configuration on component mount
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const res = await api.getConfig() as ApiWrapper<any>;

        if (res.status >= 200 && res.status < 300 && res.data) {
          // Map API response to the form structure
          const configData = mapResponseToFormData(res.data);
          // Reset form with validated data
          form.reset(configData);
        }
      } catch (error) {
        console.error("Error fetching configuration:", error);
        toast.error("Failed to fetch configuration data", {
          description: "Please try again later or contact support.",
          duration: 5000
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [form]);

  // Map API response to form data with proper field mapping
  function mapResponseToFormData(apiResponse: any): ConfigFormValues {
    // Log API response structure

    // Create safe default values with field mapping based on API structure
    const formData: ConfigFormValues = {
      server: {
        // Root-level fields in API need to be moved to server object
        port: Number(apiResponse.port) || 13081,
        external: Boolean(apiResponse.external) || false
      },
      scrapeInterval: Number(apiResponse.scrapeInterval) || 60,
      hosts: Array.isArray(apiResponse.hosts) ? apiResponse.hosts.map((host: any) => ({
        // Map capitalized API fields to lowercase form fields
        ip: String(host.IP || ""),
        port: String(host.Port || ""),
        ca_path: String(host.CAPath || ""),
        cert_path: String(host.CertPath || ""),
        key_path: String(host.KeyPath || "")
      })) : [],
      alert: {
        enable: Boolean(apiResponse.alert?.enable) || false,
        webhook: Array.isArray(apiResponse.alert?.webhook) ?
          apiResponse.alert.webhook.map((url: any) => String(url || "")) : [],
        email: {
          // Note capitalization difference: Email in API vs email in form
          smtp_endpoint: String(apiResponse.alert?.Email?.smtp_endpoint || ""),
          smtp_port: Number(apiResponse.alert?.Email?.smtp_port) || 587,
          smtp_account: String(apiResponse.alert?.Email?.smtp_account || ""),
          smtp_password: String(apiResponse.alert?.Email?.smtp_password || ""),
          receiver: Array.isArray(apiResponse.alert?.Email?.receiver) ?
            apiResponse.alert.Email.receiver.map((email: any) => String(email || "")) : []
        }
      }
    };

    return formData;
  }

  // Prepare data for submission to match the API expected structure
  function prepareSubmissionData(formValues: ConfigFormValues): any {
    return {
      // Move server fields to root level
      port: formValues.server.port,
      external: formValues.server.external,
      scrapeInterval: formValues.scrapeInterval,
      hosts: formValues.hosts.map(host => ({
        // Convert to capitalized property names
        IP: host.ip,
        Port: host.port,
        CAPath: host.ca_path,
        CertPath: host.cert_path,
        KeyPath: host.key_path
      })),
      alert: {
        enable: formValues.alert.enable,
        webhook: formValues.alert.webhook,
        // Capitalize Email to match API expectation
        Email: {
          smtp_endpoint: formValues.alert.email.smtp_endpoint,
          smtp_port: formValues.alert.email.smtp_port,
          smtp_account: formValues.alert.email.smtp_account,
          smtp_password: formValues.alert.email.smtp_password,
          receiver: formValues.alert.email.receiver
        }
      }
    };
  }

  // Handle form submission
  const onSubmit = async (values: ConfigFormValues) => {
    // Convert form values to match API structure
    const submissionData = prepareSubmissionData(values);

    toast.promise(
      async () => {
        setIsLoading(true);
        try {
          const res = await api.setConfig(submissionData) as ApiWrapper<any>;
          if (res.status >= 200 && res.status < 300) {
            return res.status;
          } else {
            toast.error(`Request error: ${res.status}`);
            return;
          }
        } catch (error) {
          console.error("Failed to update config:", error);
          httpResponseError(error);
          return;
        } finally {
          setIsLoading(false);
        }
      },
      {
        loading: "Saving configuration...",
        success: "Configuration saved successfully!",
        error: "Failed to save configuration. Please try again."
      }
    );
  };

  // Add host helper function
  const addHost = () => {
    const currentHosts = form.getValues("hosts") || [];
    form.setValue("hosts", [
      ...currentHosts,
      { ip: "", port: "", ca_path: "", cert_path: "", key_path: "" }
    ], { shouldDirty: true });
    toast.info("New host added", { description: "Please fill in the host details" });
  };

  // Remove host helper function
  const removeHost = (index: number) => {
    const updatedHosts = [...form.getValues("hosts")];
    updatedHosts.splice(index, 1);
    form.setValue("hosts", updatedHosts, { shouldDirty: true });
    toast.info(`Host #${index + 1} removed`);
  };

  // Add webhook helper function
  const addWebhook = () => {
    const webhooks = form.getValues("alert.webhook") || [];
    form.setValue("alert.webhook", [...webhooks, ""], { shouldDirty: true });
    toast.info("New webhook added");
  };

  // Remove webhook helper function
  const removeWebhook = (index: number) => {
    const webhooks = [...form.getValues("alert.webhook")];
    webhooks.splice(index, 1);
    form.setValue("alert.webhook", webhooks, { shouldDirty: true });
    toast.info("Webhook removed");
  };

  // Add email recipient helper function
  const addEmailRecipient = () => {
    const receivers = form.getValues("alert.email.receiver") || [];
    form.setValue("alert.email.receiver", [...receivers, ""], { shouldDirty: true });
    toast.info("New email recipient added");
  };

  // Remove email recipient helper function
  const removeEmailRecipient = (index: number) => {
    const receivers = [...form.getValues("alert.email.receiver")];
    receivers.splice(index, 1);
    form.setValue("alert.email.receiver", receivers, { shouldDirty: true });
    toast.info("Email recipient removed");
  };
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 font-mono transition-all duration-300">
      <Toaster richColors={false} position="top-center" closeButton />

      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-black shadow-md transition-all duration-300">
        <CardHeader className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <CardTitle className="text-2xl font-bold text-center text-black dark:text-white transition-colors duration-300">
            Configuration
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6 text-white dark:text-white transition-colors duration-300">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 dark:border-gray-600 border-t-blue-600 dark:border-t-blue-400 transition-colors duration-300"></div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Server Configuration Section */}
                <Accordion type="single" collapsible defaultValue="server" className="w-full">
                  <AccordionItem value="server" className="border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <AccordionTrigger className="text-lg font-semibold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-750 px-4 py-2 rounded-md transition-colors duration-300">
                      Server Settings
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="server.port"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                Port
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  disabled
                                  className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-300 dark:border-gray-600 transition-colors duration-300"
                                  value={field.value || ""}
                                  onChange={e => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormDescription className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                Server port (read-only)
                              </FormDescription>
                              <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="server.external"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-x-2">
                              <div className="space-y-0.5">
                                <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                  External Access
                                </FormLabel>
                                <FormDescription className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                  Allow external connections (read-only)
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value || false}
                                  onCheckedChange={field.onChange}
                                  disabled
                                  className="cursor-not-allowed data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-600 transition-colors duration-300"
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="scrapeInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                              Scrape Interval (seconds)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value || ""}
                                onChange={e => field.onChange(Number(e.target.value))}
                                className="max-w-[200px] border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors duration-300"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                              Time interval between data collection (in seconds)
                            </FormDescription>
                            <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Hosts Configuration Section */}
                <Accordion type="single" collapsible defaultValue="hosts" className="w-full">
                  <AccordionItem value="hosts" className="border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <AccordionTrigger className="text-lg font-semibold text-black dark:text-white px-4 py-2 rounded-md transition-colors duration-300">
                      Host Management
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {watchHosts.map((_, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-4 relative bg-white dark:bg-black transition-colors duration-300"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-300"
                            onClick={() => removeHost(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-black">
                            <FormField
                              control={form.control}
                              name={`hosts.${index}.ip`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-black dark:text-white font-medium transition-colors duration-300">
                                    IP Address
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="192.168.1.1"
                                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`hosts.${index}.port`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                    Port
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="8080"
                                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Separator className="my-4 bg-gray-200 dark:bg-gray-700 transition-colors duration-300" />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`hosts.${index}.ca_path`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                    CA Path
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="/path/to/ca"
                                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`hosts.${index}.cert_path`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                    Certificate Path
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="/path/to/cert"
                                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`hosts.${index}.key_path`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                    Key Path
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="/path/to/key"
                                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-300 dark:border-gray-600 transition-colors duration-300"
                        onClick={addHost}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Host
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Alert Configuration Section */}
                <Accordion type="single" collapsible defaultValue="alert" className="w-full">
                  <AccordionItem value="alert" className="border-gray-200 dark:border-gray-700 transition-colors duration-300">
                    <AccordionTrigger className="text-lg font-semibold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-750 px-4 py-2 rounded-md transition-colors duration-300">
                      Alert Configuration
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-2">
                      <FormField
                        control={form.control}
                        name="alert.enable"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                              <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                Enable Alerts
                              </FormLabel>
                              <FormDescription className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                Send notifications when issues are detected
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked);
                                  toast.info(checked ? "Alerts enabled" : "Alerts disabled");
                                }}
                                className="data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-600 transition-colors duration-300"
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                          </FormItem>
                        )}
                      />

                      <Separator className="my-4 bg-gray-200 dark:bg-gray-700 transition-colors duration-300" />

                      <div className="space-y-4">
                        <Label className="text-base font-medium text-black dark:text-white transition-colors duration-300">
                          Webhook Notifications
                        </Label>

                        {watchWebhooks.map((_, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <FormField
                              control={form.control}
                              name={`alert.webhook.${index}`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="https://webhook-url.com/endpoint"
                                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                    />
                                  </FormControl>
                                  <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                                </FormItem>
                              )}
                            />

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-300"
                              onClick={() => removeWebhook(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-dashed text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-300 dark:border-gray-600 transition-colors duration-300"
                          onClick={addWebhook}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Webhook URL
                        </Button>
                      </div>

                      <Separator className="my-4 bg-gray-200 dark:bg-gray-700 transition-colors duration-300" />

                      <div className="space-y-4">
                        <Label className="text-base font-medium text-black dark:text-white transition-colors duration-300">
                          Email Notifications
                        </Label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="alert.email.smtp_endpoint"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                  SMTP Server
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="smtp.example.com"
                                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="alert.email.smtp_port"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                  SMTP Port
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    value={field.value ?? ""}
                                    onChange={e => {
                                      const value = e.target.value;
                                      field.onChange(value === "" ? null : Number(value));
                                    }}
                                    placeholder="587"
                                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="alert.email.smtp_account"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                  SMTP Account
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled
                                    className="bg-white dark:bg-black cursor-not-allowed text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 transition-colors duration-300"
                                    placeholder="username@example.com"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                  Set via environment variables only
                                </FormDescription>
                                <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="alert.email.smtp_password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white dark:text-white font-medium transition-colors duration-300">
                                  SMTP Password
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="password"
                                    disabled
                                    className="bg-white dark:bg-black cursor-not-allowed text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 transition-colors duration-300"
                                    placeholder="••••••••••••"
                                  />
                                </FormControl>
                                <FormDescription className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                                  Set via environment variables only
                                </FormDescription>
                                <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <Label className="text-sm font-medium text-white dark:text-white transition-colors duration-300">
                            Email Recipients
                          </Label>

                          {watchReceivers.map((_, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <FormField
                                control={form.control}
                                name={`alert.email.receiver.${index}`}
                                render={({ field }) => (
                                  <FormItem className="flex-1">
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="recipient@example.com"
                                        className="border-gray-300 dark:border-gray-600 bg-white dark:bg-black text-black dark:text-white transition-colors duration-300"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-red-500 dark:text-red-400 transition-colors duration-300" />
                                  </FormItem>
                                )}
                              />

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-300"
                                onClick={() => removeEmailRecipient(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-dashed text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-300 dark:border-gray-600 transition-colors duration-300"
                            onClick={addEmailRecipient}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Email Recipient
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="submit"
                          disabled={isLoading || !form.formState.isDirty}
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium transition-colors duration-300"
                        >
                          {isLoading ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-500 border-t-white mr-2 transition-colors duration-300"></div>
                              Saving...
                            </>
                          ) : "Save Configuration"}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white dark:bg-black text-black dark:text-white border-gray-200 dark:border-gray-700 transition-colors duration-300">
                        <p>Update and save your configuration</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}