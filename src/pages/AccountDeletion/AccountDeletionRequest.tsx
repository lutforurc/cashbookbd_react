import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Cookies from 'js-cookie';
import httpService from '../../components/services/httpService';
import {
  API_ACCOUNT_DELETION_REQUEST_URL,
  API_ACCOUNT_DELETION_CONTEXT_URL,
  API_ACCOUNT_DELETION_SUBMIT_URL,
} from '../../components/services/apiRoutes';

/*
 * The PUBLIC "CashBookBD Account Deletion Request" page.
 *
 * ⚠️ Reachable with no sign-in and no app installed -- it is a root route, not
 * inside the authenticated shell. Everything it claims matches what the API
 * actually does; where a policy has not been decided (a support address, a
 * retention period), it says nothing rather than inventing one.
 *
 * Bilingual, self-contained: the app has no translation framework, so the two
 * languages live here as two string maps and a toggle.
 */

type Lang = 'bn' | 'en';
type RequestType = 'personal' | 'company';

const STRINGS = {
  en: {
    title: 'CashBookBD Account Deletion Request',
    intro:
      'You may ask CashBookBD to delete your personal account, or — if you are the verified owner of a company — the company and all the data that belongs to it. This page explains how, and what happens at each step.',
    notice:
      'Submitting a request does not immediately delete any data. Deletion will take place after the 14-day waiting period and completion of the review, including identity and ownership verification. If the review takes longer, deletion will be delayed. You may cancel your request before deletion begins.',
    how: 'How it works',
    steps: [
      'You submit this request. Nothing is deleted at this point.',
      'We verify your identity and your authority over the data.',
      'An ordinary user’s account deletion does not delete your company.',
      'A verified company owner can request permanent deletion of the company, all its branches, the accounts that belong to it alone, and its business records.',
      'Complete company deletion permanently removes accounting and operational records and cannot be undone through the application.',
      'If you need any records, export them before confirming deletion.',
    ],
    retentionTitle: 'What is kept',
    retention:
      'The details you are entitled to know — what, if anything, is retained, why, and for how long — are shown here only when a policy has been confirmed. No retention period is stated until one exists.',
    backupsTitle: 'Backups',
    backups:
      'Deleting your data does not necessarily remove it from backups on the same schedule; the backup retention window is not guaranteed by this page.',
    formTitle: 'Submit a request',
    name: 'Full name',
    email: 'Registered email address',
    mobile: 'Registered mobile number',
    company: 'Company name',
    type: 'Request type',
    typePersonal: 'Delete my personal user account',
    typeCompany: 'Delete my company and all associated accounts and business data',
    reason: 'Reason (optional)',
    confirmPersonal:
      'I confirm I am requesting deletion of my personal account.',
    confirmCompany:
      'I understand that this request concerns permanent deletion of my company, all its branches, associated accounts, and business records. Submission alone will not delete data. Identity verification and final confirmation are required.',
    submit: 'Submit request',
    submitting: 'Submitting…',
    needName: 'Please enter your full name.',
    needContact: 'Please give an email address or a mobile number.',
    needCompany: 'Please enter the company name.',
    needConfirm: 'Please tick the confirmation box.',
    neutralTitle: 'Your request has been received',
    neutralBody:
      'Please keep your reference number. Submitting this form has not deleted anything — your identity must be verified and the deletion confirmed before any data is removed.',
    reference: 'Reference number',
    another: 'Submit another request',
    errorGeneric: 'We could not submit your request just now. Please try again.',
    verifyNote:
      'Identity and authorisation must be verified before anything is deleted. Holding a company name or an email address is not enough by itself.',
    notOwner:
      'Company-wide deletion is available only to the verified owner of the company. You can still request deletion of your personal account.',
  },
  bn: {
    title: 'ক্যাশবুকবিডি অ্যাকাউন্ট মুছে ফেলার অনুরোধ',
    intro:
      'আপনি ক্যাশবুকবিডির কাছে আপনার ব্যক্তিগত অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে পারেন, অথবা — আপনি যদি কোনো কোম্পানির যাচাইকৃত মালিক হন — সেই কোম্পানি এবং তার সব তথ্য মুছে ফেলার অনুরোধ করতে পারেন। এই পাতায় প্রতিটি ধাপ ব্যাখ্যা করা হলো।',
    notice:
      'আপনার অনুরোধ জমা দেওয়ার সঙ্গে সঙ্গে কোনো তথ্য মুছে যাবে না। অনুরোধ জমা দেওয়ার ১৪ দিন পর এবং পরিচয় ও মালিকানা যাচাইসহ রিভিউ সম্পন্ন হলে ডিলেট করা হবে। রিভিউয়ে বেশি সময় লাগলে ডিলেট প্রক্রিয়াও বিলম্বিত হবে। ডিলেট প্রক্রিয়া শুরু হওয়ার আগে অনুরোধ বাতিল করতে পারবেন।',
    how: 'কার্যপ্রণালী',
    steps: [
      'আপনি অনুরোধ জমা দেন। এই ধাপে কিছুই মুছে যায় না।',
      'আমরা আপনার পরিচয় ও তথ্যের উপর আপনার অধিকার যাচাই করি।',
      'সাধারণ ব্যবহারকারীর অ্যাকাউন্ট মুছে ফেললে আপনার কোম্পানি মুছে যায় না।',
      'যাচাইকৃত কোম্পানির মালিক কোম্পানি, তার সব শাখা, একান্তভাবে তার অধীন অ্যাকাউন্ট এবং ব্যবসায়িক রেকর্ড স্থায়ীভাবে মুছে ফেলার অনুরোধ করতে পারেন।',
      'সম্পূর্ণ কোম্পানি মুছে ফেলা অ্যাকাউন্টিং ও পরিচালনাগত রেকর্ড স্থায়ীভাবে মুছে দেয় এবং অ্যাপ থেকে তা ফেরানো যায় না।',
      'কোনো রেকর্ড প্রয়োজন হলে মুছে ফেলার নিশ্চিত করার আগেই তা প্রয়োজনীয় তথ্য রেখে দিন।',
    ],
    retentionTitle: 'কী সংরক্ষণ করা হয়',
    retention:
      'কী সংরক্ষণ করা হয়, কেন এবং কতদিন — এটি কেবল তখনই দেখানো হয় যখন নীতি নির্ধারিত হয়েছে। নীতি ছাড়া কোনো সংরক্ষণকাল লেখা হয় না।',
    backupsTitle: 'ব্যাকআপ',
    backups:
      'তথ্য মুছে ফেললে ব্যাকআপ থেকেও একই সময়সূচিতে তা মুছে যাবে এমন নিশ্চয়তা এই পাতা দেয় না।',
    formTitle: 'অনুরোধ জমা দিন',
    name: 'পূর্ণ নাম',
    email: 'নিবন্ধিত ইমেইল ঠিকানা',
    mobile: 'নিবন্ধিত মোবাইল নম্বর',
    company: 'কোম্পানির নাম',
    type: 'অনুরোধের ধরন',
    typePersonal: 'আমার ব্যক্তিগত ব্যবহারকারী অ্যাকাউন্ট মুছে ফেলুন',
    typeCompany: 'আমার কোম্পানি এবং সংশ্লিষ্ট সব অ্যাকাউন্ট ও ব্যবসায়িক তথ্য মুছে ফেলুন',
    reason: 'কারণ (ঐচ্ছিক)',
    confirmPersonal: 'আমি নিশ্চিত করছি যে আমি আমার ব্যক্তিগত অ্যাকাউন্ট মুছে ফেলার অনুরোধ করছি।',
    confirmCompany:
      'আমি বুঝেছি যে এই অনুরোধ আমার কোম্পানি, তার সব শাখা, সংশ্লিষ্ট অ্যাকাউন্ট এবং ব্যবসায়িক রেকর্ড স্থায়ীভাবে মুছে ফেলার বিষয়ে। শুধু জমা দিলেই তথ্য মুছে যাবে না। পরিচয় যাচাই ও চূড়ান্ত নিশ্চিতকরণ আবশ্যক।',
    submit: 'অনুরোধ জমা দিন',
    submitting: 'জমা হচ্ছে…',
    needName: 'অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।',
    needContact: 'অনুগ্রহ করে একটি ইমেইল বা মোবাইল নম্বর দিন।',
    needCompany: 'অনুগ্রহ করে কোম্পানির নাম লিখুন।',
    needConfirm: 'অনুগ্রহ করে নিশ্চিতকরণ বাক্সে টিক দিন।',
    neutralTitle: 'আপনার অনুরোধ পাওয়া গেছে',
    neutralBody:
      'আপনার রেফারেন্স নম্বরটি সংরক্ষণ করুন। এই ফর্ম জমা দিলে কিছুই মুছে যায়নি — তথ্য মুছে ফেলার আগে পরিচয় যাচাই ও নিশ্চিতকরণ প্রয়োজন।',
    reference: 'রেফারেন্স নম্বর',
    another: 'আরেকটি অনুরোধ জমা দিন',
    errorGeneric: 'এখন অনুরোধ জমা দেওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
    verifyNote:
      'কিছু মুছে ফেলার আগে পরিচয় ও অধিকার যাচাই করা হবে। শুধু কোম্পানির নাম বা ইমেইল জানা যথেষ্ট নয়।',
    notOwner:
      'কোম্পানি-ব্যাপী মুছে ফেলা কেবল কোম্পানির যাচাইকৃত মালিকের জন্য। আপনি আপনার ব্যক্তিগত অ্যাকাউন্ট মুছে ফেলার অনুরোধ করতে পারেন।',
  },
};

const AccountDeletionRequest: React.FC = () => {
  const [lang, setLang] = useState<Lang>('bn');
  const t = useMemo(() => STRINGS[lang], [lang]);

  const isSignedIn = Boolean(Cookies.get('_trio_lead_token'));

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    company_name: '',
    request_type: 'personal' as RequestType,
    reason: '',
    confirm: false,
    website: '', // honeypot
  });
  const [canRequestCompany, setCanRequestCompany] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  // Prefill from the signed-in user, and learn whether this user may ask for the
  // whole company. The frontend only decides what to SHOW; the server decides
  // what is allowed, every time.
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    httpService
      .get(API_ACCOUNT_DELETION_CONTEXT_URL)
      .then((res) => {
        if (cancelled) return;
        const d = res.data?.data?.data;
        if (!d) return;
        setForm((f) => ({
          ...f,
          full_name: d.full_name ?? f.full_name,
          email: d.email ?? f.email,
          mobile: d.mobile ?? f.mobile,
          company_name: d.company_name ?? f.company_name,
        }));
        setCanRequestCompany(Boolean(d.can_request_company_deletion));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string | null => {
    if (!form.full_name.trim()) return t.needName;
    if (!form.email.trim() && !form.mobile.trim()) return t.needContact;
    if (form.request_type === 'company' && !form.company_name.trim()) return t.needCompany;
    if (!form.confirm) return t.needConfirm;
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email || null,
        mobile: form.mobile || null,
        company_name: form.request_type === 'company' ? form.company_name : null,
        request_type: form.request_type,
        reason: form.reason || null,
        confirm: true,
        [/* honeypot field name */ 'website']: form.website,
      };

      const url = isSignedIn ? API_ACCOUNT_DELETION_SUBMIT_URL : API_ACCOUNT_DELETION_REQUEST_URL;
      const res = await httpService.post(url, payload);

      if (res.data?.success === false) {
        setError(res.data?.error?.message || res.data?.message || t.errorGeneric);
        return;
      }

      setReference(res.data?.data?.data?.reference_no ?? '—');
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        t.errorGeneric;
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const field =
    'w-full rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3.5 py-2.5 text-sm text-[rgb(var(--c-text))] outline-none focus:border-primary';

  return (
    <div className="min-h-screen bg-[rgb(var(--c-bg,255_255_255))] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex justify-end gap-2">
          {(['bn', 'en'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                lang === l
                  ? 'border-primary bg-primary text-white'
                  : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]'
              }`}
            >
              {l === 'bn' ? 'বাংলা' : 'English'}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-6 shadow-default sm:p-8">
          <h1 className="mb-3 text-2xl font-bold text-[rgb(var(--c-text))]">{t.title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-[rgb(var(--c-text))]">{t.intro}</p>

          <div className="mb-6 rounded-md border border-meta-1 bg-meta-1/10 px-4 py-3 text-sm font-medium leading-relaxed text-[rgb(var(--c-text))]">
            {t.notice}
          </div>

          <section className="mb-6">
            <h2 className="mb-2 text-base font-semibold text-[rgb(var(--c-text))]">{t.how}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[rgb(var(--c-text))]">
              {t.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>

          <section className="mb-6 space-y-3 text-sm text-[rgb(var(--c-text))]">
            <div>
              <h3 className="font-semibold">{t.retentionTitle}</h3>
              <p>{t.retention}</p>
            </div>
            <div>
              <h3 className="font-semibold">{t.backupsTitle}</h3>
              <p>{t.backups}</p>
            </div>
          </section>

          <hr className="my-6 border-[rgb(var(--c-border))]" />

          {reference ? (
            <div role="status" className="rounded-md border border-meta-3 bg-meta-3/10 p-5">
              <h2 className="mb-2 text-base font-semibold text-[rgb(var(--c-text))]">{t.neutralTitle}</h2>
              <p className="mb-3 text-sm text-[rgb(var(--c-text))]">{t.neutralBody}</p>
              <p className="text-sm text-[rgb(var(--c-text))]">
                <span className="font-medium">{t.reference}: </span>
                <span className="font-mono font-semibold">{reference}</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setReference(null);
                  setForm((f) => ({ ...f, confirm: false, reason: '' }));
                }}
                className="mt-4 rounded-md border border-[rgb(var(--c-border))] px-4 py-2 text-sm font-medium text-[rgb(var(--c-text))]"
              >
                {t.another}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="mb-4 text-base font-semibold text-[rgb(var(--c-text))]">{t.formTitle}</h2>

              {error ? (
                <div role="alert" className="mb-4 rounded-md border border-danger bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[rgb(var(--c-text))]">{t.name} *</span>
                  <input className={field} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} maxLength={150} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[rgb(var(--c-text))]">{t.email}</span>
                  <input type="email" className={field} value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={190} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[rgb(var(--c-text))]">{t.mobile}</span>
                  <input className={field} value={form.mobile} onChange={(e) => set('mobile', e.target.value)} maxLength={30} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[rgb(var(--c-text))]">{t.company}</span>
                  <input className={field} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} maxLength={150} />
                </label>
              </div>

              {/* Honeypot: hidden from people, tempting to bots. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
                aria-hidden="true"
              />

              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-medium text-[rgb(var(--c-text))]">{t.type}</legend>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 text-sm text-[rgb(var(--c-text))]">
                    <input
                      type="radio"
                      name="request_type"
                      className="mt-0.5"
                      checked={form.request_type === 'personal'}
                      onChange={() => set('request_type', 'personal')}
                    />
                    <span>{t.typePersonal}</span>
                  </label>
                  {(!isSignedIn || canRequestCompany) && (
                    <label className="flex items-start gap-2.5 text-sm text-[rgb(var(--c-text))]">
                      <input
                        type="radio"
                        name="request_type"
                        className="mt-0.5"
                        checked={form.request_type === 'company'}
                        onChange={() => set('request_type', 'company')}
                      />
                      <span>{t.typeCompany}</span>
                    </label>
                  )}
                </div>
                {isSignedIn && !canRequestCompany ? (
                  <p className="mt-2 rounded-md bg-meta-1/10 px-3 py-2 text-xs text-[rgb(var(--c-text))]">{t.notOwner}</p>
                ) : null}
              </fieldset>

              <label className="mt-5 block">
                <span className="mb-1.5 block text-sm font-medium text-[rgb(var(--c-text))]">{t.reason}</span>
                <textarea
                  className={field}
                  rows={3}
                  maxLength={2000}
                  value={form.reason}
                  onChange={(e) => set('reason', e.target.value)}
                />
              </label>

              <label className="mt-5 flex items-start gap-2.5 text-sm text-[rgb(var(--c-text))]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.confirm}
                  onChange={(e) => set('confirm', e.target.checked)}
                />
                <span>{form.request_type === 'company' ? t.confirmCompany : t.confirmPersonal}</span>
              </label>

              <p className="mt-3 text-xs text-[rgb(var(--c-text-muted))]">{t.verifyNote}</p>

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 w-full rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
              >
                {submitting ? t.submitting : t.submit}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-[rgb(var(--c-text-muted))]">
          <Link to="/login" className="hover:text-primary">
            CashBookBD
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AccountDeletionRequest;
