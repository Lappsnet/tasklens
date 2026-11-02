"use client";

/* U5 role tabs: Clientes / Profesionales / Empresas. */

import { Tab, TabList, TabPanel, Tabs } from "@/components/ui";
import { Check } from "@phosphor-icons/react";

export default function RoleTabs({ title, tabs }: {
  title: string;
  tabs: { id: string; label: string; points: string[] }[];
}) {
  return (
    <div>
      <h2 className="font-display text-3xl font-bold lg:text-[40px] lg:leading-[1.05]">{title}</h2>
      <Tabs defaultSelectedKey={tabs[0]?.id} className="mt-8">
        <TabList aria-label={title}>
          {tabs.map((t) => (
            <Tab key={t.id} id={t.id}>{t.label}</Tab>
          ))}
        </TabList>
        {tabs.map((t) => (
          <TabPanel key={t.id} id={t.id}>
            <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {t.points.map((p) => (
                  <li key={p} className="flex gap-2 rounded-card border border-line bg-surface p-3 text-sm">
                    <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-verified" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="overflow-hidden rounded-card border border-line bg-bg shadow-soft">
                <img
                  src={`/images/screens/tab-${t.id}.png`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover object-top"
                />
              </div>
            </div>
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
