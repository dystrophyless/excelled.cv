import {
  cloneElement, useEffect, useId, useLayoutEffect, useRef, useState,
  type KeyboardEvent, type ReactElement, type ReactNode, type Ref,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { Icon, type IconName } from "@/components/icons";
import styles from "./menu.module.css";

/*
 * DropdownMenu — actions behind a trigger ("⋯" on a row, a split button).
 * Keyboard: Enter/Space/↓ opens and focuses the first item, ↑/↓/Home/End move, Esc closes and
 * returns focus to the trigger, Tab closes. Account menus use affect ProfileMenu instead.
 * The menu renders in a portal with fixed positioning, so scrolling containers (tables, boards) never clip it;
 * it opens upwards when there's no room below and closes when the page scrolls.
 */

export type MenuItem =
  | {
      id: string;
      label: string;
      icon?: IconName;
      /** Red text — for delete / withdraw / reject */
      danger?: boolean;
      disabled?: boolean;
      onSelect?: () => void;
      /** Renders a router link instead of a button */
      to?: string;
    }
  | "separator";

export type MenuTriggerProps = {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
};

export type DropdownMenuProps = {
  /** Render the trigger with these props spread on it, e.g. a ghost icon Button with aria-label */
  trigger: (props: MenuTriggerProps) => ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  "data-testid"?: string;
};

export function DropdownMenu({ trigger, items, align = "end", ...rest }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  // inside an open <dialog> the menu must stay in its top layer; resolved when opening
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const openMenu = () => {
    setContainer(triggerRef.current?.closest("dialog") ?? document.body);
    setOpen(true);
  };
  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const focusables = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") ?? []);

  // Place the portal menu next to the trigger (measured, written straight to the DOM — no extra render)
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const anchor = triggerRef.current;
    if (!open || !menu || !anchor) return;
    const r = anchor.getBoundingClientRect();
    const gap = 6;
    const below = r.bottom + gap + menu.offsetHeight <= window.innerHeight - 8;
    const top = below ? r.bottom + gap : Math.max(8, r.top - gap - menu.offsetHeight);
    const left = align === "end" ? r.right - menu.offsetWidth : r.left;
    menu.style.top = `${top}px`;
    menu.style.left = `${Math.min(Math.max(8, left), window.innerWidth - menu.offsetWidth - 8)}px`;
    menu.dataset.side = below ? "bottom" : "top";
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    focusables()[0]?.focus({ preventScroll: true });
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!root.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const list = focusables();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); list[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); list[list.length - 1]?.focus(); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close(false);
  };

  return (
    <div ref={root} className={styles.root} {...rest}>
      {trigger({
        ref: triggerRef,
        onClick: () => (open ? setOpen(false) : openMenu()),
        onKeyDown: (e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); openMenu(); }
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": menuId,
      })}
      {open && container && createPortal(
        <div ref={menuRef} id={menuId} role="menu" className={styles.menu} data-align={align} onKeyDown={onMenuKey}>
          {items.map((item, index) => {
            if (item === "separator") return <div key={`sep-${index}`} role="separator" className={styles.separator} />;
            const content = (
              <>
                {item.icon && <Icon name={item.icon} size={16} />}
                {item.label}
              </>
            );
            const common = {
              role: "menuitem" as const,
              className: styles.item,
              tabIndex: -1,
              "data-danger": item.danger || undefined,
              "aria-disabled": item.disabled || undefined,
            };
            return item.to && !item.disabled ? (
              <Link key={item.id} to={item.to} {...common} onClick={() => close(false)}>{content}</Link>
            ) : (
              <button
                key={item.id}
                type="button"
                {...common}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>,
        container,
      )}
    </div>
  );
}

export type TooltipProps = {
  /** Short text, one line. Never put essential information only in a tooltip. */
  content: string;
  /** A single focusable element (button, link) */
  children: ReactElement<{ "aria-describedby"?: string }>;
};

/**
 * Hover/focus hint for icon-only buttons and truncated text.
 * Rendered in a portal with fixed positioning: above the element when there is room, otherwise below
 * (e.g. buttons in the sticky header), and kept inside the viewport horizontally.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const [shown, setShown] = useState(false);
  const id = useId();
  const timer = useRef<number | undefined>(undefined);
  const anchor = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const a = anchor.current;
    const t = tip.current;
    if (!shown || !a || !t) return;
    const r = a.getBoundingClientRect();
    const gap = 8;
    const above = r.top - gap - t.offsetHeight >= 8;
    t.style.top = `${above ? r.top - gap - t.offsetHeight : r.bottom + gap}px`;
    const left = r.left + r.width / 2 - t.offsetWidth / 2;
    t.style.left = `${Math.min(Math.max(8, left), window.innerWidth - t.offsetWidth - 8)}px`;
    t.dataset.side = above ? "top" : "bottom";
  }, [shown]);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(true), 300);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setShown(false);
  };

  return (
    <span
      ref={anchor}
      className={styles.tipRoot}
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => e.key === "Escape" && hide()}
    >
      {cloneElement(children, { "aria-describedby": shown ? id : undefined })}
      {shown &&
        createPortal(
          <span ref={tip} id={id} role="tooltip" className={styles.tip}>
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
