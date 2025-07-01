"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, PieChart, Monitor } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Left Drawer Navigation Component
 * Provides a slide-out navigation menu for mobile and tablet views
 */
export function LeftDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  // Menu items configuration
  const menuItems = [
    {
      key: "dashboard",
      icon: <PieChart className="h-4 w-4 mr-2" />,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      key: "system",
      icon: <Monitor className="h-4 w-4 mr-2" />,
      label: "Configuration",
      href: "/system",
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 h-10 w-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md"
        >
          <Menu className="h-5 w-5 text-black dark:text-white" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="font-mono p-0 w-[280px] sm:max-w-[280px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-colors duration-300"
      >
        <SheetHeader className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 text-left">
          <SheetTitle className="flex items-center text-lg font-semibold text-black dark:text-white transition-colors duration-300">
            <Menu className="h-5 w-5 mr-2" />
            CESS Watchdog
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-160px)]">
          <nav className="space-y-1 p-4">
            {menuItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center py-3 px-4 rounded-md text-sm font-medium text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            className="w-full border-gray-200 dark:border-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
            onClick={() => setIsOpen(false)}
          >
            Close Menu
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}