"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DirBlogPost, DirClaimRequest, DirGroomer, DirRemovalRequest, DirSchool, DirTown, ListingStatus,
} from "@/lib/directory/types";

type Tab = "import" | "groomers" | "towns" | "schools" | "blog" | "claims" | "removals";
const TABS: Tab[] = ["import", "groomers", "towns", "schools", "blog", "claims", "removals"];

const field =
  "w-full rounded-lg border border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const btn = "rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-ink-inverse hover:bg-accent-600 disabled:opacity-60";
const btnGhost = "rounded-lg border border-strong px-3 py-2 text-sm text-ink hover:border-accent";

async function compressToWebp(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = document.createElement("img");
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("bad image")); img.src = url; });
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/webp", 0.8);
}

export function AdminDashboard({ groomers, towns, schools, posts, claims, removals }: {
  groomers: DirGroomer[]; towns: DirTown[]; schools: DirSchool[]; posts: DirBlogPost[];
  claims: DirClaimRequest[]; removals: DirRemovalRequest[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("import");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const townName = new Map(towns.map((t) => [t.id, t.name]));

  async function post(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/directory/admin", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.ok === false) { setMsg(d.message || d.error || "Failed."); return null; }
      router.refresh();
      return d;
    } catch { setMsg("Network error."); return null; }
    finally { setBusy(false); }
  }

  const pendingClaims = claims.filter((c) => c.status === "pending");
  const openRemovals = removals.filter((r) => r.status === "open");

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1.5 border-b border-DEFAULT pb-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-accent-50 text-accent-700" : "text-ink-muted hover:text-ink"}`}>
            {t}
            {t === "claims" && pendingClaims.length > 0 && <span className="ml-1 rounded-full bg-accent px-1.5 text-[11px] text-ink-inverse">{pendingClaims.length}</span>}
            {t === "removals" && openRemovals.length > 0 && <span className="ml-1 rounded-full bg-danger px-1.5 text-[11px] text-ink-inverse">{openRemovals.length}</span>}
          </button>
        ))}
      </div>

      {msg && <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-deep">{msg}</p>}

      <div className="mt-4">
        {tab === "import" && <ImportTab post={post} busy={busy} />}
        {tab === "groomers" && <GroomersTab groomers={groomers} towns={towns} townName={townName} post={post} busy={busy} />}
        {tab === "towns" && <TownsTab towns={towns} post={post} busy={busy} />}
        {tab === "schools" && <SchoolsTab schools={schools} towns={towns} post={post} busy={busy} />}
        {tab === "blog" && <BlogTab posts={posts} post={post} busy={busy} />}
        {tab === "claims" && <ClaimsTab claims={claims} groomers={groomers} post={post} busy={busy} />}
        {tab === "removals" && <RemovalsTab removals={removals} groomers={groomers} post={post} busy={busy} />}
      </div>
    </div>
  );
}

type Post = (action: string, payload: Record<string, unknown>) => Promise<Record<string, unknown> | null>;

function ImportTab({ post, busy }: { post: Post; busy: boolean }) {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-ink-muted">Bulk-import <strong>unverified</strong> listings. Columns: <code>name, town, website_url, social_url</code>. Only public info — no phone/address/email.</p>
      <textarea className={`${field} mt-3 font-mono text-xs`} rows={10} placeholder={"name,town,website_url,social_url\nHappy Paws,Maidstone,https://happypaws.co.uk,"} value={csv} onChange={(e) => setCsv(e.target.value)} />
      <button className={`${btn} mt-3`} disabled={busy || !csv.trim()} onClick={async () => {
        const d = await post("import", { csv });
        const r = d?.result as { inserted: number; skipped: number; errors: string[] } | undefined;
        if (r) setResult(`Imported ${r.inserted}, skipped ${r.skipped}.` + (r.errors.length ? ` Notes: ${r.errors.slice(0, 8).join(" · ")}` : ""));
      }}>Import CSV</button>
      {result && <p className="mt-3 text-sm text-ink">{result}</p>}
    </div>
  );
}

const STATUSES: ListingStatus[] = ["live", "hidden", "removal_requested", "removed"];

function GroomersTab({ groomers, towns, townName, post, busy }: {
  groomers: DirGroomer[]; towns: DirTown[]; townName: Map<string, string>; post: Post; busy: boolean;
}) {
  const [editing, setEditing] = useState<DirGroomer | "new" | null>(null);
  return (
    <div>
      <button className={btn} onClick={() => setEditing("new")}>+ New groomer</button>
      {editing && <GroomerEditor g={editing === "new" ? null : editing} towns={towns} post={post} busy={busy} onDone={() => setEditing(null)} />}
      <ul className="mt-4 divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
        {groomers.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium text-ink">{g.name}</span>
              <span className="text-ink-subtle"> · {g.townId ? townName.get(g.townId) ?? "—" : "no town"} · {g.listingStatus}{g.groomosUser ? " · GroomOS" : g.verified ? " · verified" : ""}</span>
            </span>
            <button className="shrink-0 text-accent-700 hover:underline" onClick={() => setEditing(g)}>Edit</button>
          </li>
        ))}
        {groomers.length === 0 && <li className="px-4 py-3 text-ink-subtle">No listings yet.</li>}
      </ul>
    </div>
  );
}

function GroomerEditor({ g, towns, post, busy, onDone }: {
  g: DirGroomer | null; towns: DirTown[]; post: Post; busy: boolean; onDone: () => void;
}) {
  const [name, setName] = useState(g?.name ?? "");
  const [townId, setTownId] = useState(g?.townId ?? "");
  const [website, setWebsite] = useState(g?.websiteUrl ?? "");
  const [social, setSocial] = useState(g?.socialUrl ?? "");
  const [groomosUser, setGroomosUser] = useState(g?.groomosUser ?? false);
  const [verified, setVerified] = useState(g?.verified ?? false);
  const [businessId, setBusinessId] = useState(g?.groomosBusinessId ?? "");
  const [status, setStatus] = useState<ListingStatus>(g?.listingStatus ?? "live");
  const [photos, setPhotos] = useState<string[]>(g?.photos ?? []);
  const [slug, setSlug] = useState(g?.slug ?? "");

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const dataUrl = await compressToWebp(file);
    const d = await post("upload", { dataUrl, ext: "webp" });
    if (d?.url) setPhotos((ps) => [...ps, d.url as string]);
  }

  async function save() {
    const ok = await post("groomer.save", {
      ...(g ? { id: g.id } : {}),
      name, townId: townId || null, websiteUrl: website || null, socialUrl: social || null,
      groomosUser, verified, groomosBusinessId: businessId || null, listingStatus: status, photos,
      ...(slug ? { slug } : {}),
    });
    if (ok) onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-accent/30 bg-surface p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-ink-muted">Name<input className={field} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="text-xs text-ink-muted">Town
          <select className={field} value={townId} onChange={(e) => setTownId(e.target.value)}>
            <option value="">— none —</option>
            {towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-muted">Website<input className={field} value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
        <label className="text-xs text-ink-muted">Social<input className={field} value={social} onChange={(e) => setSocial(e.target.value)} /></label>
        <label className="text-xs text-ink-muted">GroomOS business id (links Book Now)<input className={field} value={businessId} onChange={(e) => setBusinessId(e.target.value)} /></label>
        <label className="text-xs text-ink-muted">Slug (optional)<input className={field} value={slug} onChange={(e) => setSlug(e.target.value)} /></label>
        <label className="text-xs text-ink-muted">Status
          <select className={field} value={status} onChange={(e) => setStatus(e.target.value as ListingStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={groomosUser} onChange={(e) => setGroomosUser(e.target.checked)} /> GroomOS user</label>
        <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Verified</label>
      </div>
      <div className="text-xs text-ink-muted">
        Photos ({photos.length}) — <input type="file" accept="image/*" onChange={onUpload} className="text-xs" />
        {photos.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {photos.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded bg-surface-sunken px-1.5 py-0.5">
                photo {i + 1}<button onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="text-danger">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button className={btn} disabled={busy || !name.trim()} onClick={save}>Save</button>
        <button className={btnGhost} onClick={onDone}>Cancel</button>
        {g && <button className="ml-auto rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger-soft" disabled={busy}
          onClick={async () => { if (confirm(`Delete ${g.name}?`)) { await post("groomer.delete", { id: g.id }); onDone(); } }}>Delete</button>}
      </div>
    </div>
  );
}

function TownsTab({ towns, post, busy }: { towns: DirTown[]; post: Post; busy: boolean }) {
  const [editing, setEditing] = useState<DirTown | "new" | null>(null);
  const e = editing === "new" ? null : editing;
  const [name, setName] = useState("");
  const [county, setCounty] = useState("");
  const [intro, setIntro] = useState("");
  function open(t: DirTown | "new") { setEditing(t); const v = t === "new" ? null : t; setName(v?.name ?? ""); setCounty(v?.county ?? ""); setIntro(v?.introCopy ?? ""); }
  async function save() {
    const ok = await post("town.save", { ...(e ? { id: e.id, slug: name } : {}), name, county: county || null, introCopy: intro || null });
    if (ok) setEditing(null);
  }
  return (
    <div>
      <button className={btn} onClick={() => open("new")}>+ New town</button>
      {editing && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-accent/30 bg-surface p-4">
          <label className="text-xs text-ink-muted">Name<input className={field} value={name} onChange={(ev) => setName(ev.target.value)} /></label>
          <label className="text-xs text-ink-muted">County<input className={field} value={county} onChange={(ev) => setCounty(ev.target.value)} /></label>
          <label className="text-xs text-ink-muted">Intro copy (unique per town — no boilerplate)
            <textarea className={field} rows={4} value={intro} onChange={(ev) => setIntro(ev.target.value)} /></label>
          <div className="flex gap-2"><button className={btn} disabled={busy || !name.trim()} onClick={save}>Save</button><button className={btnGhost} onClick={() => setEditing(null)}>Cancel</button>
            {e && <button className="ml-auto text-sm text-danger" onClick={async () => { if (confirm("Delete town?")) { await post("town.delete", { id: e.id }); setEditing(null); } }}>Delete</button>}</div>
        </div>
      )}
      <ul className="mt-4 divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
        {towns.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span><span className="font-medium text-ink">{t.name}</span><span className="text-ink-subtle"> · {t.groomerCount} live{t.introCopy ? "" : " · no intro"}</span></span>
            <button className="text-accent-700 hover:underline" onClick={() => open(t)}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SchoolsTab({ schools, towns, post, busy }: { schools: DirSchool[]; towns: DirTown[]; post: Post; busy: boolean }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [website, setWebsite] = useState(""); const [townId, setTownId] = useState(""); const [partner, setPartner] = useState(false);
  return (
    <div>
      <div className="flex flex-col gap-2 rounded-xl border border-DEFAULT bg-surface p-4">
        <p className="text-sm font-medium text-ink">Add / update school</p>
        <input className={field} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className={field} rows={3} placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={field} placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <select className={field} value={townId} onChange={(e) => setTownId(e.target.value)}><option value="">— town —</option>{towns.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </div>
        <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" checked={partner} onChange={(e) => setPartner(e.target.checked)} /> Partner</label>
        <button className={btn} disabled={busy || !name.trim()} onClick={async () => { const ok = await post("school.save", { name, description: desc || null, website: website || null, townId: townId || null, partner }); if (ok) { setName(""); setDesc(""); setWebsite(""); } }}>Save school</button>
      </div>
      <ul className="mt-4 divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
        {schools.map((s) => <li key={s.id} className="px-4 py-2.5 text-sm text-ink">{s.name}{s.partner ? " · partner" : ""}</li>)}
      </ul>
    </div>
  );
}

function BlogTab({ posts, post, busy }: { posts: DirBlogPost[]; post: Post; busy: boolean }) {
  const [title, setTitle] = useState(""); const [excerpt, setExcerpt] = useState(""); const [body, setBody] = useState(""); const [published, setPublished] = useState(true);
  return (
    <div>
      <div className="flex flex-col gap-2 rounded-xl border border-DEFAULT bg-surface p-4">
        <p className="text-sm font-medium text-ink">New post</p>
        <input className={field} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={field} placeholder="Excerpt / meta description" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <textarea className={field} rows={8} placeholder="Body (blank line between paragraphs)" value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="inline-flex items-center gap-1.5 text-sm"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publish now</label>
        <button className={btn} disabled={busy || !title.trim()} onClick={async () => { const ok = await post("blog.save", { title, excerpt: excerpt || null, metaDescription: excerpt || null, body: body || null, publishedAt: published ? new Date().toISOString() : null }); if (ok) { setTitle(""); setExcerpt(""); setBody(""); } }}>Save post</button>
      </div>
      <ul className="mt-4 divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
        {posts.map((p) => <li key={p.id} className="px-4 py-2.5 text-sm text-ink">{p.title}{p.publishedAt ? "" : " · draft"}</li>)}
      </ul>
    </div>
  );
}

function ClaimsTab({ claims, groomers, post, busy }: { claims: DirClaimRequest[]; groomers: DirGroomer[]; post: Post; busy: boolean }) {
  const gName = new Map(groomers.map((g) => [g.id, g.name]));
  const [bizId, setBizId] = useState<Record<string, string>>({});
  return (
    <ul className="divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
      {claims.filter((c) => c.status === "pending").map((c) => (
        <li key={c.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
          <div><span className="font-medium text-ink">{c.name}</span> · {c.email}{c.phone ? ` · ${c.phone}` : ""} — claims <span className="text-ink-muted">{c.groomerId ? gName.get(c.groomerId) ?? "?" : "?"}</span></div>
          {c.businessVerification && <p className="text-xs text-ink-muted">Verification: {c.businessVerification}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${field} max-w-[16rem]`} placeholder="GroomOS business id (to link)" value={bizId[c.id] ?? ""} onChange={(e) => setBizId((s) => ({ ...s, [c.id]: e.target.value }))} />
            <button className={btn} disabled={busy} onClick={() => post("claim.resolve", { id: c.id, status: "approved", groomerId: c.groomerId, businessId: bizId[c.id] || undefined })}>Approve + link</button>
            <button className={btnGhost} disabled={busy} onClick={() => post("claim.resolve", { id: c.id, status: "rejected" })}>Reject</button>
          </div>
        </li>
      ))}
      {claims.filter((c) => c.status === "pending").length === 0 && <li className="px-4 py-3 text-ink-subtle">No pending claims.</li>}
    </ul>
  );
}

function RemovalsTab({ removals, groomers, post, busy }: { removals: DirRemovalRequest[]; groomers: DirGroomer[]; post: Post; busy: boolean }) {
  const gName = new Map(groomers.map((g) => [g.id, g.name]));
  return (
    <ul className="divide-y divide-DEFAULT rounded-xl border border-DEFAULT bg-surface">
      {removals.filter((r) => r.status === "open").map((r) => (
        <li key={r.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
          <div><span className="font-medium text-ink">{r.groomerId ? gName.get(r.groomerId) ?? "?" : "?"}</span>{r.requesterEmail ? ` · ${r.requesterEmail}` : ""}</div>
          {r.reason && <p className="text-xs text-ink-muted">Reason: {r.reason}</p>}
          <div className="flex gap-2">
            <button className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-ink-inverse hover:opacity-90" disabled={busy} onClick={() => post("removal.resolve", { id: r.id, action: "remove", groomerId: r.groomerId })}>Remove listing (410)</button>
            <button className={btnGhost} disabled={busy} onClick={() => post("removal.resolve", { id: r.id, action: "dismiss", groomerId: r.groomerId })}>Dismiss</button>
          </div>
        </li>
      ))}
      {removals.filter((r) => r.status === "open").length === 0 && <li className="px-4 py-3 text-ink-subtle">No open removal requests.</li>}
    </ul>
  );
}
