/**
 * ClubKonnect (Nellobytes) bills adapter — airtime, electricity, cable.
 *
 * GET endpoints with UserID/APIKey query auth (ported from the previously
 * live webapp adapter):
 * - /APIAirtimeV1.asp {MobileNetwork, Amount, MobileNumber, RequestID}
 * - /APIElectricityV1.asp {ElectricCompany, MeterNo, Amount, RequestID}
 * - /APICableTVV1.asp {CableTV, SmartCardNo, Package, RequestID}
 * - Success: status ORDER_RECEIVED/successful or statuscode "200".
 *
 * No exam pins, no meter/IUC validation, no documented requery.
 */
import type { BillsClubKonnectConfig, BillsProviderAdapter } from "./types.js";
export declare function createClubKonnectAdapter(config: BillsClubKonnectConfig, fetchFn?: typeof fetch): BillsProviderAdapter;
//# sourceMappingURL=clubkonnect.d.ts.map