import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Send, Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Valid email required').max(255),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(150).optional(),
  message: z.string().trim().min(1, 'Message is required').max(2000),
});

type FormValues = z.infer<typeof schema>;

interface PublicListingInquiryFormProps {
  listingId: string;
  listingAddress: string;
}

export function PublicListingInquiryForm({ listingId, listingAddress }: PublicListingInquiryFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const { error } = await supabase.from('public_listing_inquiries').insert({
      listing_id: listingId,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
      message: data.message,
    });
    if (error) {
      setServerError('Something went wrong. Please try again or contact us directly.');
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <h3 className="font-semibold text-[hsl(222,47%,11%)]">Inquiry Sent!</h3>
        <p className="text-sm text-[hsl(215,16%,47%)]">
          Thank you for your interest. Our team will be in touch with you shortly.
        </p>
      </div>
    );
  }

  const inputCls = "w-full text-sm border border-[hsl(220,13%,87%)] rounded-lg px-3 py-2.5 bg-[hsl(210,20%,98%)] placeholder:text-[hsl(215,16%,60%)] focus:outline-none focus:ring-2 focus:ring-[hsl(38,90%,55%)] focus:border-transparent transition-all";
  const errorCls = "text-xs text-red-500 mt-0.5";
  const labelCls = "block text-xs font-medium text-[hsl(215,16%,47%)] mb-1";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <div>
        <label className={labelCls}>Name *</label>
        <input type="text" placeholder="Your full name" className={inputCls} {...register('name')} />
        {errors.name && <p className={errorCls}>{errors.name.message}</p>}
      </div>

      <div>
        <label className={labelCls}>Email *</label>
        <input type="email" placeholder="you@example.com" className={inputCls} {...register('email')} />
        {errors.email && <p className={errorCls}>{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Phone</label>
          <input type="tel" placeholder="+1 (403) …" className={inputCls} {...register('phone')} />
        </div>
        <div>
          <label className={labelCls}>Company</label>
          <input type="text" placeholder="Acme Inc." className={inputCls} {...register('company')} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Message *</label>
        <textarea
          rows={4}
          placeholder={`I'm interested in ${listingAddress}…`}
          className={inputCls + ' resize-none'}
          {...register('message')}
        />
        {errors.message && <p className={errorCls}>{errors.message.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-500">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-[hsl(38,90%,55%)] hover:bg-[hsl(38,90%,48%)] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {isSubmitting ? 'Sending…' : 'Send Inquiry'}
      </button>
    </form>
  );
}
