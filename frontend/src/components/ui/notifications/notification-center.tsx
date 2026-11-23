import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "../button";
import { Tooltip } from "../menu";
import styles from "./notification-center.module.css";

/*
 * NotificationCenter — the bell in the app header and its panel.
 * Bell: ghost icon button + unread badge. Panel (tray + card, like affect ProfileMenu): header with the unread
 * count and "Mark all as read", items grouped Today / Earlier (tinted icon tile · text · time · unread dot),
 * footer link to notification settings. Opening an item marks it read and navigates to it.
 * Fixed-positioned under the bell, kept inside the viewport (full width minus gutters on phones).
 * Esc or a click outside closes and returns focus to the bell.
 */

export type NotificationTone = "neutral" | "accent" | "success" | "warning";

export type NotificationItem = {
  id: string;
  icon: IconName;
  tone?: NotificationTone;
  /** Main line; wrap the actor in <strong> ("<strong>Kaspi.kz</strong> invited you…") */
  title: ReactNode;
  /** Optional second line (vacancy, date of the interview) */
  detail?: string;
  /** "2h ago", "Yesterday" */
  time: string;
  group: "Today" | "Earlier";
  unread?: boolean;
  /** Where opening the notification goes */
  to?: string;
};

export type NotificationCenterProps = {
  items: NotificationItem[];
  /** Notification settings page */
  settingsTo?: string;
};

export function NotificationCenter({ items: initial, settingsTo }: NotificationCenterProps) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const bell = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const navigate = useNavigate();
  const unread = items.filter((i) => i.unread).length;

  // Place the panel under the bell, right-aligned, inside the viewport (DOM write, no extra render)
  useLayoutEffect(() => {
    const p = panel.current;
    const b = bell.current;
    if (!open || !p || !b) return;
    const r = b.getBoundingClientRect();
    p.style.top = `${r.bottom + 8}px`;
    // right-aligned to the bell, but never past the left edge (phones: falls back to the 16px gutter)
    let right = Math.max(16, window.innerWidth - r.right);
    if (window.innerWidth - right - p.offsetWidth < 16) right = 16;
    p.style.right = `${right}px`;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !bell.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        bell.current?.focus();
      }
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const openItem = (item: NotificationItem) => {
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, unread: false } : i)));
    setOpen(false);
    if (item.to) navigate(item.to);
  };

  const groups = (["Today", "Earlier"] as const).map((g) => ({ g, list: items.filter((i) => i.group === g) })).filter((x) => x.list.length);

  return (
    <span className={styles.root}>
      <Tooltip content="Notifications">
        <Button
          ref={bell}
          variant="ghost"
          icon={<Icon name="notifications" size={18} />}
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          data-testid="notifications-button"
        />
      </Tooltip>
      {unread > 0 && <span className={styles.badge} aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}

      {open &&
        createPortal(
          <div ref={panel} className={styles.panel} role="dialog" aria-labelledby={titleId} data-testid="notifications-panel">
            <div className={styles.head}>
              <h2 id={titleId} className={styles.title} tabIndex={-1} data-autofocus="">
                Notifications
                {unread > 0 && <span className={styles.count}>{unread} new</span>}
              </h2>
              {unread > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setItems((all) => all.map((i) => ({ ...i, unread: false })))}>
                  Mark all as read
                </Button>
              )}
            </div>

            <div className={styles.card}>
              {items.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.tile} data-tone="success"><Icon name="success" size={16} /></span>
                  <span className={styles.itemTitle}>You're all caught up</span>
                  <span className={styles.meta}>Invites, views and status changes will appear here.</span>
                </div>
              ) : (
                groups.map(({ g, list }) => (
                  <section key={g} className={styles.group} aria-label={g}>
                    <h3 className={styles.groupLabel}>{g}</h3>
                    <ul className={styles.list}>
                      {list.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={styles.item}
                            data-unread={item.unread || undefined}
                            onClick={() => openItem(item)}
                            data-testid="notification"
                          >
                            <span className={styles.tile} data-tone={item.tone}><Icon name={item.icon} size={16} /></span>
                            <span className={styles.text}>
                              <span className={styles.itemTitle}>{item.title}</span>
                              {item.detail && <span className={styles.meta}>{item.detail}</span>}
                              <span className={styles.time}>{item.time}</span>
                            </span>
                            {item.unread && <span className={styles.dot}><span className="sr-only">Unread</span></span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>

            {settingsTo && (
              <div className={styles.foot}>
                <button type="button" className={styles.footLink} onClick={() => { setOpen(false); navigate(settingsTo); }}>
                  <Icon name="settings" size={14} />
                  Notification settings
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}
