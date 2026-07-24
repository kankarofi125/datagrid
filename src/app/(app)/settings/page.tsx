import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { cached, CacheKeys } from "@/lib/cache";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PinSettings } from "@/components/auth/PinSettings";
import { LowDataToggle } from "@/components/settings/LowDataToggle";
import { MobileProfileHub } from "@/components/settings/MobileProfileHub";
import { ProfileEditor } from "@/components/settings/ProfileEditor";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";
import { formatNaira } from "@/lib/money";

async function loadProfile(userId: string) {
  const [user, activeApiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        phoneLocal: true,
        referralCode: true,
        kycTier: true,
        kycStatus: true,
        role: true,
        lifetimeVolume: true,
        pinHash: true,
        totpEnabled: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
            beneficiaries: true,
            schedules: true,
            referrals: true,
            tickets: true,
          },
        },
      },
    }),
    prisma.apiKey.count({ where: { userId, revokedAt: null } }),
  ]);

  if (!user) return null;
  return {
    ...user,
    lifetimeVolume: Number(user.lifetimeVolume),
    pinHash: Boolean(user.pinHash),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    activeApiKeys,
  };
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const profile = await cached(
    CacheKeys.userProfile(session.userId),
    () => loadProfile(session.userId!),
    { ttl: 60, staleTtl: 900 }
  );
  if (!profile) redirect("/login");

  const completionParts = [
    Boolean(profile.name),
    Boolean(profile.email),
    profile.pinHash,
    profile.kycStatus === "APPROVED",
    profile.totpEnabled,
  ];
  const completion = Math.round(
    (completionParts.filter(Boolean).length / completionParts.length) * 100
  );

  return (
    <div className="space-y-3 px-3.5 pb-7 pt-4 lg:px-8 lg:py-8 xl:px-10">
      <MobileOnly>
          <MotionMobileHeader
            kicker="ACCOUNT"
            title="PROFILE."
            trailing={
              <span className="rounded-full bg-green/8 px-2.5 py-1 font-mono-num text-[9px] font-semibold text-green">
                {profile.isActive ? "ACTIVE" : "RESTRICTED"}
              </span>
            }
          />
      </MobileOnly>

      <DesktopOnly>
          <PageHeader
            kicker="IDENTITY · SECURITY · PREFERENCES"
            title="PROFILE."
            description="Manage your identity, security posture, preferences, and account tools."
            actions={
              <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-green/15 bg-green/5 px-4 font-mono-num text-[10px] font-semibold text-green">
                <span className="h-1.5 w-1.5 rounded-full bg-green" />
                {profile.isActive ? "ACCOUNT ACTIVE" : "ACCOUNT RESTRICTED"}
              </span>
            }
          />
      </DesktopOnly>
      <ProfileContent profile={profile} completion={completion} />
    </div>
  );
}

type ProfileData = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

function ProfileContent({
  profile,
  completion,
}: {
  profile: ProfileData;
  completion: number;
}) {
  const displayName = profile.name || "DataGrid customer";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-3 lg:space-y-5">
      <Reveal delay={70}>
        <section className="overflow-hidden rounded-[20px] bg-green-deep p-4 text-paper lg:p-6">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber font-display text-sm text-[#2c1b02] lg:h-14 lg:w-14 lg:text-base">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold lg:text-xl">{displayName}</h2>
              <p className="font-mono-num mt-0.5 text-[10px] text-paper/50">
                {profile.phoneLocal} · {profile.role}
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="font-mono-num text-[8px] uppercase tracking-wider text-paper/35">
                Member since
              </p>
              <p className="mt-1 text-xs font-semibold">
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono-num text-[9px] uppercase tracking-wider text-paper/45">
                Profile strength
              </p>
              <p className="font-mono-num text-[10px] font-semibold text-amber">{completion}%</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-amber transition-[width]"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
        </section>
      </Reveal>

      <MobileOnly>
        <Reveal delay={110}>
          <div className="-mx-3.5 flex snap-x gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MobileMetric label="Transactions" value={profile._count.transactions} />
            <MobileMetric label="Beneficiaries" value={profile._count.beneficiaries} />
            <MobileMetric label="Schedules" value={profile._count.schedules} />
            <MobileMetric label="Referrals" value={profile._count.referrals} />
            <MobileMetric
              label="Lifetime volume"
              value={formatNaira(profile.lifetimeVolume, { compact: true })}
              wide
            />
          </div>
        </Reveal>

        <MobileProfileHub
          personal={
            <ProfileEditor
              initialName={profile.name || ""}
              initialEmail={profile.email || ""}
            />
          }
          security={
            <div className="space-y-3">
              <section className="surface p-4">
                <SectionTitle kicker="Account standing" title="Verification status" />
                <div className="mt-4 grid gap-2">
                  <StatusRow label="KYC tier" value={profile.kycTier} good={profile.kycTier !== "T0"} />
                  <StatusRow
                    label="KYC status"
                    value={profile.kycStatus}
                    good={profile.kycStatus === "APPROVED"}
                  />
                  <StatusRow
                    label="Transaction PIN"
                    value={profile.pinHash ? "Protected" : "Not set"}
                    good={profile.pinHash}
                  />
                  <StatusRow
                    label="Two-step security"
                    value={profile.totpEnabled ? "Enabled" : "Not enabled"}
                    good={profile.totpEnabled}
                  />
                </div>
              </section>
              <section className="surface p-4">
                <SectionTitle kicker="Purchase security" title="Transaction PIN" />
                <div className="mt-4">
                  <PinSettings hasPin={profile.pinHash} />
                </div>
              </section>
            </div>
          }
          preferences={
            <section className="surface p-4">
              <SectionTitle kicker="Data usage" title="Experience controls" />
              <div className="mt-4">
                <LowDataToggle />
              </div>
            </section>
          }
          account={
            <div className="space-y-3">
              <section className="surface p-4">
                <SectionTitle kicker="Account record" title="Your details" />
                <dl className="mt-3 divide-y divide-line border-t border-line text-xs">
                  <DetailRow label="Referral code" value={profile.referralCode} mono />
                  <DetailRow
                    label="Member since"
                    value={formatDate(profile.createdAt)}
                  />
                  <DetailRow
                    label="Last sign-in"
                    value={profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : "Not recorded"}
                  />
                  <DetailRow label="Open support tickets" value={String(profile._count.tickets)} />
                  <DetailRow label="Active API keys" value={String(profile.activeApiKeys)} />
                </dl>
              </section>
              <section className="surface p-4">
                <SectionTitle kicker="Session" title="Account access" />
                <p className="mt-2 text-xs leading-relaxed text-ink/50">
                  Logging out removes this device session. Your wallet and transaction records
                  remain protected.
                </p>
                <div className="mt-4">
                  <LogoutButton />
                </div>
              </section>
            </div>
          }
        />
      </MobileOnly>

      <DesktopOnly>
        <div className="grid grid-cols-5 gap-3">
          <AccountMetric label="Transactions" value={profile._count.transactions} />
          <AccountMetric label="Beneficiaries" value={profile._count.beneficiaries} />
          <AccountMetric label="Schedules" value={profile._count.schedules} />
          <AccountMetric label="Referrals" value={profile._count.referrals} />
          <AccountMetric
            label="Lifetime volume"
            value={formatNaira(profile.lifetimeVolume, { compact: true })}
          />
        </div>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <Reveal delay={130}>
              <ProfileEditor
                initialName={profile.name || ""}
                initialEmail={profile.email || ""}
              />
            </Reveal>
            <Reveal delay={190}>
              <section className="surface p-6">
                <SectionTitle kicker="Account standing" title="Identity & verification" />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <StatusRow label="KYC tier" value={profile.kycTier} good={profile.kycTier !== "T0"} />
                  <StatusRow
                    label="KYC status"
                    value={profile.kycStatus}
                    good={profile.kycStatus === "APPROVED"}
                  />
                  <StatusRow
                    label="Transaction PIN"
                    value={profile.pinHash ? "Protected" : "Not set"}
                    good={profile.pinHash}
                  />
                  <StatusRow
                    label="Two-step security"
                    value={profile.totpEnabled ? "Enabled" : "Not enabled"}
                    good={profile.totpEnabled}
                  />
                </div>
                <dl className="mt-4 divide-y divide-line border-t border-line text-xs">
                  <DetailRow label="Referral code" value={profile.referralCode} mono />
                  <DetailRow
                    label="Last sign-in"
                    value={profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : "Not recorded"}
                  />
                  <DetailRow label="Open support tickets" value={String(profile._count.tickets)} />
                  <DetailRow label="Active API keys" value={String(profile.activeApiKeys)} />
                </dl>
              </section>
            </Reveal>
            <Reveal delay={240}>
              <section className="surface p-6">
                <SectionTitle kicker="Shortcuts" title="Account tools" />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <QuickLink href="/analytics" label="My analytics" detail="Spending insights" />
                  <QuickLink href="/schedules" label="Schedules" detail="Automated top-ups" />
                  <QuickLink href="/referrals" label="Referrals" detail="Invite & earn" />
                  <QuickLink href="/agent" label="Agent / API" detail="Keys & integration" />
                  <QuickLink href="/support" label="Support" detail="Get help" />
                  <QuickLink href="/history" label="Receipts" detail="Order records" />
                </div>
              </section>
            </Reveal>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <Reveal delay={160}>
              <section className="surface p-6">
                <SectionTitle kicker="Security" title="Purchase protection" />
                <div className="mt-4">
                  <PinSettings hasPin={profile.pinHash} />
                </div>
              </section>
            </Reveal>
            <Reveal delay={220}>
              <section className="surface p-6">
                <SectionTitle kicker="Preferences" title="Experience controls" />
                <div className="mt-4">
                  <LowDataToggle />
                </div>
              </section>
            </Reveal>
            <Reveal delay={280}>
              <section className="surface p-6">
                <SectionTitle kicker="Session" title="Account access" />
                <p className="mt-2 text-xs leading-relaxed text-ink/50">
                  Logging out removes this device session. Your wallet and transaction records
                  remain protected.
                </p>
                <div className="mt-4">
                  <LogoutButton />
                </div>
              </section>
            </Reveal>
          </div>
        </div>
      </DesktopOnly>
    </div>
  );
}

function MobileMetric({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div className={`surface w-[116px] shrink-0 snap-start px-3 py-2.5 ${wide ? "w-[138px]" : ""}`}>
      <p className="font-mono-num text-[7px] uppercase tracking-wider text-ink/38">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function AccountMetric({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div className={`surface min-w-0 p-3.5 ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className="font-mono-num text-[8px] uppercase tracking-wider text-ink/38">{label}</p>
      <p className="mt-1 truncate text-base font-semibold">{value}</p>
    </div>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="font-mono-num text-[9px] font-semibold uppercase tracking-[0.14em] text-green">
        {kicker}
      </p>
      <h2 className="mt-1 text-base font-semibold">{title}</h2>
    </div>
  );
}

function StatusRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-ink/[0.035] px-3 py-2.5">
      <span className="text-xs text-ink/55">{label}</span>
      <span className={`font-mono-num text-[9px] font-semibold ${good ? "text-green" : "text-amber-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-ink/48">{label}</dt>
      <dd className={`text-right font-medium ${mono ? "font-mono-num text-green" : ""}`}>{value}</dd>
    </div>
  );
}

function QuickLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-line bg-paper px-3 py-3 transition hover:border-green/25 hover:bg-white"
    >
      <span className="block text-xs font-semibold group-hover:text-green">{label}</span>
      <span className="mt-1 block font-mono-num text-[8px] uppercase tracking-wide text-ink/35">
        {detail}
      </span>
    </Link>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
