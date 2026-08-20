"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Database,
  BarChart2,
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Home,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const navigation = [
  { name: "Overview", href: "/datasets", icon: Home },
  { name: "Datasets", href: "/datasets", icon: Database },
  { name: "Charts", href: "/charts", icon: BarChart2 },
  { name: "Dashboards", href: "/dashboards", icon: LayoutDashboard },
  { name: "Query", href: "/query", icon: Search },
];

const closeMobileMenu = () => setMobileMenuOpen(false);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card border-r transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Sidebar"
      >
        <Sidebar>
          <SidebarHeader>
            <div className="flex h-16 shrink-0 items-center gap-2 px-4">
              <Link href="/datasets" className="flex items-center gap-2 font-bold text-xl">
                <Database className="h-6 w-6 text-primary" />
                <span className={!sidebarOpen && "hidden"}>DataLens</span>
              </Link>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/datasets"
                    className={pathname === "/datasets" ? "bg-accent text-accent-foreground" : ""}
                    onClick={closeMobileMenu}
                  >
                    <Home className="h-4 w-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/datasets"
                    className={
                      pathname.startsWith("/datasets") && pathname !== "/datasets"
                        ? "bg-accent text-accent-foreground"
                        : pathname === "/datasets"
                        ? ""
                        : ""
                    }
                    onClick={closeMobileMenu}
                  >
                    <Database className="h-4 w-4" />
                    <span>Datasets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/charts"
                    className={pathname.startsWith("/charts") ? "bg-accent text-accent-foreground" : ""}
                    onClick={closeMobileMenu}
                  >
                    <BarChart2 className="h-4 w-4" />
                    <span>Charts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/dashboards"
                    className={pathname.startsWith("/dashboards") ? "bg-accent text-accent-foreground" : ""}
                    onClick={closeMobileMenu}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboards</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/query"
                    className={pathname.startsWith("/query") ? "bg-accent text-accent-foreground" : ""}
                    onClick={closeMobileMenu}
                  >
                    <Search className="h-4 w-4" />
                    <span>Query</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex flex-col gap-2 p-4">
              <Button variant="outline" className="justify-start gap-2" asChild>
                <Link href="/settings" onClick={closeMobileMenu}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="justify-start gap-2 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                      <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{session?.user?.name || "User"}</span>
                      <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                    </div>
                    <ChevronLeft className="ml-auto h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile" className="flex items-center gap-2" onClick={closeMobileMenu}>
                      <Settings className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2 text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarFooter>
        </Sidebar>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden lg:pl-64 ${sidebarOpen ? "lg:pl-64" : "lg:pl-64"}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/datasets/new" onClick={closeMobileMenu}>
                <FileSpreadsheet className="h-5 w-5" />
              </Link>
            </Button>
            <div className="w-px h-6 bg-border mx-2 hidden sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                    <AvatarFallback className="text-sm">{session?.user?.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
              </DropdownMenu>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}