import type { ReactNode } from "react";
import { Sidebar } from "../account";
export default function Layout({ children }: { children: ReactNode }) { return <Sidebar>{children}</Sidebar>; }
