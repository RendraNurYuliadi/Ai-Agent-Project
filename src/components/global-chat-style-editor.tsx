"use client";

import {
  ENGAGEMENT_COMPONENT_STYLES,
  GLOBAL_CHAT_STYLE_COMPONENT_IDS,
  readEngagementStyleProperty,
  setEngagementStyleProperty,
} from "@/lib/engagement-theme";

export default function GlobalChatStyleEditor({
  componentStyles,
  onChange,
}: {
  componentStyles: Record<string, string>;
  onChange: (styles: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-2">
      {GLOBAL_CHAT_STYLE_COMPONENT_IDS.map((id) => {
        const component = ENGAGEMENT_COMPONENT_STYLES.find((style) => style.id === id);
        if (!component) return null;
        const css = componentStyles[id] || component.defaultCss;

        return (
          <details key={id} className="rounded-lg border border-neutral-800 bg-black/40">
            <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-neutral-200 hover:text-white">
              {component.name}
            </summary>
            <div className="space-y-3 border-t border-neutral-800 p-3">
              <p className="text-[10px] leading-4 text-neutral-500">{component.description}</p>
              <div className="grid grid-cols-2 gap-2">
                {component.parameters.map((parameter) => {
                  const value = readEngagementStyleProperty(
                    css,
                    parameter.selector,
                    parameter.property,
                    parameter.defaultValue
                  );
                  const controlId = `${id}:${parameter.selector}:${parameter.property}`;

                  if (parameter.type === "color") {
                    const colorValue = value.match(/^#[0-9a-fA-F]{6}$/)?.[0] || parameter.defaultValue;
                    return (
                      <label key={controlId} className="space-y-1 text-[9px] text-neutral-500">
                        {parameter.label}
                        <input
                          type="color"
                          aria-label={`${component.name}: ${parameter.label}`}
                          value={colorValue}
                          onChange={(event) => onChange({
                            ...componentStyles,
                            [id]: setEngagementStyleProperty(css, parameter.selector, parameter.property, event.target.value),
                          })}
                          className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 p-0.5"
                        />
                      </label>
                    );
                  }

                  const fallbackNumber = Number.parseFloat(parameter.defaultValue) || 0;
                  const numericValue = Number.parseFloat(value);
                  return (
                    <label key={controlId} className="space-y-1 text-[9px] text-neutral-500">
                      {parameter.label}
                      <input
                        type="number"
                        aria-label={`${component.name}: ${parameter.label}`}
                        min={parameter.min}
                        max={parameter.max}
                        step={parameter.step}
                        value={Number.isFinite(numericValue) ? numericValue : fallbackNumber}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (!Number.isFinite(next)) return;
                          const bounded = Math.min(parameter.max ?? next, Math.max(parameter.min ?? next, next));
                          onChange({
                            ...componentStyles,
                            [id]: setEngagementStyleProperty(
                              css,
                              parameter.selector,
                              parameter.property,
                              `${bounded}${parameter.unit || ""}`
                            ),
                          });
                        }}
                        className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 px-2 text-[10px] text-white"
                      />
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2">
                <details className="min-w-0 flex-1">
                  <summary className="cursor-pointer text-[9px] text-neutral-500 hover:text-neutral-300">
                    Tampilkan CSS
                  </summary>
                  <textarea
                    value={css}
                    onChange={(event) => onChange({
                      ...componentStyles,
                      [id]: event.target.value.slice(0, 10000),
                    })}
                    spellCheck={false}
                    rows={6}
                    aria-label={`CSS ${component.name}`}
                    className="mt-2 w-full resize-y rounded-md border border-neutral-800 bg-black px-2.5 py-2 font-mono text-[9px] leading-4 text-neutral-300 outline-none focus:border-neutral-600"
                  />
                </details>
                <button
                  type="button"
                  onClick={() => onChange({
                    ...componentStyles,
                    [id]: component.defaultCss,
                  })}
                  className="shrink-0 text-[9px] text-neutral-500 hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
