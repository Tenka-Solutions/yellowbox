do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.payment_status'::regtype
      and enumlabel = 'failed'
  ) then
    alter type public.payment_status add value 'failed';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.payment_status'::regtype
      and enumlabel = 'refunded'
  ) then
    alter type public.payment_status add value 'refunded';
  end if;
end
$$;
