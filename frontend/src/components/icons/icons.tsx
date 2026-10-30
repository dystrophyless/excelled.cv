import type { SVGProps } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpDown, BadgeCheck, Bell, Bookmark, Briefcase, Building2, CalendarClock, CalendarDays,
  ChartNoAxesColumn, Check, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleHelp, CircleX,
  Clock, Copy, Download, Ellipsis, ExternalLink, Eye, EyeOff, FileText, FolderGit2, Globe, GraduationCap, Handshake,
  History, House, Inbox, Info, Languages, LayoutDashboard, Link, Lock, LogOut, Mail, MapPin, Megaphone, Menu,
  MessageSquare, Pencil, Phone, Plus, Puzzle, RotateCcw, Search, Send, Settings, SlidersHorizontal, Sparkles,
  SquareKanban, Target, Trash2, TriangleAlert, Upload, UserRound, Users, Wallet, X, type LucideIcon,
} from "lucide-react";

/*
 * Icons — Lucide (the family affect-ui uses), drawn through one wrapper.
 *
 * Stroke rule (measured from affect-ui): the rendered line stays ≈1.3px at every size,
 * so the Lucide strokeWidth (in 24-grid units) shrinks as the icon grows:
 *   12px → 2.5 · 14 → 2.25 · 16 → 2 · 18 → 1.75 · 20 → 1.5 · 24 → 1.3
 *
 * Use a semantic `name` from ICONS so the same concept always gets the same glyph.
 * Pass `icon={SomeLucideIcon}` only when no name fits — then add it to ICONS.
 */

export const ICONS = {
  // ── Interface ────────────────────────────────────────
  check: Check,
  close: X,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  add: Plus,
  search: Search,
  filter: SlidersHorizontal,
  sort: ArrowUpDown,
  more: Ellipsis,
  menu: Menu,
  edit: Pencil,
  delete: Trash2,
  copy: Copy,
  external: ExternalLink,
  upload: Upload,
  download: Download,
  retry: RotateCcw,
  show: Eye,
  hide: EyeOff,
  lock: Lock,
  help: CircleHelp,
  // ── Status ───────────────────────────────────────────
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  rejected: CircleX,
  verified: BadgeCheck,
  // ── Navigation ───────────────────────────────────────
  home: House,
  dashboard: LayoutDashboard,
  inbox: Inbox,
  notifications: Bell,
  messages: MessageSquare,
  settings: Settings,
  logout: LogOut,
  profile: UserRound,
  analytics: ChartNoAxesColumn,
  // ── Novio domain ─────────────────────────────────────
  vacancy: Briefcase,          // any opportunity (internship or job)
  company: Building2,
  application: Send,           // an application / "Apply"
  saved: Bookmark,
  skill: Puzzle,
  match: Target,               // skill match / match score
  recommendation: Sparkles,    // system-suggested, AI ranking — use sparingly
  education: GraduationCap,
  cv: FileText,
  project: FolderGit2,
  experience: History,
  language: Languages,
  candidates: Users,
  candidate: UserRound,
  pipeline: SquareKanban,
  interview: CalendarClock,
  offer: Handshake,
  postVacancy: Megaphone,
  // ── Vacancy facts ────────────────────────────────────
  location: MapPin,
  remote: Globe,
  salary: Wallet,
  deadline: CalendarDays,
  duration: Clock,
  email: Mail,
  phone: Phone,
  link: Link,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

const STROKE_BY_SIZE: Record<number, number> = { 12: 2.5, 13: 2.4, 14: 2.25, 16: 2, 18: 1.75, 20: 1.5, 24: 1.3 };

/** Lucide strokeWidth that renders a ≈1.3px line at `size` px. */
export function strokeFor(size: number) {
  return STROKE_BY_SIZE[size] ?? Math.round(((1.3 * 24) / size) * 100) / 100;
}

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  /** Size in px: 14 (inline small), 16 (default, buttons/rows), 18 (menus), 20 (nav, tiles) */
  size?: number;
} & ({ name: IconName; icon?: never } | { icon: LucideIcon; name?: never });

/** Decorative by default (aria-hidden). Give the surrounding control an aria-label instead. */
export function Icon({ name, icon, size = 16, strokeWidth, ...props }: IconProps) {
  const Glyph = icon ?? ICONS[name as IconName];
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth ?? strokeFor(size)}
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}
