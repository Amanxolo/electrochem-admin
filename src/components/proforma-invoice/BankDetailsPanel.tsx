/** Static company bank details shown on all proforma invoice UIs. */
export default function BankDetailsPanel({
  variant = "sidebar",
}: {
  /** `table` matches PDF layout: bank block inside invoice totals (no extra top border). */
  variant?: "sidebar" | "table";
}) {
  const wrap =
    variant === "table"
      ? "text-[11px] leading-snug text-left"
      : "p-2 border-t-[1.5px] border-black text-[11px] leading-snug";
  return (
    <div className={wrap}>
      <p className="font-bold mb-1">Our Bank Details</p>
      <p className="font-normal m-0">Name of the Bank: HDFC BANK LTD.</p>
      <p className="font-normal m-0">Branch: GOVINDPURAM, GHAZIABAD</p>
      <p className="font-normal m-0">Account No.: 50200050613575</p>
      <p className="font-normal m-0">IFSC: HDFC0004733</p>
    </div>
  );
}
