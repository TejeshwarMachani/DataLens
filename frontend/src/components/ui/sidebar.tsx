"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Sidebar = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 overflow-y-auto p-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
Sidebar.displayName = "Sidebar";

const SidebarContent = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
};
SidebarContent.displayName = "SidebarContent";

const SidebarHeader = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn("flex items-center gap-2 overflow-x-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
};
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn("flex items-center gap-2 overflow-x-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
};
SidebarFooter.displayName = "SidebarFooter";

const SidebarMenu = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
}) => {
  return (
    <ul
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </ul>
  );
};
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
}) => {
  return (
    <li
      className={cn("", className)}
      {...props}
    >
      {children}
    </li>
  );
};
SidebarMenuItem.displayName = "SidebarMenuItem";

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }
>(({ className, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "button";

  return (
    <Comp
      ref={ref}
      className={cn(
        "flex w-full items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-sm font-medium outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton };