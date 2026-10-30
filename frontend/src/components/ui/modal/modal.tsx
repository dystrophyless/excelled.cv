import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import styles from "./modal.module.css";

/*
 * Modal built on the native <dialog>: focus trap, Esc, inert background and top layer for free.
 * Shape: white card on a gray tray; footer buttons sit on the tray (primary rightmost).
 */

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons, rendered on the tray below the card */
  footer?: ReactNode;
  size?: "md" | "lg";
  /** Close on backdrop click (default true). Turn off for forms with unsaved input. */
  dismissible?: boolean;
  "data-testid"?: string;
};

export function Modal({
  open, onClose, title, description, children, footer, size = "md", dismissible = true, ...rest
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      data-size={size}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // The backdrop belongs to the <dialog>, so check the click landed outside its box (the tray counts as inside)
        if (!dismissible || event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        const inside =
          event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
        if (!inside) onClose();
      }}
      {...rest}
    >
      {open && (
        <>
          <div className={styles.card}>
            <div className={styles.head}>
              <h2 id={titleId} className={styles.title}>{title}</h2>
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                <Icon name="close" size={16} />
              </button>
            </div>
            {description && <p id={descriptionId} className={styles.description}>{description}</p>}
            {children && <div className={styles.body}>{children}</div>}
          </div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </>
      )}
    </dialog>
  );
}
