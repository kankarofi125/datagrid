import AirtimeService from "@/components/services/AirtimeService";
import CableService from "@/components/services/CableService";
import DataService from "@/components/services/DataService";
import ElectricityService from "@/components/services/ElectricityService";
import ExamPinsService from "@/components/services/ExamPinsService";
import { ServiceHubNav } from "@/components/services/ServiceHubNav";
import {
  SERVICE_OPTIONS,
  type ServiceKey,
} from "@/components/services/service-options";

function isServiceKey(value: string | undefined): value is ServiceKey {
  return SERVICE_OPTIONS.some((service) => service.key === value);
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    phone?: string;
    planId?: string;
    amount?: string;
  }>;
}) {
  const params = await searchParams;
  const active: ServiceKey = isServiceKey(params.service) ? params.service : "data";

  return (
    <>
      <ServiceHubNav active={active} />
      {active === "data" && (
        <DataService
          key={`${params.phone || ""}:${params.planId || ""}`}
          initialPhone={params.phone}
          initialPlanId={params.planId}
        />
      )}
      {active === "airtime" && (
        <AirtimeService
          key={`${params.phone || ""}:${params.amount || ""}`}
          initialPhone={params.phone}
          initialAmount={params.amount}
        />
      )}
      {active === "electricity" && <ElectricityService />}
      {active === "cable" && <CableService />}
      {active === "pins" && <ExamPinsService />}
    </>
  );
}
