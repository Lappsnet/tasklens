"use client";

/* TaskLens UI primitives (U1), built on React Aria Components.
   RAC ships zero default styling — every state is styled with Tailwind +
   Blueprint tokens. Backwards-compatible exports keep pre-U7 screens working. */

import React, { useEffect, useRef, useState } from "react";
import {
  Button as RACButton,
  type ButtonProps as RACButtonProps,
  Calendar,
  CalendarCell,
  CalendarGrid,
  ComboBox as RACComboBox,
  type ComboBoxProps as RACComboBoxProps,
  DateInput,
  DatePicker as RACDatePicker,
  type DatePickerProps as RACDatePickerProps,
  type DateValue,
  DateSegment,
  Dialog as RACDialog,
  type DialogProps as RACDialogProps,
  DialogTrigger,
  FieldError,
  Group,
  Heading,
  Input as RACInput,
  type InputProps as RACInputProps,
  Label,
  ListBox,
  ListBoxItem,
  type ListBoxProps as RACListBoxProps,
  Menu as RACMenu,
  type MenuProps as RACMenuProps,
  MenuItem,
  MenuTrigger,
  Modal,
  ModalOverlay,
  Popover,
  Select as RACSelect,
  type SelectProps as RACSelectProps,
  SelectValue,
  Tab as RACTab,
  TabList as RACTabList,
  type TabListProps as RACTabListProps,
  TabPanel as RACTabPanel,
  type TabPanelProps as RACTabPanelProps,
  type TabProps as RACTabProps,
  Tabs as RACTabs,
  type TabsProps as RACTabsProps,
  TextArea as RACTextArea,
  type TextAreaProps as RACTextAreaProps,
  TextField as RACTextField,
  type TextFieldProps as RACTextFieldProps,
  Tooltip as RACTooltip,
  TooltipTrigger,
} from "react-aria-components";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Check,
  WarningCircle,
} from "@phosphor-icons/react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* RAC popover shell shared by Select / Combobox / Menu / DatePicker. */
const popover =
  "min-w-[var(--trigger-width)] rounded-card border border-line bg-surface p-1 shadow-lifted outline-none data-[entering]:anim-pop";

/* ---------- Button ---------- */

type BtnProps = Omit<RACButtonProps, "children" | "className" | "onPress" | "isDisabled"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "md" | "lg";
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Legacy handler (mapped to RAC onPress). */
  onClick?: () => void;
  onPress?: () => void;
  /** Legacy flag (mapped to RAC isDisabled). */
  disabled?: boolean;
};

/** RAC Button with Blueprint styling + loading progress sweep. */
export function Button({ variant = "primary", size = "md", loading, className, children, onClick, onPress, disabled, isDisabled, ...rest }: BtnProps & { isDisabled?: boolean }) {
  const base =
    "relative inline-flex items-center justify-center gap-2 font-semibold rounded-btn overflow-hidden transition duration-200 outline-none " +
    "data-[pressed]:scale-[0.97] data-[disabled]:opacity-55 data-[disabled]:cursor-wait " +
    "data-[focus-visible]:outline data-[focus-visible]:outline-[3px] data-[focus-visible]:outline-signal data-[focus-visible]:outline-offset-2";
  const sizes = size === "lg" ? "w-full px-5 py-3.5 text-base mt-2" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-ink text-bg shadow-soft hover:brightness-125",
    secondary: "bg-surface text-ink border border-ink hover:bg-ink hover:text-bg",
    ghost: "bg-transparent text-ink underline px-2 py-1",
    danger: "bg-[#B42318] text-white hover:brightness-110",
    accent: "btn-glow btn-sheen text-white bg-[linear-gradient(180deg,#ff8a3d,var(--signal)_60%,#c24e08)]",
  };
  return (
    <RACButton
      {...rest}
      isPending={loading}
      isDisabled={disabled ?? isDisabled}
      onPress={() => {
        onPress?.();
        onClick?.();
      }}
      className={cn(base, sizes, variants[variant], className)}
    >
      {children}
      {loading && <span aria-hidden="true" className="absolute inset-0 btn-sweep" />}
    </RACButton>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: Omit<RACButtonProps, "children" | "className"> & { label: string; className?: string; children: React.ReactNode }) {
  return (
    <RACButton
      {...rest}
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-btn border border-line bg-surface text-ink transition duration-200 outline-none",
        "hover:border-ink data-[pressed]:scale-95 data-[disabled]:opacity-50",
        "data-[focus-visible]:outline data-[focus-visible]:outline-[3px] data-[focus-visible]:outline-signal",
        className,
      )}
    >
      {children}
    </RACButton>
  );
}

/* ---------- Forms ---------- */

const fieldInput =
  "w-full rounded-input border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-muted " +
  "outline-none transition duration-200 data-[focused]:border-blueprint " +
  "data-[disabled]:opacity-50";

export function Input({ className, ...rest }: RACInputProps & { className?: string }) {
  return <RACInput {...rest} className={cn(fieldInput, className)} />;
}

export function Textarea({ className, ...rest }: RACTextAreaProps & { className?: string }) {
  return <RACTextArea {...rest} className={cn(fieldInput, "min-h-24", className)} />;
}

type FieldProps = RACTextFieldProps & {
  label?: string;
  error?: string;
  children: React.ReactNode;
};

export function Field({ label, error, children, ...rest }: FieldProps) {
  return (
    <RACTextField {...rest} className="flex flex-col gap-1.5">
      {label && <Label className="text-sm font-semibold text-ink">{label}</Label>}
      {children}
      {error ? <span className="text-sm text-[#B42318]">{error}</span> : <FieldError className="text-sm text-[#B42318]" />}
    </RACTextField>
  );
}

export interface SelectItem {
  id: string;
  label: string;
}

export function Select({
  label,
  items,
  ...rest
}: RACSelectProps<SelectItem> & { label?: string; items: SelectItem[] }) {
  return (
    <RACSelect {...rest}>
      {label && <Label className="mb-1.5 block text-sm font-semibold text-ink">{label}</Label>}
      <RACButton className={cn(fieldInput, "flex cursor-pointer items-center justify-between")}>
        <SelectValue className="flex-1 truncate data-[placeholder]:text-muted" />
        <CaretDown aria-hidden="true" className="text-muted" />
      </RACButton>
      <Popover className={popover} placement="bottom start">
        <ListBox className="max-h-64 overflow-auto outline-none" items={items}>
          {(item) => (
            <ListBoxItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between rounded-btn px-3 py-2 text-sm text-ink outline-none data-[focused]:bg-[color-mix(in_srgb,var(--blueprint)_12%,transparent)] data-[selected]:font-semibold data-[selected]:bg-[color-mix(in_srgb,var(--blueprint)_18%,transparent)]"
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </RACSelect>
  );
}

export function ComboField({
  label,
  items,
  ...rest
}: RACComboBoxProps<SelectItem> & { label?: string; items: SelectItem[] }) {
  return (
    <RACComboBox {...rest} menuTrigger="focus">
      {label && <Label className="mb-1.5 block text-sm font-semibold text-ink">{label}</Label>}
      <div className="relative">
        <RACInput className={cn(fieldInput, "pr-9")} />
        <RACButton
          aria-label="show options"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted outline-none data-[pressed]:scale-95"
        >
          <CaretDown aria-hidden="true" />
        </RACButton>
      </div>
      <Popover className={popover} placement="bottom start">
        <ListBox className="max-h-64 overflow-auto outline-none" items={items}>
          {(item) => (
            <ListBoxItem
              key={item.id}
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between rounded-btn px-3 py-2 text-sm text-ink outline-none data-[focused]:bg-[color-mix(in_srgb,var(--blueprint)_12%,transparent)] data-[selected]:font-semibold data-[selected]:bg-[color-mix(in_srgb,var(--blueprint)_18%,transparent)]"
            >
              {item.label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </RACComboBox>
  );
}

export function DateField({ label, ...rest }: RACDatePickerProps<DateValue> & { label?: string }) {
  return (
    <RACDatePicker {...rest}>
      {label && <Label className="mb-1.5 block text-sm font-semibold text-ink">{label}</Label>}
      <Group className={cn(fieldInput, "flex items-center gap-1 px-2")}>
        <DateInput className="flex flex-1 outline-none">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 outline-none data-[focused]:bg-blueprint data-[focused]:text-white"
            />
          )}
        </DateInput>
      </Group>
      <Popover
        className="rounded-card border border-line bg-surface p-3 shadow-lifted outline-none data-[entering]:anim-pop"
        placement="bottom start"
      >
        <Calendar className="outline-none">
          <header className="mb-2 flex items-center justify-between">
            <Heading className="font-display text-base font-bold" />
          </header>
          <CalendarGrid className="border-collapse">
            {(date) => (
              <CalendarCell
                date={date}
                className="m-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm outline-none data-[pressed]:scale-90 data-[selected]:bg-signal data-[selected]:font-bold data-[selected]:text-white data-[focused]:ring-2 data-[focused]:ring-signal data-[disabled]:opacity-30 data-[outside-month]:opacity-40"
              />
            )}
          </CalendarGrid>
        </Calendar>
      </Popover>
    </RACDatePicker>
  );
}

/* ---------- Navigation: Tabs, Menu ---------- */

export function Tabs({ children, ...rest }: RACTabsProps) {
  return (
    <RACTabs {...rest} className="flex flex-col gap-3">
      {children}
    </RACTabs>
  );
}

export function TabList({ className, ...rest }: RACTabListProps<object> & { className?: string }) {
  return <RACTabList {...rest} className={cn("flex gap-1 border-b border-line", className)} />;
}

export function Tab(props: RACTabProps) {
  return (
    <RACTab
      {...props}
      className="relative cursor-pointer px-4 py-2.5 text-sm font-semibold text-muted outline-none transition-colors data-[hovered]:text-ink data-[selected]:text-ink data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal"
    />
  );
}

export function TabPanel(props: RACTabPanelProps) {
  return <RACTabPanel {...props} className="outline-none data-[entering]:anim-fade-up" />;
}

export function Menu({
  label,
  items,
  onAction,
}: {
  label: React.ReactNode;
  items: { id: string; label: string; danger?: boolean }[];
  onAction?: (id: string) => void;
}) {
  return (
    <MenuTrigger>
      <RACButton
        aria-label={typeof label === "string" ? label : "menu"}
        className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none transition data-[pressed]:scale-95 data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal"
      >
        {label}
        <CaretDown aria-hidden="true" className="text-muted" />
      </RACButton>
      <Popover className="min-w-44 rounded-card border border-line bg-surface p-1 shadow-lifted outline-none data-[entering]:anim-pop" placement="bottom end">
        <RACMenu className="outline-none" onAction={(k) => onAction?.(String(k))}>
          {items.map((it) => (
            <MenuItem
              key={it.id}
              id={it.id}
              textValue={it.label}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-btn px-3 py-2 text-sm outline-none",
                "data-[focused]:bg-[color-mix(in_srgb,var(--blueprint)_12%,transparent)] data-[disabled]:opacity-40",
                it.danger ? "text-[#B42318]" : "text-ink",
              )}
            >
              {it.label}
            </MenuItem>
          ))}
        </RACMenu>
      </Popover>
    </MenuTrigger>
  );
}

/* ---------- Overlays: Dialog, Sheet, Tooltip ---------- */

export function Dialog({
  title,
  children,
  ...rest
}: RACDialogProps & { title?: string; children: React.ReactNode }) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] data-[entering]:anim-fade-in"
      isDismissable
    >
      <Modal className="w-full max-w-md rounded-card bg-surface p-5 shadow-lifted outline-none data-[entering]:anim-pop">
        <RACDialog {...rest} className="outline-none">
          {title && <Heading slot="title" className="font-display text-xl font-bold">{title}</Heading>}
          <div className="mt-3">{children}</div>
        </RACDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function Sheet({
  title,
  children,
  ...rest
}: RACDialogProps & { title?: string; children: React.ReactNode }) {
  return (
    <ModalOverlay
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] data-[entering]:anim-fade-in sm:items-center sm:p-4"
      isDismissable
    >
      <Modal className="max-h-[88vh] w-full max-w-md overflow-auto rounded-t-sheet bg-surface p-5 pb-8 shadow-lifted outline-none data-[entering]:anim-sheet-up sm:rounded-sheet">
        <RACDialog {...rest} className="outline-none">
          {title && <Heading slot="title" className="font-display text-xl font-bold">{title}</Heading>}
          <div className="mt-3">{children}</div>
        </RACDialog>
      </Modal>
    </ModalOverlay>
  );
}

export function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TooltipTrigger delay={300}>
      {children}
      <RACTooltip
        offset={6}
        className="max-w-56 rounded-btn bg-ink px-2.5 py-1.5 text-xs font-medium text-bg shadow-lifted data-[entering]:anim-pop"
      >
        {label}
      </RACTooltip>
    </TooltipTrigger>
  );
}

/* ---------- Feedback: Card, Badge, Avatar, Skeleton, Empty/Error, Toast ---------- */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-card border border-line bg-surface p-4 mb-3 shadow-soft fade-up transition-shadow duration-200 hover:shadow-lifted",
        className,
      )}
    >
      {children}
    </section>
  );
}

const badgeColors: Record<string, string> = {
  quoted: "bg-muted",
  booked: "bg-ink",
  en_route: "bg-signal",
  in_progress: "bg-signal",
  pending_verify: "bg-signal",
  completed: "bg-verified",
  disputed: "bg-[#B42318]",
  verified: "bg-verified",
  held: "bg-ink",
  pro: "bg-blueprint",
  company: "bg-blueprint",
  city_operator: "bg-blueprint",
  admin: "bg-ink",
  customer: "bg-muted",
  approved: "bg-verified",
  pending: "bg-signal",
  rejected: "bg-[#B42318]",
};

export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase",
        badgeColors[status] ?? "bg-muted",
        className,
      )}
    >
      {(status === "in_progress" || status === "en_route" || status === "pending_verify") && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-white pulse-dot" aria-hidden="true" />
      )}
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-blueprint font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials || "•"}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skel rounded-card", className)} aria-hidden="true" />;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-6 text-center">
      <div className="font-display text-lg font-bold text-ink">{title}</div>
      {hint && <p className="text-sm text-muted mt-1">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p className="err" role="alert">
      <WarningCircle aria-hidden="true" className="mr-1 inline" />
      {message}{" "}
      {onRetry && (
        <button type="button" className="underline font-semibold" onClick={onRetry}>
          Retry
        </button>
      )}
    </p>
  );
}

/** Tiny toast bus: call toast("saved") anywhere, <Toaster/> is mounted in layout. */
export function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tasklens:toast", { detail: message }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const onToast = (e: Event) => {
      const id = ++idRef.current;
      const message = String((e as CustomEvent).detail ?? "");
      if (!message) return;
      setItems((xs) => [...xs.slice(-2), { id, message }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2600);
    };
    window.addEventListener("tasklens:toast", onToast);
    return () => window.removeEventListener("tasklens:toast", onToast);
  }, []);
  return (
    <div className="toaster" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast flex items-center gap-2">
          <Check aria-hidden="true" weight="bold" />
          {t.message}
        </div>
      ))}
    </div>
  );
}

/** Animated number: counts from 0 to value on mount (respects reduced motion). */
export function useCountUp(value: number, durationMs = 900): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return n;
}

/* ---------- Carried over (canonical homes move to components/blueprint in U7) ---------- */

const STEPS = ["quoted", "booked", "en_route", "in_progress", "pending_verify", "completed"];
export function Stepper({ status }: { status: string }) {
  const ix = STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-1 my-3" aria-label="job progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex-1" title={s}>
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              i < ix ? "bg-verified" : i === ix ? "bg-signal pulse-dot shadow-[0_0_12px_var(--signal)]" : "bg-line",
            )}
          />
        </li>
      ))}
    </ol>
  );
}

export function PriceRange({ lo, hi }: { lo: number; hi: number }) {
  const loN = useCountUp(lo);
  const hiN = useCountUp(hi);
  return (
    <div className="font-display font-extrabold text-4xl tracking-tight">
      ${loN} <span className="text-muted text-2xl">– ${hiN}</span>
    </div>
  );
}

/** Animated success check (SVG stroke draw). */
export function DrawCheck({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="var(--verified)" strokeWidth="3" opacity="0.35" />
      <path className="draw-check" d="M12 20.5 17.5 26 28 14.5" stroke="var(--verified)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface ProCardPro {
  pro_id: string;
  name?: string;
  reason: string;
  eta_days: number;
  quote_usd: number;
  rating?: number;
  jobsDone?: number;
  distanceKm?: number;
  verified?: boolean;
}

export function ProCard({ pro, selected, onSelect, children }: { pro: ProCardPro; selected: boolean; onSelect: () => void; children?: React.ReactNode }) {
  return (
    <label className={cn("rounded-card border bg-surface p-4 mb-3 flex gap-3 cursor-pointer shadow-soft fade-up transition-shadow hover:shadow-lifted", selected ? "border-signal ring-2 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]" : "border-line")}>
      <input type="radio" name="pro" className="mt-1 accent-signal" checked={selected} onChange={onSelect} />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <strong>{pro.name ?? pro.reason}</strong>
          {pro.verified !== false && <span className="text-verified text-xs font-bold">✓ verified</span>}
        </div>
        {pro.name && <div className="text-sm text-muted">{pro.reason}</div>}
        <div className="text-xs text-muted mt-1">
          {pro.rating ? `★ ${pro.rating.toFixed(1)}` : ""} {pro.jobsDone ? `· ${pro.jobsDone} jobs` : ""} {pro.distanceKm !== undefined ? `· ${pro.distanceKm.toFixed(1)} km` : ""} · ~{pro.eta_days}d · ${pro.quote_usd}
        </div>
        {children}
      </div>
    </label>
  );
}

export interface FeedEvent {
  id: string;
  kind: string;
  createdAt: number;
  payload?: unknown;
}

export function Timeline({ events, label }: { events: FeedEvent[]; label: (kind: string) => string }) {
  if (events.length === 0) return <p className="text-muted text-sm">—</p>;
  const ordered = [...events].reverse();
  return (
    <ol className="relative ml-2 border-l-2 border-line pl-4 space-y-3">
      {ordered.map((e, i) => (
        <li key={e.id} className="fade-up" style={{ animationDelay: `${Math.min(i, 7) * 60}ms` }}>
          {i === 0 ? (
            <span className="absolute -left-[9px] mt-1 live-dot" aria-hidden="true" />
          ) : (
            <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-signal border-2 border-surface" />
          )}
          <strong className="text-sm">{label(e.kind)}</strong>
          <div className="text-xs text-muted">{new Date(e.createdAt).toLocaleString()}</div>
        </li>
      ))}
    </ol>
  );
}

export function CameraFrame({ children, scanning }: { children: React.ReactNode; scanning?: boolean }) {
  return (
    <div className="viewfinder relative rounded-card overflow-hidden border border-line bg-ink shadow-lifted">
      {children}
      {scanning && <div className="scan-beam" aria-hidden="true" />}
    </div>
  );
}

export function BottomSheet({ children }: { children: React.ReactNode }) {
  return <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md rounded-t-sheet bg-surface border-t border-line p-4 pb-8 shadow-lifted fade-up sm:max-w-2xl">{children}</div>;
}

/* ---------- Flow navigation: Back / Continue across the core loop ---------- */

export function FlowNav({
  backHref,
  backLabel,
  continueHref,
  continueLabel,
  onContinue,
  continueDisabled,
}: {
  backHref?: string;
  backLabel?: string;
  continueHref?: string;
  continueLabel?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
}) {
  if (!backHref && !continueHref && !onContinue) return null;
  return (
    <nav aria-label="flow" className="mt-4 flex items-center justify-between gap-3">
      {backHref ? (
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink"
        >
          <ArrowLeft aria-hidden="true" />
          {backLabel ?? "Back"}
        </a>
      ) : (
        <span />
      )}
      {continueHref ? (
        <a
          href={continueHref}
          aria-disabled={continueDisabled}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-125",
            continueDisabled && "pointer-events-none opacity-50",
          )}
        >
          {continueLabel ?? "Continue"}
          <ArrowRight aria-hidden="true" />
        </a>
      ) : onContinue ? (
        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled}
          className="inline-flex items-center gap-1.5 rounded-btn bg-ink px-4 py-2.5 text-sm font-semibold text-bg transition hover:brightness-125 disabled:opacity-50"
        >
          {continueLabel ?? "Continue"}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}
    </nav>
  );
}

/* Re-export RAC building blocks for advanced use (kit page, U2+). */
export {
  DialogTrigger,
  MenuTrigger,
  TooltipTrigger,
  RACButton,
  RACDialog,
  RACInput,
  RACTextArea,
  RACTextField,
  RACSelect,
  RACComboBox,
  RACDatePicker,
  RACTabs,
  RACTabList,
  RACTab,
  RACTabPanel,
  RACMenu,
  RACTooltip,
  ModalOverlay,
  Modal,
  Popover,
};
export type { RACButtonProps, RACInputProps, RACTextAreaProps, RACTextFieldProps, RACSelectProps, RACComboBoxProps, RACDatePickerProps, RACTabsProps, RACMenuProps, RACListBoxProps, RACDialogProps };
