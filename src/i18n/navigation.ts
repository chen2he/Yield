import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// locale 感知的导航原语：Link / useRouter / usePathname 自动处理语言前缀，
// getPathname 用于在服务端构造带前缀的目标路径（如登录重定向）。
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
