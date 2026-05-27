interface PaymentReturnDetailsProps {
  order?: string;
  reference?: string;
  paymentId?: string;
  preferenceId?: string;
  merchantOrderId?: string;
  externalReference?: string;
  status?: string;
}

export function PaymentReturnDetails({
  order,
  reference,
  paymentId,
  preferenceId,
  merchantOrderId,
  externalReference,
  status,
}: PaymentReturnDetailsProps) {
  const rawEntries: Array<[string, string | undefined]> = [
    ["Orden", order],
    ["Payment ID", paymentId],
    ["Preferencia", preferenceId],
    ["Merchant order", merchantOrderId],
    ["External reference", externalReference],
    ["Referencia", reference],
    ["Estado informado", status],
  ];
  const entries = rawEntries.filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  );

  if (!entries.length) {
    return null;
  }

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-left">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
              {label}
            </dt>
            <dd className="mt-1 break-all font-medium text-[var(--color-ink)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
        La confirmacion final se actualiza en el servidor mediante webhook del
        proveedor de pago.
      </p>
    </div>
  );
}
