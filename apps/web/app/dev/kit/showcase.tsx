"use client";

/* U1 dev kit: every primitive + blueprint signature in one place.
   Dev only — /dev/kit 404s in production. Toggle light/dark up top. */

import { useState } from "react";
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  CameraFrame,
  Card,
  ComboField,
  DateField,
  Dialog,
  DialogTrigger,
  DrawCheck,
  EmptyState,
  ErrorState,
  Field,
  FlowNav,
  IconButton,
  Input,
  Menu,
  PriceRange,
  ProCard,
  Select,
  Sheet,
  Skeleton,
  Stepper,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  Timeline,
  Tip,
  toast,
} from "@/components/ui";
import {
  Annotation,
  CountUp,
  DimensionLine,
  GridBackdrop,
  MagneticButton,
  Marquee,
  ScanBeam,
  SpotlightCard,
  StampSeal,
  Viewfinder,
} from "@/components/blueprint";
import { ThemeToggle, type Theme } from "@/components/theme";
import { Bell, Star, Wrench } from "@phosphor-icons/react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted mb-3">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function KitShowcase() {
  const [theme, setTheme] = useState<Theme>("light");
  function setAll(t: Theme) {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("tasklens:theme", t);
    } catch {
      /* ignore */
    }
    setTheme(t);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold">/dev/kit — U1 primitives</h1>
        <div className="flex items-center gap-2">
          <div className="seg" role="group" aria-label="theme">
            {(["light", "dark"] as Theme[]).map((t) => (
              <button key={t} type="button" className={theme === t ? "on" : ""} onClick={() => setAll(t)}>
                {t}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </div>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button isDisabled>Disabled</Button>
          <Button size="lg" variant="secondary">Large</Button>
          <IconButton label="notifications"><Bell size={20} /></IconButton>
          <IconButton label="favorite"><Star size={20} /></IconButton>
        </div>
      </Section>

      <Section title="Forms">
        <Field label="Name" error="Only shown when invalid">
          <Input placeholder="María González" />
        </Field>
        <Field label="Notes">
          <Textarea placeholder="Describe the problem…" />
        </Field>
        <Select
          label="Trade"
          items={[{ id: "plumbing", label: "Plumbing" }, { id: "electrical", label: "Electrical" }]}
          defaultSelectedKey="plumbing"
        />
        <ComboField
          label="Zone"
          items={[{ id: "sv", label: "San Salvador" }, { id: "st", label: "Santa Tecla" }]}
        />
        <DateField label="Preferred day" />
      </Section>

      <Section title="Tabs / Menu / Dialog / Sheet / Tip">
        <Tabs defaultSelectedKey="a">
          <TabList aria-label="kit tabs">
            <Tab id="a">Clientes</Tab>
            <Tab id="b">Profesionales</Tab>
            <Tab id="c">Empresas</Tab>
          </TabList>
          <TabPanel id="a"><Card>Panel A</Card></TabPanel>
          <TabPanel id="b"><Card>Panel B</Card></TabPanel>
          <TabPanel id="c"><Card>Panel C</Card></TabPanel>
        </Tabs>
        <div className="flex flex-wrap gap-2">
          <Menu
            label="Actions"
            items={[{ id: "edit", label: "Edit" }, { id: "del", label: "Delete", danger: true }]}
            onAction={(id) => toast(`menu: ${id}`)}
          />
          <DialogTrigger>
            <Button variant="secondary">Open dialog</Button>
            <Dialog title="Example dialog">
              <p className="text-sm text-muted">Dialogs trap focus and close on overlay click.</p>
            </Dialog>
          </DialogTrigger>
          <DialogTrigger>
            <Button variant="secondary">Open sheet</Button>
            <Sheet title="Example sheet">
              <p className="text-sm text-muted">Bottom on mobile, centered on desktop.</p>
            </Sheet>
          </DialogTrigger>
          <Tip label="Helpful hint">
            <Button variant="ghost">Hover me</Button>
          </Tip>
        </div>
      </Section>

      <Section title="Feedback">
        <div className="flex flex-wrap gap-2">
          {["quoted", "booked", "in_progress", "completed", "pro", "company", "city_operator", "admin", "approved"].map((s) => (
            <Badge key={s} status={s} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Avatar name="María González" />
          <Avatar name="Carlos Méndez" size={32} />
          <Button variant="secondary" onPress={() => toast("Toast works")}>Toast</Button>
        </div>
        <EmptyState title="Nothing here" hint="An action fixes it" action={<Button>Do it</Button>} />
        <ErrorState message="Something failed." onRetry={() => toast("retry")} />
        <Skeleton className="h-16" />
      </Section>

      <Section title="Job pieces">
        <Stepper status="in_progress" />
        <PriceRange lo={120} hi={220} />
        <DrawCheck />
        <ProCard pro={{ pro_id: "1", name: "Carlos Méndez", reason: "Top match", eta_days: 1, quote_usd: 170, rating: 4.9, distanceKm: 2.3 }} selected onSelect={() => undefined} />
        <Card>
          <Timeline
            events={[
              { id: "1", kind: "booked", createdAt: Date.now() - 9000 },
              { id: "2", kind: "in_progress", createdAt: Date.now() - 3000 },
            ]}
            label={(k) => k}
          />
        </Card>
        <CameraFrame scanning>
          <div className="flex aspect-video items-center justify-center bg-ink text-white/70 text-sm">
            viewfinder + beam
          </div>
        </CameraFrame>
      </Section>

      <Section title="Blueprint signatures">
        <div className="relative overflow-hidden rounded-card border border-line">
          <GridBackdrop className="absolute inset-0" />
          <div className="relative p-6">
            <DimensionLine label="1.5 in · $120–220" />
          </div>
        </div>
        <Viewfinder animate>
          <div className="flex aspect-video items-center justify-center bg-ink text-white/70 text-sm">
            framed content
            <ScanBeam />
          </div>
        </Viewfinder>
        <div className="relative overflow-hidden rounded-card border border-line bg-ink">
          <div className="aspect-video" />
          <Annotation x={62} y={40} label="Sifón corroído" />
          <Annotation x={30} y={65} label="$120–220" side="left" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StampSeal />
          <MagneticButton className="rounded-btn bg-signal px-5 py-3 font-bold text-white">
            Magnetic
          </MagneticButton>
          <span className="inline-flex items-center gap-1 text-sm text-muted"><Wrench size={16} /> Phosphor icons</span>
        </div>
        <SpotlightCard>
          <strong>Spotlight card</strong>
          <p className="text-sm text-muted">Hover to see the cursor light (desktop).</p>
        </SpotlightCard>
        <p className="font-display text-2xl font-extrabold">
          <CountUp value={123456} prefix="$" />
        </p>
        <Marquee>
          {["Fontanería", "Electricidad", "Albañilería", "Limpieza"].map((c) => (
            <span key={c} className="chip whitespace-nowrap">{c}</span>
          ))}
        </Marquee>
      </Section>

      <Section title="FlowNav">
        <FlowNav backHref="/" backLabel="Back" continueHref="/scan" continueLabel="Continue" />
        <FlowNav backHref="/quote/x" />
      </Section>

      <Section title="BottomSheet (fixed — preview)">
        <p className="text-sm text-muted">BottomSheet is position:fixed; rendered at the bottom of this page for inspection:</p>
        <BottomSheet>
          <p className="text-sm font-semibold">Sheet preview content</p>
        </BottomSheet>
      </Section>
    </main>
  );
}
