"use client";

import React, {useEffect, useState} from "react";
import { api } from "@/app/service/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import {httpResponseError} from "@/utils";
import Cookies from "js-cookie";
import { useRouter } from 'next/navigation';
import {isTokenExpired} from "@/app/service/axios";
const formSchema = z.object({
    username: z.string().min(1, { message: "Please enter your account" }),
    password: z.string().min(1, { message: "Please enter your password" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const isAlreadyLoggedIn = async () => {
        try {
            const token = Cookies.get("WatchdogToken");
            if (!token) {
                return;
            }
            if(!isTokenExpired(token.toString())){
                router.push("/admin/dashboard");
            }
        } catch (error) {
            console.error("Error checking login status:", error);
        }
    }

    useEffect(() => {
        isAlreadyLoggedIn().then()
    }, []);

    const loginHandler = async (values: FormValues) => {
        setIsLoading(true);

        try {
            const response = await api.login(
                JSON.stringify({
                    username: values.username,
                    password: values.password,
                })
            );

            if (response.status == 401) { // Unauthorized
                setHasError(true);
                toast.error("Login failed", {
                    description: "Incorrect account or password",
                });
            } else {
                if (response.status >= 200 && response.status < 300 && response.data.token) {
                    document.cookie = `WatchdogToken=Bearer ${response.data.token}; Path=/; SameSite=Strict`;
                    localStorage.setItem("username", response.data.username);

                    toast.success("Login success", {});

                    setTimeout(() => {
                        window.location.href="/admin/dashboard";
                    }, 500);
                }
            }
        } catch (error) {
            httpResponseError(error);
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            <div className="w-full max-w-md mx-auto mt-[100px]">
                <Card>
                    <CardHeader className="space-y-1 text-center">
                        <Image
                            className="mx-auto items-center justify-center"
                            src="/cess_logo.png"
                            alt="CESS Logo"
                            width={120}
                            height={60}
                            priority
                        />
                        <CardTitle className="text-2xl font-bold">Watchdog</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(loginHandler)}
                                className="space-y-4"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isLoading) {
                                        e.preventDefault();
                                        form.handleSubmit(loginHandler)();
                                    }
                                }}
                            >
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Email or username"
                                                    type="text"
                                                    disabled={isLoading}
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        setHasError(false);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Please enter your password"
                                                    type="password"
                                                    disabled={isLoading}
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        setHasError(false);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {hasError && (
                                    <div className="text-sm font-medium text-destructive text-center">
                                        Incorrect account or password
                                    </div>
                                )}
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Logging in...
                                        </>
                                    ) : (
                                        "Login"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}