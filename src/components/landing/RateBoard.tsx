import { formatNaira } from "@/lib/money";

type Row = {
  network: string;
  plan: string;
  type: string;
  price: number;
  reseller: number;
};

const ROWS: Row[] = [
  { network: "MTN", plan: "1GB", type: "SME", price: 400, reseller: 360 },
  { network: "MTN", plan: "2GB", type: "SME", price: 750, reseller: 690 },
  { network: "GLO", plan: "1GB", type: "GIFTING", price: 450, reseller: 410 },
  { network: "AIRTEL", plan: "1.5GB", type: "RETAIL", price: 500, reseller: 460 },
  { network: "9MOBILE", plan: "1GB", type: "SME", price: 400, reseller: 365 },
  { network: "DSTV", plan: "Padi", type: "CABLE", price: 2950, reseller: 2900 },
];

export function RateBoard() {
  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 bg-green-deep px-5 py-4">
        <h3 className="font-display text-xl text-paper">RATE BOARD</h3>
        <span className="font-mono-num text-[10px] tracking-widest text-amber">
          ADMIN-EDITABLE
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-ink/[0.03]">
              {["NETWORK", "PLAN", "TYPE", "RETAIL", "RESELLER"].map((h) => (
                <th
                  key={h}
                  className="font-mono-num px-4 py-2 text-[10px] tracking-[0.14em] text-ink/50"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={`${r.network}-${r.plan}`} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold">{r.network}</td>
                <td className="font-mono-num px-4 py-3">{r.plan}</td>
                <td className="font-mono-num px-4 py-3 text-ink/60">{r.type}</td>
                <td className="font-mono-num px-4 py-3">{formatNaira(r.price, { compact: true })}</td>
                <td className="font-mono-num px-4 py-3 text-green">
                  {formatNaira(r.reseller, { compact: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
