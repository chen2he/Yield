"use client";

import { Bell, LayoutDashboard, LogOut, Settings, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { logout } from "@/lib/admin/actions";
import Image from "next/image";

const items = [
  { href: "/admin", icon: LayoutDashboard, key: "overview" },
  { href: "/admin/notifications", icon: Bell, key: "notifications" },
  { href: "/admin/orders", icon: ShoppingCart, key: "orders" },
  { href: "/admin/settings", icon: Settings, key: "settings" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tApp = useTranslations("app");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/"  >
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Image src="/icons/icon-192.png" alt="Yield" width={30} height={30} style={{ borderRadius: "7px", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
            <span className="truncate font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              {tApp("name")}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {items.map(({ href, icon: Icon, key }) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton asChild isActive={active} tooltip={t(key)}>
                    <Link href={href}>
                      <Icon />
                      <span>{t(key)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logout} className="w-full">
              <SidebarMenuButton asChild tooltip={t("logout")}>
                <button type="submit">
                  <LogOut />
                  <span>{t("logout")}</span>
                </button>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
