"use client";

export function WhatsAppFab({ orderRef }: { orderRef?: string }) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP || "2348000000000";
  const text = orderRef
    ? encodeURIComponent(`Hi DataGrid support — order ${orderRef}`)
    : encodeURIComponent("Hi DataGrid support");
  const href = `https://wa.me/${phone}?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-30 flex h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white shadow-lg pressable lg:bottom-6 lg:right-8"
      aria-label="Chat on WhatsApp"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.2 2 11.5c0 1.85.52 3.58 1.43 5.08L2 22l5.64-1.47A10.3 10.3 0 0 0 12 21c5.52 0 10-4.2 10-9.5S17.52 2 12 2Zm0 17.2c-1.54 0-2.97-.4-4.22-1.1l-.3-.17-3.34.87.9-3.2-.2-.33A7.4 7.4 0 0 1 4.5 11.5C4.5 7.63 7.86 4.5 12 4.5s7.5 3.13 7.5 7-3.36 7.7-7.5 7.7Z" />
      </svg>
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
