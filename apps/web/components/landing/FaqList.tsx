"use client";

/* U5 FAQ: React Aria Disclosure with smooth height animation. */

import { Disclosure, DisclosureGroup, DisclosurePanel, Heading, Button } from "react-aria-components";
import { CaretDown } from "@phosphor-icons/react";

export default function FaqList({ title, faqs }: { title: string; faqs: { q: string; a: string }[] }) {
  return (
    <div>
      {title ? <h2 className="font-display text-3xl font-bold lg:text-[40px] lg:leading-[1.05]">{title}</h2> : null}
      <DisclosureGroup className="mt-8 space-y-3" allowsMultipleExpanded>
        {faqs.map((f) => (
          <Disclosure key={f.q} className="group overflow-hidden rounded-card border border-line bg-surface">
            <Heading>
              <Button
                slot="trigger"
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left font-bold outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-signal"
              >
                {f.q}
                <CaretDown aria-hidden="true" className="shrink-0 text-muted transition-transform duration-200 group-data-[expanded]:rotate-180" />
              </Button>
            </Heading>
            <DisclosurePanel className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-data-[expanded]:grid-rows-[1fr]">
              <div className="overflow-hidden">
                <p className="px-4 pb-4 text-sm text-muted">{f.a}</p>
              </div>
            </DisclosurePanel>
          </Disclosure>
        ))}
      </DisclosureGroup>
    </div>
  );
}
