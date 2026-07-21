import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PinSettings } from "@/components/auth/PinSettings";
import { LowDataToggle } from "@/components/settings/LowDataToggle";
import { MobileOnly, DesktopOnly, PageHeader } from "@/components/layout/Responsive";
import { MotionMobileHeader } from "@/components/motion/PageChrome";
import { Reveal } from "@/components/motion/Reveal";

export default async function SettingsPage() {
  const session = await getSession();
  const user = session.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;

  const profile = (
    <dl className="surface space-y-3 p-4 text-sm lg:p-6">
      <div className="flex justify-between gap-4 border-b border-line pb-3 lg:grid lg:grid-cols-2 lg:border-0 lg:pb-0">
        <dt className="text-ink/50">Phone</dt>
        <dd className="font-mono-num text-right lg:text-left">{user?.phoneLocal}</dd>
      </div>
      <div className="flex justify-between gap-4 border-b border-line pb-3 lg:grid lg:grid-cols-2 lg:border-0 lg:pb-0">
        <dt className="text-ink/50">Referral</dt>
        <dd className="font-mono-num text-right text-green lg:text-left">
          {user?.referralCode}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-b border-line pb-3 lg:grid lg:grid-cols-2 lg:border-0 lg:pb-0">
        <dt className="text-ink/50">KYC tier</dt>
        <dd className="font-mono-num text-right lg:text-left">{user?.kycTier}</dd>
      </div>
      <div className="flex justify-between gap-4 border-b border-line pb-3 lg:grid lg:grid-cols-2 lg:border-0 lg:pb-0">
        <dt className="text-ink/50">Role</dt>
        <dd className="font-mono-num text-right lg:text-left">{user?.role}</dd>
      </div>
      <div className="flex justify-between gap-4 lg:grid lg:grid-cols-2">
        <dt className="text-ink/50">Lifetime volume</dt>
        <dd className="font-mono-num text-right lg:text-left">
          ₦{Number(user?.lifetimeVolume ?? 0).toLocaleString("en-NG")}
        </dd>
      </div>
    </dl>
  );

  return (
    <>
      <MobileOnly>
        <div className="space-y-6 px-4 py-6">
          <MotionMobileHeader kicker="PROFILE" title="SETTINGS." />
          <Reveal delay={100}>{profile}</Reveal>
          <Reveal delay={160}><PinSettings hasPin={Boolean(user?.pinHash)} /></Reveal>
          <Reveal delay={220}><LowDataToggle /></Reveal>
          <Reveal delay={280}><LogoutButton /></Reveal>
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="px-8 py-8 xl:px-10">
          <PageHeader
            kicker="PROFILE"
            title="SETTINGS."
            description="Account, PIN, data saver, and security controls."
          />
          <div className="grid max-w-5xl items-start gap-8 lg:grid-cols-2">
            <Reveal delay={120}>
              <h2 className="font-mono-num mb-3 text-[11px] tracking-widest text-ink/45">
                ACCOUNT
              </h2>
              {profile}
              <div className="mt-4">
                <LowDataToggle />
              </div>
              <div className="mt-6">
                <LogoutButton />
              </div>
            </Reveal>
            <Reveal delay={200}>
              <h2 className="font-mono-num mb-3 text-[11px] tracking-widest text-ink/45">
                SECURITY
              </h2>
              <PinSettings hasPin={Boolean(user?.pinHash)} />
            </Reveal>
          </div>
        </div>
      </DesktopOnly>
    </>
  );
}
