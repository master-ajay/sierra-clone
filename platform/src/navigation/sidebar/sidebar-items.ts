import {
  Bot,
  Headphones,
  LineChart,
  MessageSquare,
  PenSquare,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Products",
    items: [
      { id: "agent-studio", title: "Agent Studio", url: "/agent-studio", icon: Bot },
      { id: "ghostwriter", title: "Ghostwriter", url: "http://localhost:8300", icon: PenSquare, newTab: true },
      { id: "explorer", title: "Explorer", url: "http://localhost:8400", icon: LineChart, newTab: true },
      { id: "trust", title: "Trust & Reliability", url: "http://localhost:8501", icon: ShieldCheck, newTab: true },
      { id: "channels", title: "Channels", url: "http://localhost:8201", icon: MessageSquare, newTab: true },
      { id: "expert-answers", title: "Expert Answers", url: "http://localhost:8601", icon: Sparkles, newTab: true },
      { id: "voice", title: "Voice", url: "http://localhost:8701", icon: Headphones, newTab: true },
    ],
  },
];
