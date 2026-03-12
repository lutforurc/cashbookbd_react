import React, { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { FiHome, FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { clearJournalState, saveJournalPayment } from './journalSlice';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import Link from '../../../utils/others/Link';

interface FormData {
    payer_code: string;
    payer_label: string;
    receiver_code: string;
    receiver_label: string;
    amount: string;
    note: string;
}

interface FormErrors {
    payer_code?: string;
    receiver_code?: string;
    amount?: string;
}

interface AccountOption {
    value: string | number;
    label: string;
}

const initialFormData: FormData = {
    payer_code: '',
    payer_label: '',
    receiver_code: '',
    receiver_label: '',
    amount: '',
    note: '',
};

const Journal = () => {
    const dispatch = useDispatch();
    const journal = useSelector((state: any) => state.journal);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<FormErrors>({});

    const triggerSubmit = () => {
        const form = document.getElementById('journal-payment-form') as HTMLFormElement | null;
        form?.requestSubmit();
    };

    const handleAccountSelect =
        (field: 'payer_code' | 'receiver_code') => (option: AccountOption | null) => {
            const labelField = field === 'payer_code' ? 'payer_label' : 'receiver_label';
            setFormData((prev) => ({
                ...prev,
                [field]: String(option?.value || ''),
                [labelField]: option?.label || '',
            }));

            setErrors((prev) => ({
                ...prev,
                [field]: undefined,
            }));
        };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({
            ...prev,
            [name]: undefined,
        }));
    };

    const validate = () => {
        const nextErrors: FormErrors = {};
        const payerCode = String(formData.payer_code ?? '').trim();
        const receiverCode = String(formData.receiver_code ?? '').trim();
        const amountValue = String(formData.amount ?? '').trim();

        if (!payerCode) {
            nextErrors.payer_code = 'Payer account is required.';
        }

        if (!receiverCode) {
            nextErrors.receiver_code = 'Receiver account is required.';
        }

        if (!amountValue) {
            nextErrors.amount = 'Amount is required.';
        } else if (Number(amountValue) <= 0) {
            nextErrors.amount = 'Amount must be greater than 0.';
        }

        return nextErrors;
    };

    useEffect(() => {
        if (journal?.error) {
            toast.error(journal.error);
        }
    }, [journal?.error]);

    useEffect(() => {
        if (journal?.message) {
            toast.success(journal.message);
            dispatch(clearJournalState());
        }
    }, [dispatch, journal?.message]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        const payload = {
            payer_code: String(formData.payer_code ?? '').trim(),
            receiver_code: String(formData.receiver_code ?? '').trim(),
            amount: Number(formData.amount),
            note: formData.note.trim(),
        };

        console.log(payload);

        try {
            await dispatch(saveJournalPayment(payload) as any).unwrap();
            setErrors({});
            setFormData(initialFormData);
        } catch (error) {
            // toast handled from redux state
        }
    };

    return (
        <>
            <HelmetTitle title="Journal Entry" />
            <div className="mb-4 w-full px-2 md:px-0 flex justify-center">
                <form
                    id="journal-payment-form"
                    onSubmit={handleSubmit}
                    className="w-full max-w-2xl mx-auto"
                >
                    <div className="grid grid-cols-1">
                        <div className="w-full">
                            <div className="grid grid-cols-1 gap-y-2">
                                <div className="">
                                    <label htmlFor="">Select Payer Account</label>
                                    <DdlMultiline
                                        id="payer_code"
                                        name="payer_code"
                                        onSelect={handleAccountSelect('payer_code')}
                                        defaultValue={
                                            formData.payer_code
                                                ? {
                                                    value: Number(formData.payer_code),
                                                    label: formData.payer_label || formData.payer_code,
                                                }
                                                : null
                                        }
                                        value={
                                            formData.payer_code
                                                ? {
                                                    value: Number(formData.payer_code),
                                                    label: formData.payer_label || formData.payer_code,
                                                }
                                                : null
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const nextElement = document.getElementById('receiver_code');
                                                if (nextElement) {
                                                    nextElement.focus();
                                                }
                                            }
                                        }}
                                        acType={''}
                                        placeholder="Search payer account"
                                    />
                                </div>
                                {errors.payer_code ? (
                                    <p className="-mt-1 text-sm text-red-600">{errors.payer_code}</p>
                                ) : null}

                                <div className="">
                                    <label htmlFor="">Select Receiver Account</label>
                                    <DdlMultiline
                                        id="receiver_code"
                                        name="receiver_code"
                                        onSelect={handleAccountSelect('receiver_code')}
                                        defaultValue={
                                            formData.receiver_code
                                                ? {
                                                    value: Number(formData.receiver_code),
                                                    label: formData.receiver_label || formData.receiver_code,
                                                }
                                                : null
                                        }
                                        value={
                                            formData.receiver_code
                                                ? {
                                                    value: Number(formData.receiver_code),
                                                    label: formData.receiver_label || formData.receiver_code,
                                                }
                                                : null
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const nextElement = document.getElementById('amount');
                                                if (nextElement) {
                                                    nextElement.focus();
                                                }
                                            }
                                        }}
                                        acType={''}
                                        placeholder="Search receiver account"
                                    />
                                </div>
                                {errors.receiver_code ? (
                                    <p className="-mt-1 text-sm text-red-600">{errors.receiver_code}</p>
                                ) : null}
                                <InputElement
                                    id="note"
                                    name="note"
                                    value={formData.note}
                                    label="Note"
                                    placeholder="Enter note"
                                    className="py-1.5"
                                    onChange={handleChange}
                                />

                                <InputElement
                                    id="amount"
                                    name="amount"
                                    type="number"
                                    value={formData.amount}
                                    label="Amount"
                                    placeholder="Enter amount"
                                    className="py-1.5"
                                    onChange={handleChange}
                                />
                                {errors.amount ? (
                                    <p className="-mt-1 text-sm text-red-600">{errors.amount}</p>
                                ) : null}


                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2 mt-2">
                                    <ButtonLoading
                                        type="submit"
                                        onClick={triggerSubmit}
                                        disabled={journal?.loading}
                                        buttonLoading={journal?.loading}
                                        label={journal?.loading ? 'Saving...' : 'Save'}
                                        className="whitespace-nowrap text-center mr-0 h-9 w-full"
                                        icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                                    />                                    
                                    <Link to="/dashboard" className="text-nowrap justify-center mr-0 h-9 w-full">
                                        <FiHome className="text-white text-lg ml-2  mr-2" />
                                        <span className="hidden md:block">{'Home'}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
};

export default Journal;
