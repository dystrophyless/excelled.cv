import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Stack } from "@/components/layout";
import { Icon, type IconName } from "@/components/icons";
import {
  Button, ChoiceCard, ChoiceCardGroup, Container, EmptyState, Skeleton, Stepper, TextField, Tray, type ChoiceCardSize,
} from "@/components/ui";
import { Logo } from "@/components/ui/app-shell";
import type { LoadState } from "../model";
import styles from "./profiles.module.css";

/*
 * Onboarding building blocks: the wizard frame (reference /styleguide/templates/wizard) and the one-tap answer picker
 * (kit ChoiceCardGroup, patterns.md §16) with an optional "Other" card that opens a text field.
 */

/* ── Ready-made answers as ChoiceCards, with an optional typed "Other" ── */

export type Choice = { value: string; label: string; description?: string; icon?: IconName };

const OTHER = "other";

export type CardChoicesProps = {
  /** The question; visually hidden with `hideLegend` when the step h1 already asks it */
  legend: string;
  hideLegend?: boolean;
  name: string;
  options: Choice[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  size?: ChoiceCardSize;
  min?: number;
  columns?: number;
  /** An extra last card that reveals a text field; the typed text becomes the value */
  other?: {
    label: string; description?: string; fieldLabel: string; placeholder: string; maxLength: number; hint: string;
    inputMode?: "numeric" | "text";
  };
  "data-testid"?: string;
};

export function CardChoices({
  legend, hideLegend, name, options, value, onChange, error, size = "md", min, columns, other, "data-testid": testId,
}: CardChoicesProps) {
  const listed = options.some((o) => o.value === value);
  const [otherOn, setOtherOn] = useState(Boolean(other) && value !== "" && !listed);
  const otherInput = useRef<HTMLInputElement>(null);
  const picked = useRef(false);

  useEffect(() => {
    if (otherOn && picked.current) otherInput.current?.focus();
    picked.current = false;
  }, [otherOn]);

  const showOther = Boolean(other) && otherOn;
  return (
    <Stack gap={16} data-testid={testId}>
      <ChoiceCardGroup
        legend={legend}
        hideLegend={hideLegend}
        name={name}
        size={size}
        min={min}
        columns={columns}
        options={options}
        value={otherOn ? "" : value}
        error={showOther ? undefined : error}
        onChange={(v) => { setOtherOn(false); onChange(v); }}
      >
        {other && (
          <ChoiceCard
            value={OTHER}
            label={other.label}
            description={other.description}
            checked={otherOn}
            onChange={() => { picked.current = true; setOtherOn(true); if (listed) onChange(""); }}
          />
        )}
      </ChoiceCardGroup>
      {other && showOther && (
        <TextField
          ref={otherInput}
          label={other.fieldLabel}
          name={`${name}Other`}
          inputMode={other.inputMode}
          value={value}
          maxLength={other.maxLength}
          placeholder={other.placeholder}
          hint={other.hint}
          error={error}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Stack>
  );
}

/* ── Wizard frame ────────────────────────────────────────── */

export type WizardFrameProps = {
  state: LoadState;
  steps: string[];
  /** 0-based */
  current: number;
  title: string;
  sub: string;
  /** Tray footer hint */
  hint: string;
  /** Where the logo leads */
  home: string;
  /** Alerts above the tray (save error, "go back and fix" summary) */
  alerts?: ReactNode;
  saving?: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSave: () => void;
  onSignOut: () => void;
  onRetry?: () => void;
  formLabel: string;
  /** data-testid of the tray; the step name is added as data-step */
  testId: string;
  skeletonFields: number;
  children: ReactNode;
};

export function WizardFrame(p: WizardFrameProps) {
  const last = p.current === p.steps.length - 1;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (p.saving || p.state !== "ready") return;
    (last ? p.onSave : p.onContinue)();
  };
  return (
    <div className={styles.wizardPage}>
      <Container width="form">
        <header className={styles.wizardBar}>
          <Logo to={p.home} />
          <Button variant="ghost" size="sm" icon={<Icon name="logout" />} disabled={p.saving} onClick={p.onSignOut}>Log out</Button>
        </header>
        <main className={styles.wizardBody}>
          {p.steps.length > 1 && <Stepper steps={p.steps} current={p.current} />}
          <div className={styles.wizardHead}>
            <h1 className={styles.wizardTitle}>{p.title}</h1>
            <p className={styles.wizardSub}>{p.sub}</p>
          </div>
          {p.state === "ready" && p.alerts}

          <form onSubmit={submit} aria-label={p.formLabel} noValidate className={styles.wizardForm}>
            {p.state === "error" ? (
              <Tray data-testid={p.testId}>
                <EmptyState
                  tone="error"
                  title="Couldn't load the form"
                  description="Check your connection and try again."
                  actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
                />
              </Tray>
            ) : p.state === "loading" ? (
              <Tray padding="lg" aria-busy="true" data-testid={p.testId} footer={<Skeleton width={220} height={12} />}>
                <Stack gap={12}>
                  <Skeleton width={120} height={12} />
                  {Array.from({ length: p.skeletonFields }, (_, i) => <Skeleton key={i} height={36} />)}
                </Stack>
              </Tray>
            ) : (
              <Tray padding="lg" data-testid={p.testId} data-step={p.steps[p.current]} footer={<span>{p.hint}</span>}>
                {p.children}
              </Tray>
            )}
            <div className={styles.wizardFoot}>
              {p.current > 0 ? (
                <Button variant="ghost" icon={<Icon name="arrowLeft" />} disabled={p.saving} onClick={p.onBack}>Back</Button>
              ) : (
                <span />
              )}
              {last ? (
                <Button type="submit" loading={p.saving} disabled={p.state !== "ready"}>Save</Button>
              ) : (
                <Button type="submit" iconRight={<Icon name="arrowRight" />} disabled={p.state !== "ready"}>Continue</Button>
              )}
            </div>
          </form>
        </main>
      </Container>
    </div>
  );
}
