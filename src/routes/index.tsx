import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Code2,
  Cpu,
  Github,
  Layers,
  Palette,
  Plug,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Terminal,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Whisker - Native mobile apps in Rust' },
      {
        name: 'description',
        content:
          'Whisker is a Rust-first framework for building native Android and iOS apps with ergonomic UI, Lynx-powered CSS, hot reload, and native modules.',
      },
    ],
  }),
  component: Home,
})

type Feature = {
  icon: LucideIcon
  title: string
  body: string
}

const codeLines = [
  'use whisker::prelude::*;',
  'use whisker::runtime::view::Element;',
  '',
  '#[whisker::main]',
  'fn app() -> Element {',
  '    let count = RwSignal::new(0);',
  '    let label = computed(move || format!("Count: {}", count.get()));',
  '',
  '    render! {',
  '        page(style: css!(display: flex, gap: 12.px())) {',
  '            text(value: label)',
  '            view(on_tap: move || count.update(|n| *n += 1)) {',
  '                text(value: "+1")',
  '            }',
  '        }',
  '    }',
  '}',
]

const rustAdvantages: Feature[] = [
  {
    icon: Cpu,
    title: 'Native-grade performance',
    body: 'Rust gives Whisker predictable execution, efficient memory use, no JavaScript VM dependency, and direct native updates.',
  },
  {
    icon: ShieldCheck,
    title: 'Memory safety by default',
    body: 'Application code can stay expressive while Rust keeps entire classes of memory bugs out of the product surface.',
  },
  {
    icon: Zap,
    title: 'Fast startup, small binaries',
    body: 'Whisker avoids a heavyweight scripting runtime and targets lean app binaries that start quickly on real devices.',
  },
  {
    icon: Box,
    title: 'One systems language',
    body: 'UI, state, app logic, native integration, and tooling all live in the same Rust-centered workflow.',
  },
]

const platformItems = ['Android', 'iOS', 'Web planned', 'Desktop planned']

const moduleItems = [
  'audio playback',
  'video views',
  'safe-area signals',
  'SVG and icons',
  'local storage',
  'custom native UI',
]

function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080b0f] text-slate-100">
      <Hero />
      <ProofStrip />
      <RustSection />
      <DslSection />
      <HotReloadSection />
      <ModulesSection />
      <FinalCta />
    </main>
  )
}

function Hero() {
  return (
    <section className="relative min-h-[86svh] overflow-hidden px-5 pb-16 pt-5 sm:px-8 lg:px-12">
      <div className="hero-grid absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute bottom-6 top-24 hidden opacity-80 lg:left-[53%] lg:right-10 lg:block"
        aria-hidden="true"
      >
        <HeroScene />
      </div>

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between">
        <a href="/" className="flex items-center gap-3 text-sm font-semibold">
          <span className="grid size-9 place-items-center rounded-md border border-orange-300/30 bg-orange-400/10 text-orange-200">
            W
          </span>
          <span>Whisker</span>
        </a>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/whiskerrs/whisker"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            <Github className="size-4" aria-hidden="true" />
            GitHub
          </a>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl pt-20 sm:pt-24 lg:pt-28">
        <div className="max-w-4xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-sm font-medium text-cyan-100">
            <Smartphone className="size-4" aria-hidden="true" />
            Rust-first mobile UI framework · pre-alpha
          </div>

          <h1 className="max-w-[760px] text-5xl font-semibold leading-[0.96] tracking-normal text-white sm:text-7xl">
            Build native mobile apps in Rust.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
            Whisker brings Rust to Android and iOS app development:
            ergonomic UI, native widgets, Lynx-powered CSS, sub-second hot
            reload, and an extension model built for native APIs.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://github.com/whiskerrs/whisker"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-orange-300 px-5 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(251,146,60,0.28)] transition hover:bg-orange-200"
            >
              <Github className="size-4" aria-hidden="true" />
              Explore the repository
            </a>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              See what makes it different
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {platformItems.map((item) => (
              <span
                key={item}
                className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 lg:hidden">
            <ScreenshotStrip />
            <MobileCodePanel />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroScene() {
  return (
    <div className="relative h-full min-h-[420px]">
      <div className="absolute right-0 top-0 w-[min(650px,44vw)] rounded-lg border border-white/10 bg-[#0d1117]/95 shadow-2xl shadow-black/50">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 px-4">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-xs font-medium text-slate-400">
            src/lib.rs
          </span>
        </div>
        <pre className="max-h-[470px] overflow-hidden p-5 text-[13px] leading-6 text-slate-300">
          {codeLines.map((line, index) => (
            <code key={`${line}-${index}`} className="block">
              <span className="mr-4 inline-block w-5 text-right text-slate-600">
                {index + 1}
              </span>
              <CodeLine line={line} />
            </code>
          ))}
        </pre>
      </div>

      <div className="absolute -bottom-4 left-6 hidden h-[430px] w-[400px] lg:block">
        <ScreenshotStack />
      </div>
    </div>
  )
}

function MobileCodePanel() {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d1117]/95 shadow-2xl shadow-black/50">
      <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3">
        <Terminal className="size-4 text-cyan-200" aria-hidden="true" />
        <span className="text-xs font-medium text-slate-300">Rust UI</span>
      </div>
      <pre className="max-h-[250px] overflow-hidden p-4 text-[12px] leading-5 text-slate-300">
        {codeLines.slice(0, 12).map((line, index) => (
          <code key={`${line}-${index}`} className="block">
            <CodeLine line={line} />
          </code>
        ))}
      </pre>
    </div>
  )
}

function CodeLine({ line }: { line: string }) {
  if (line.trim().startsWith('#[')) {
    return <span className="text-cyan-200">{line}</span>
  }

  if (line.includes('render!') || line.includes('computed')) {
    return <span className="text-orange-200">{line}</span>
  }

  if (line.includes('RwSignal') || line.includes('Element')) {
    return <span className="text-lime-200">{line}</span>
  }

  return <span>{line || ' '}</span>
}

function ScreenshotStack() {
  return (
    <div className="flex h-full items-end gap-4">
      <DeviceFrame
        src="/screenshots/ios.png"
        alt="Whisker podcast example running on iOS"
        className="w-[180px]"
        label="iOS"
      />
      <DeviceFrame
        src="/screenshots/android.png"
        alt="Whisker podcast example running on Android"
        className="w-[180px]"
        label="Android"
      />
    </div>
  )
}

function ScreenshotStrip() {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3">
      <DeviceFrame
        src="/screenshots/ios.png"
        alt="Whisker podcast example running on iOS"
        label="iOS"
      />
      <DeviceFrame
        src="/screenshots/android.png"
        alt="Whisker podcast example running on Android"
        label="Android"
      />
    </div>
  )
}

function DeviceFrame({
  src,
  alt,
  className = '',
  label,
}: {
  src: string
  alt: string
  className?: string
  label: string
}) {
  const labelClasses =
    label === 'iOS'
      ? 'border-sky-200/50 bg-sky-950/80 text-sky-50'
      : 'border-lime-200/50 bg-lime-950/80 text-lime-50'

  return (
    <figure className={`relative ${className}`}>
      <figcaption className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] shadow-[0_10px_30px_rgba(0,0,0,0.65)] backdrop-blur-md ${labelClasses}`}
        >
          {label}
        </span>
      </figcaption>
      <div className="overflow-hidden rounded-[1.7rem] border border-white/12 bg-black p-1.5 shadow-2xl shadow-black/60">
        <div className="overflow-hidden rounded-[1.25rem] bg-black">
          <img
            src={src}
            alt={alt}
            className="aspect-[390/844] h-auto w-full object-cover object-top"
            loading="eager"
          />
        </div>
      </div>
    </figure>
  )
}

function ProofStrip() {
  return (
    <section className="border-y border-white/10 bg-[#0b1016] px-5 py-5 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          'Rust app code',
          'Native iOS and Android',
          'Lynx CSS surface',
          '< 1s hot reload target',
        ].map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 className="size-4 text-lime-300" aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function RustSection() {
  return (
    <section id="features" className="px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">
            Rust changes the baseline
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-6xl">
            Mobile apps should not need a scripting runtime to feel productive.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Whisker makes Rust the application language, not a native escape
            hatch. Write the UI, state graph, business logic, native calls, and
            tooling path in one systems language.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rustAdvantages.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.035] p-6 transition hover:border-white/20 hover:bg-white/[0.055]">
      <div className="mb-5 grid size-11 place-items-center rounded-md bg-cyan-300/10 text-cyan-200">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-400">{feature.body}</p>
    </article>
  )
}

function DslSection() {
  return (
    <section className="bg-[#f7f4ec] px-5 py-24 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">
            Ergonomic Rust UI
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight sm:text-6xl">
            A DSL that feels like UI, with Rust safety underneath.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-700">
            The `render!` macro keeps view code readable while Rust keeps props,
            state, and platform calls typed. Signals and computed values update
            the exact native attributes that depend on them.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              { icon: Code2, text: 'JSX-like Rust view syntax' },
              { icon: ShieldCheck, text: 'Safe state and prop flow' },
              { icon: Palette, text: 'CSS grid, gradients, and layout' },
              { icon: Layers, text: 'Native widgets through Lynx' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-md bg-white p-4">
                <Icon className="size-5 text-orange-700" aria-hidden="true" />
                <span className="text-sm font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/10">
          <div className="rounded-md bg-[#111827] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-cyan-200" aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-300">
                  render.rs
                </span>
              </div>
              <span className="rounded-full bg-orange-300/15 px-2 py-1 text-xs font-semibold text-orange-200">
                safe by default
              </span>
            </div>
            <pre className="overflow-hidden text-[13px] leading-6 text-slate-300">
              <code>{`render! {
    page(style: css!(
        display: grid,
        grid_template_columns: "1fr 1fr",
        background: linear_gradient(...)
    )) {
        text(value: title)
        Image(src: cover, mode: AspectFill)
    }
}`}</code>
            </pre>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="css-sample-grid rounded-md p-5 text-white">
              <p className="text-sm font-semibold">CSS grid</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <span className="h-10 rounded bg-white/80" />
                <span className="h-10 rounded bg-white/45" />
                <span className="h-10 rounded bg-white/65" />
                <span className="col-span-2 h-10 rounded bg-white/55" />
                <span className="h-10 rounded bg-white/75" />
              </div>
            </div>
            <div className="css-sample-gradient rounded-md p-5 text-white">
              <p className="text-sm font-semibold">Gradients</p>
              <p className="mt-12 text-2xl font-bold">Lynx-powered visuals</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HotReloadSection() {
  return (
    <section className="px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-200">
              Sub-second iteration
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-6xl">
              Hot reload built for the Rust edit-debug loop.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Whisker patches changed function bodies into the running app and
              keeps state alive, so a UI tweak can land on device in under a
              second on the Tier 1 path.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-md bg-lime-300/10 text-lime-200">
                <RefreshCw className="size-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-200">
                  Save to screen
                </p>
                <p className="text-3xl font-semibold text-white">&lt; 1s target</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {[
                ['Save Rust file', 'notify + thin rebuild'],
                ['Build patch', 'symbol table + jump table'],
                ['Push to device', 'WebSocket envelope'],
                ['Apply live', 'state preserved on next frame'],
              ].map(([title, detail], index) => (
                <div
                  key={title}
                  className="grid grid-cols-[2.5rem_1fr] items-start gap-4"
                >
                  <div className="flex flex-col items-center">
                    <span className="grid size-10 place-items-center rounded-full border border-lime-200/25 bg-lime-300/10 text-sm font-bold text-lime-200">
                      {index + 1}
                    </span>
                    {index < 3 ? (
                      <span className="mt-2 h-8 w-px bg-lime-200/20" />
                    ) : null}
                  </div>
                  <div className="pb-3">
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm text-slate-400">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ModulesSection() {
  return (
    <section className="bg-[#10161d] px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Native extension story
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-6xl">
              Need platform APIs? Ship a Whisker Module.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              A module crate can package Rust, Kotlin, and Swift together.
              Whisker discovers it through Cargo metadata and wires it into the
              native host project during build.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-cyan-300/10 text-cyan-200">
                <Plug className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-white">One crate, three layers</p>
                <p className="text-sm text-slate-400">Rust API · Kotlin · Swift</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {moduleItems.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-white/10 bg-[#0b1016] px-4 py-3 text-sm font-medium text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="px-5 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl rounded-lg border border-white/10 bg-white/[0.035] p-8 sm:p-10 lg:p-12">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">
            The thesis
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-6xl">
            The next serious cross-platform stack should be written in Rust.
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Whisker is early, but the direction is sharp: mobile UI that keeps
            the developer experience of a modern framework and the engineering
            fundamentals of Rust.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://github.com/whiskerrs/whisker"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-orange-100"
            >
              <Github className="size-4" aria-hidden="true" />
              Follow development
            </a>
            <a
              href="https://github.com/whiskerrs/whisker/tree/main/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-white/12 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              Read design docs
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
