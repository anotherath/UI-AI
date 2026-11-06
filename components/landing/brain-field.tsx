"use client";

/**
 * Technical stroke brain — still line-art, but denser and more cinematic.
 */

function DecorPanel({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <aside
      aria-hidden
      className={`pointer-events-none absolute top-1/2 hidden w-[180px] -translate-y-1/2 flex-col gap-5 lg:flex xl:w-[210px] ${
        isLeft ? "left-1 xl:left-4" : "right-1 xl:right-4"
      }`}
    >
      <div className="border border-white/10 bg-white/[0.02] px-3 py-3">
        <p className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
          {isLeft ? "Node graph" : "Route table"}
        </p>
        <div className="mt-3 space-y-2">
          {(isLeft
            ? ["Ctx / project", "Library bind", "Thread memory", "Recall path"]
            : ["Ingest PDF", "Embed chunk", "Rank context", "Compose"]
          ).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full bg-sky-400/80"
                style={{ opacity: 1 - i * 0.15 }}
              />
              <span className="font-mono text-[10px] text-zinc-400">{label}</span>
              <span className="ml-auto font-mono text-[9px] text-zinc-600">
                0.{8 - i}
                {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.02] px-3 py-3">
        <p className="font-mono text-[9px] tracking-[0.18em] text-zinc-500 uppercase">
          {isLeft ? "Fold density" : "Pulse train"}
        </p>
        <div className="mt-3 flex h-10 items-end gap-[3px]">
          {Array.from({ length: 16 }, (_, i) => {
            const h =
              22 +
              Math.abs(Math.sin((i + (isLeft ? 1 : 4)) * 0.7)) * 68 +
              (i % 3) * 8;
            return (
              <span
                key={i}
                className="landing-brain-bar flex-1 rounded-[1px] bg-gradient-to-t from-sky-500/10 to-sky-300/70"
                style={{
                  height: `${h}%`,
                  opacity: 0.35 + (i % 5) * 0.1,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5 font-mono text-[9px] tracking-[0.14em] text-zinc-600 uppercase">
        {(isLeft
          ? ["Lat -12.4°", "Elev +8.1°", "Zoom 1.00"]
          : ["Sync ok", "Buffer 64k", "Drift 0.02"]
        ).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </aside>
  );
}

function StrokeBrain({ className }: { className?: string }) {
  const outline =
    "M 82 152 C 64 134, 60 108, 70 84 C 80 56, 106 38, 138 34 C 170 30, 208 36, 236 52 C 268 70, 288 100, 286 128 C 284 156, 266 174, 242 178 C 228 182, 216 178, 208 168 C 202 180, 188 188, 168 190 C 146 192, 126 182, 118 168 C 108 180, 92 178, 84 164 C 80 158, 80 154, 82 152 Z";

  const nodes: [number, number, number][] = [
    [108, 74, 0],
    [138, 50, 0.3],
    [176, 48, 0.6],
    [214, 72, 0.9],
    [244, 108, 1.2],
    [120, 106, 0.15],
    [158, 98, 0.45],
    [196, 112, 0.75],
    [228, 138, 1.05],
    [136, 138, 0.25],
    [174, 146, 0.55],
    [206, 160, 0.85],
    [240, 164, 1.15],
  ];

  const links: [number, number, number, number][] = [
    [108, 74, 158, 98],
    [138, 50, 176, 48],
    [176, 48, 214, 72],
    [214, 72, 244, 108],
    [120, 106, 174, 146],
    [158, 98, 206, 160],
    [196, 112, 240, 164],
    [136, 138, 206, 160],
    [108, 74, 120, 106],
    [244, 108, 228, 138],
  ];

  const sparks: {
    d: string;
    dur: string;
    delay: string;
  }[] = [
    {
      d: "M 108 74 C 140 88, 170 100, 206 160",
      dur: "3.2s",
      delay: "0s",
    },
    {
      d: "M 138 50 C 170 70, 200 100, 240 164",
      dur: "4s",
      delay: "0.8s",
    },
    {
      d: "M 214 72 C 200 100, 170 130, 136 138",
      dur: "3.6s",
      delay: "1.4s",
    },
  ];

  return (
    <svg
      viewBox="0 0 340 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="brain-ink" x1="40" y1="30" x2="300" y2="220">
          <stop stopColor="#f8fafc" stopOpacity="0.98" />
          <stop offset="0.5" stopColor="#7dd3fc" stopOpacity="0.9" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="brain-ghost" x1="60" y1="40" x2="280" y2="200">
          <stop stopColor="#38bdf8" stopOpacity="0.18" />
          <stop offset="1" stopColor="#0ea5e9" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="brain-clip">
          <path d={outline} />
        </clipPath>
        <filter id="brain-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="node-glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Orbit rings */}
      <g>
        <ellipse
          cx="170"
          cy="120"
          rx="148"
          ry="92"
          stroke="#38bdf8"
          strokeOpacity="0.2"
          strokeWidth="0.8"
          strokeDasharray="3 7"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 170 120"
            to="360 170 120"
            dur="28s"
            repeatCount="indefinite"
          />
        </ellipse>
        <ellipse
          cx="170"
          cy="120"
          rx="158"
          ry="102"
          stroke="#64748b"
          strokeOpacity="0.16"
          strokeWidth="0.6"
          strokeDasharray="1 10"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 170 120"
            to="0 170 120"
            dur="48s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* Sweep arc */}
        <path
          d="M 40 120 A 130 80 0 0 1 170 40"
          stroke="#7dd3fc"
          strokeOpacity="0.35"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 170 120"
            to="360 170 120"
            dur="9s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Soft body */}
      <path fill="url(#brain-ghost)" d={outline} />

      {/* Circuit mesh clipped to cortex */}
      <g clipPath="url(#brain-clip)" opacity="0.55">
        {Array.from({ length: 9 }, (_, i) => (
          <path
            key={`h-${i}`}
            d={`M 70 ${48 + i * 16} Q 170 ${40 + i * 16}, 290 ${56 + i * 14}`}
            stroke="#38bdf8"
            strokeOpacity={0.12 + (i % 3) * 0.04}
            strokeWidth="0.6"
          />
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={`v-${i}`}
            d={`M ${90 + i * 24} 30 Q ${96 + i * 22} 120, ${88 + i * 24} 200`}
            stroke="#64748b"
            strokeOpacity="0.14"
            strokeWidth="0.55"
          />
        ))}
        {/* Micro dots inside */}
        {Array.from({ length: 42 }, (_, i) => {
          const x = 100 + ((i * 37) % 150);
          const y = 55 + ((i * 53) % 120);
          return (
            <circle
              key={`d-${i}`}
              cx={x}
              cy={y}
              r={i % 5 === 0 ? 1.15 : 0.6}
              fill="#e0f2fe"
              fillOpacity={0.18 + (i % 4) * 0.06}
            />
          );
        })}
      </g>

      {/* Outer cortex */}
      <path
        filter="url(#brain-glow)"
        stroke="url(#brain-ink)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        d={outline}
      />
      {/* Inner echo outline */}
      <path
        stroke="#7dd3fc"
        strokeOpacity="0.22"
        strokeWidth="0.7"
        strokeDasharray="2 5"
        d={outline}
        transform="translate(0 1) scale(0.965)"
        style={{ transformOrigin: "170px 120px" }}
      />

      {/* Midline */}
      <path
        stroke="#94a3b8"
        strokeOpacity="0.42"
        strokeWidth="1.1"
        strokeLinecap="round"
        d="M 140 48 C 148 86, 150 124, 136 168"
      />

      {/* Dense but clean gyri */}
      <g stroke="#cbd5e1" strokeLinecap="round" fill="none">
        <path strokeOpacity="0.55" strokeWidth="1.15" d="M 94 70 C 122 58, 154 60, 178 76" />
        <path strokeOpacity="0.48" strokeWidth="1.1" d="M 98 90 C 130 78, 168 82, 196 100" />
        <path strokeOpacity="0.42" strokeWidth="1.05" d="M 106 112 C 142 102, 180 108, 210 128" />
        <path strokeOpacity="0.38" strokeWidth="1" d="M 118 134 C 152 126, 188 134, 216 152" />
        <path strokeOpacity="0.5" strokeWidth="1.1" d="M 172 48 C 198 56, 226 76, 240 102" />
        <path strokeOpacity="0.4" strokeWidth="1.05" d="M 192 68 C 216 84, 238 110, 246 136" />
        <path strokeOpacity="0.34" strokeWidth="1" d="M 154 84 C 174 96, 196 118, 210 142" />
        <path strokeOpacity="0.3" strokeWidth="0.95" d="M 128 64 C 146 78, 164 102, 172 128" />
      </g>

      {/* Synaptic web */}
      <g stroke="#38bdf8" strokeWidth="0.7" fill="none">
        {links.map(([x1, y1, x2, y2], i) => (
          <path
            key={`l-${i}`}
            d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + (i % 2 ? 12 : -10)} ${(y1 + y2) / 2}, ${x2} ${y2}`}
            strokeOpacity={0.22 + (i % 3) * 0.06}
            strokeDasharray={i % 2 ? "2 5" : undefined}
          />
        ))}
      </g>

      {/* Traveling signal paths */}
      <g stroke="#7dd3fc" strokeLinecap="round" fill="none">
        <path
          className="landing-brain-signal"
          strokeOpacity="0.5"
          strokeWidth="1.2"
          strokeDasharray="5 9"
          d="M 108 74 C 140 90, 170 110, 206 160"
        />
        <path
          className="landing-brain-signal-alt"
          strokeOpacity="0.38"
          strokeWidth="1.05"
          strokeDasharray="3 8"
          d="M 176 48 C 190 90, 210 120, 240 164"
        />
        <path
          className="landing-brain-signal"
          strokeOpacity="0.32"
          strokeWidth="1"
          strokeDasharray="2 9"
          d="M 244 108 C 220 120, 180 130, 136 138"
        />
      </g>

      {/* Sparks riding the routes */}
      {sparks.map((spark, i) => (
        <circle key={`s-${i}`} r="2.2" fill="#f0f9ff" filter="url(#node-glow)">
          <animateMotion
            dur={spark.dur}
            begin={spark.delay}
            repeatCount="indefinite"
            path={spark.d}
          />
        </circle>
      ))}

      {/* Cerebellum scallops */}
      <g stroke="#7dd3fc" strokeLinecap="round" fill="none">
        <path
          strokeOpacity="0.7"
          strokeWidth="1.3"
          d="M 208 170 C 218 160, 234 158, 248 168 C 236 178, 220 180, 208 170"
        />
        <path strokeOpacity="0.48" strokeWidth="1.1" d="M 216 174 C 226 166, 240 166, 252 174" />
        <path strokeOpacity="0.36" strokeWidth="1" d="M 222 178 C 232 172, 244 172, 254 178" />
        <path strokeOpacity="0.28" strokeWidth="0.9" d="M 228 182 C 236 178, 246 178, 254 182" />
      </g>

      {/* Brainstem */}
      <path
        stroke="#94a3b8"
        strokeOpacity="0.62"
        strokeWidth="1.45"
        strokeLinecap="round"
        d="M 162 190 C 164 204, 162 218, 154 232"
      />
      <path
        stroke="#64748b"
        strokeOpacity="0.45"
        strokeWidth="1.15"
        strokeLinecap="round"
        d="M 176 190 C 178 204, 176 216, 168 230"
      />
      <circle cx="154" cy="232" r="1.6" fill="#7dd3fc" fillOpacity="0.7" />
      <circle cx="168" cy="230" r="1.3" fill="#94a3b8" fillOpacity="0.55" />

      {/* Region callouts */}
      <g
        fill="#64748b"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="7"
        letterSpacing="0.14em"
      >
        <text x="88" y="58" fillOpacity="0.7">
          PFC
        </text>
        <text x="248" y="88" fillOpacity="0.65">
          TEMP
        </text>
        <text x="252" y="188" fillOpacity="0.65">
          CBL
        </text>
        <text x="132" y="248" fillOpacity="0.55">
          STEM
        </text>
      </g>
      <g stroke="#475569" strokeWidth="0.7" strokeOpacity="0.45">
        <path d="M 104 60 L 112 68" />
        <path d="M 246 90 L 236 100" />
        <path d="M 250 184 L 242 172" />
        <path d="M 148 238 L 158 220" />
      </g>

      {/* Active nodes */}
      {nodes.map(([x, y, delay]) => (
        <g
          key={`${x}-${y}`}
          className="landing-brain-node"
          style={{ animationDelay: `${delay}s` }}
        >
          <circle
            cx={x}
            cy={y}
            r="8"
            fill="#38bdf8"
            fillOpacity="0.1"
            filter="url(#node-glow)"
          />
          <circle
            cx={x}
            cy={y}
            r="4.2"
            stroke="#7dd3fc"
            strokeOpacity="0.45"
            strokeWidth="0.7"
          />
          <circle cx={x} cy={y} r="2.1" fill="#f0f9ff" fillOpacity="0.95" />
        </g>
      ))}

      {/* Crosshair + corner brackets */}
      <g stroke="#475569" strokeWidth="0.8" strokeOpacity="0.55">
        <path d="M 18 120 H 36" />
        <path d="M 304 120 H 322" />
        <path d="M 170 10 V 26" />
        <path d="M 170 214 V 230" />
        <path d="M 48 36 H 62 V 50" />
        <path d="M 292 36 H 278 V 50" />
        <path d="M 48 204 H 62 V 190" />
        <path d="M 292 204 H 278 V 190" />
      </g>
    </svg>
  );
}

export function BrainField() {
  return (
    <section
      className="landing-brain relative isolate overflow-hidden bg-[#050505] px-5 py-20 sm:px-8 sm:py-32"
      data-landing-cue="brain"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.06),transparent_55%)]"
      />

      <div className="relative mx-auto mb-7 max-w-[720px] text-center sm:mb-12">
        <p className="text-[11px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
          Internal map
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-landing)] text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] font-medium tracking-[-0.035em] text-white">
          A mind you can see working.
        </h2>
        <p className="mx-auto mt-2.5 max-w-[32rem] text-sm leading-relaxed text-zinc-500 sm:mt-3 sm:text-[15px]">
          Context routes through projects and shared knowledge - less like a
          chat log, more like a living cortex.
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-[1200px]">
        <DecorPanel side="left" />
        <DecorPanel side="right" />

        <div className="landing-brain-stage relative mx-auto flex aspect-[5/4] w-full max-w-[900px] items-center justify-center sm:aspect-auto sm:h-[min(58vh,480px)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-2 rounded-2xl border border-white/[0.07] sm:inset-4 sm:rounded-none"
          >
            <span className="absolute top-0 left-0 size-3 border-t border-l border-sky-400/50" />
            <span className="absolute top-0 right-0 size-3 border-t border-r border-sky-400/50" />
            <span className="absolute bottom-0 left-0 size-3 border-b border-l border-sky-400/50" />
            <span className="absolute right-0 bottom-0 size-3 border-r border-b border-sky-400/50" />
          </div>

          {/* Soft radial stage light */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.1),transparent_68%)] blur-2xl sm:inset-[18%]"
          />

          <div className="landing-brain-stroke relative z-10 w-[min(92%,420px)] sm:w-[min(78%,460px)]">
            <StrokeBrain className="h-auto w-full" />
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-3 top-3 flex justify-between gap-3 font-mono text-[9px] tracking-[0.14em] text-zinc-500 uppercase sm:inset-x-8 sm:top-5 sm:text-[10px] sm:tracking-[0.16em]"
          >
            <span>Scan / cortex</span>
            <span className="text-right">
              <span className="sm:hidden">Density 0.87</span>
              <span className="hidden sm:inline">Signal density 0.87</span>
            </span>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-between gap-3 font-mono text-[9px] tracking-[0.14em] text-zinc-600 uppercase sm:inset-x-8 sm:bottom-5 sm:text-[10px] sm:tracking-[0.16em]"
          >
            <span>
              <span className="sm:hidden">L / R</span>
              <span className="hidden sm:inline">Hemisphere L / R</span>
            </span>
            <span>Live map</span>
          </div>
        </div>
      </div>
    </section>
  );
}
