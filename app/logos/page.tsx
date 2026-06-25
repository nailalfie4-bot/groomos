import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GroomOS — Logo options",
  description: "Four logo directions to compare.",
};

const ROSE = "#C9756B";
const INK = "#2A2422";
const DEEP = "#7A3B36";
const WHITE = "#FFFFFF";

/* ------------------------------------------------------------------ marks --- */
/* All marks are simple, bold, filled/thick shapes — legible at 16px. */

// 1 & 3: fluffy small-dog face, composed from bold primitives.
function dogFace(fig: string, eye: string) {
  return (
    <>
      <g fill={fig}>
        {/* floppy ears — distinct lobes hanging at the sides */}
        <ellipse cx="13" cy="33" rx="7" ry="14" transform="rotate(-22 13 33)" />
        <ellipse cx="51" cy="33" rx="7" ry="14" transform="rotate(22 51 33)" />
        {/* fluffy crown */}
        <circle cx="24" cy="19" r="6.5" />
        <circle cx="32" cy="16" r="7" />
        <circle cx="40" cy="19" r="6.5" />
        {/* head + cheeks */}
        <circle cx="32" cy="30" r="14.5" />
        <ellipse cx="32" cy="41" rx="11.5" ry="8" />
      </g>
      <g fill={eye}>
        <circle cx="26" cy="30" r="3.3" />
        <circle cx="38" cy="30" r="3.3" />
        <ellipse cx="32" cy="37.5" rx="2.8" ry="2.3" />
      </g>
    </>
  );
}

function bow(color: string) {
  return (
    <g fill={color}>
      <path d="M32 10 L 22 5 L 23 15 Z" />
      <path d="M32 10 L 42 5 L 41 15 Z" />
      <circle cx="32" cy="10" r="2.8" />
    </g>
  );
}

// 2: bold "G" monogram with a perky ear + two dot eyes hidden in the counter.
function dogG(fig: string) {
  return (
    <>
      <path
        d="M47 23 A 18 18 0 1 0 47 41 L 39 41 L 39 33"
        fill="none"
        stroke={fig}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* perky ear */}
      <path d="M20.5 18 L 25 7 L 30.5 16 Z" fill={fig} />
      {/* eyes peeking through the counter */}
      <circle cx="28.5" cy="29" r="2.1" fill={fig} />
      <circle cx="35.5" cy="29" r="2.1" fill={fig} />
    </>
  );
}

// 4: clean bold "G" for the app icon / favicon.
function plainG(fig: string) {
  return (
    <path
      d="M47 23 A 18 18 0 1 0 47 41 L 39 41 L 39 33"
      fill="none"
      stroke={fig}
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

// 4: simple paw-print accent for the wordmark.
function paw(color: string) {
  return (
    <g fill={color}>
      <circle cx="8" cy="11" r="3.1" />
      <circle cx="15" cy="7.5" r="3.4" />
      <circle cx="22" cy="11" r="3.1" />
      <ellipse cx="15" cy="20.5" rx="7.2" ry="6.2" />
    </g>
  );
}

/* ----------------------------------------------------------------- display -- */

function Tile({ size, children }: { size: number; children: ReactNode }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: size * 0.24, background: ROSE }}
    >
      <svg viewBox="0 0 64 64" width={size * 0.64} height={size * 0.64} fill="none">
        {children}
      </svg>
    </div>
  );
}

function Wordmark({ withPaw = false }: { withPaw?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {withPaw && (
        <svg viewBox="0 0 30 28" width={20} height={19} fill="none" aria-hidden>
          {paw(ROSE)}
        </svg>
      )}
      <span className="text-[19px] font-semibold tracking-tight" style={{ color: INK }}>
        Groom<span style={{ color: ROSE }}>OS</span>
      </span>
    </span>
  );
}

function HeaderSample({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-14 items-center gap-2.5 rounded-xl border border-DEFAULT bg-surface px-4">
      {children}
    </div>
  );
}

function InkMark({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" width={30} height={30} fill="none" aria-hidden>
      {children}
    </svg>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">{label}</p>
      {children}
    </div>
  );
}

function Option({
  n,
  name,
  desc,
  tileMark,
  headerLockup,
}: {
  n: number;
  name: string;
  desc: string;
  tileMark: ReactNode; // white-on-rose variant
  headerLockup: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-DEFAULT bg-surface p-6 shadow-card sm:p-8">
      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="inline-flex h-6 items-center rounded-full bg-accent-100 px-2.5 text-xs font-semibold text-accent-700">
          Option {n}
        </span>
        <h2 className="text-lg font-semibold text-ink">{name}</h2>
        <p className="text-sm text-ink-muted">{desc}</p>
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        <Block label="App icon">
          <Tile size={112}>{tileMark}</Tile>
        </Block>
        <Block label="Favicon · 32 / 16px">
          <div className="flex items-end gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <Tile size={32}>{tileMark}</Tile>
              <span className="text-[10px] text-ink-subtle">32</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Tile size={16}>{tileMark}</Tile>
              <span className="text-[10px] text-ink-subtle">16</span>
            </div>
          </div>
        </Block>
        <Block label="In site header">
          <HeaderSample>{headerLockup}</HeaderSample>
        </Block>
      </div>
    </div>
  );
}

export default function LogosPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">GroomOS</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink sm:text-[36px]">
            Logo options
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink-muted">
            Four directions, each shown as an app-icon tile, at favicon sizes, and in a
            sample header. Tell me which one to apply everywhere.
          </p>
        </header>

        <div className="space-y-6">
          <Option
            n={1}
            name="Fluffy dog face"
            desc="Bold, minimal small-dog face — instantly readable."
            tileMark={dogFace(WHITE, DEEP)}
            headerLockup={
              <>
                <InkMark>{dogFace(INK, ROSE)}</InkMark>
                <Wordmark />
              </>
            }
          />
          <Option
            n={2}
            name="“G” monogram, dog twist"
            desc="Bold letter G with a perky ear and eyes — premium, tech-startup feel."
            tileMark={dogG(WHITE)}
            headerLockup={
              <>
                <InkMark>{dogG(INK)}</InkMark>
                <Wordmark />
              </>
            }
          />
          <Option
            n={3}
            name="Dog face + grooming bow"
            desc="The fluffy face with a tied topknot bow — the “groomed” signal."
            tileMark={
              <>
                {dogFace(WHITE, DEEP)}
                {bow(WHITE)}
              </>
            }
            headerLockup={
              <>
                <InkMark>
                  {dogFace(INK, ROSE)}
                  {bow(ROSE)}
                </InkMark>
                <Wordmark />
              </>
            }
          />
          <Option
            n={4}
            name="Wordmark-led + paw"
            desc="Type-forward with a paw accent; a bold “G” square for the app icon."
            tileMark={plainG(WHITE)}
            headerLockup={<Wordmark withPaw />}
          />
        </div>
      </div>
    </div>
  );
}
