import React, { useEffect, useState } from 'react'
import HelmetTitle from '../../utils/others/HelmetTitle' 
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiHome, FiSave } from 'react-icons/fi';
import Link from '../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';
import { storeDayClose } from './daycloseSlice';
import { toast } from 'react-toastify';
import { addDayInDate } from '../../utils/utils-functions/addDayInDate';
import { getSettings } from '../settings/settingsSlice';
import { FaArrowLeft } from "react-icons/fa6"; 
import { useNavigate } from 'react-router-dom';
import InputDatePicker from '../../utils/fields/DatePicker';
import { formatDateBdToUsd } from '../../utils/utils-functions/formatDate'; 

interface Props {
    transaction_date: string;
    day: number;
}

const JumpDate = () => {
    const settings = useSelector((s: any) => s.settings);
    const dayclose = useSelector((state: any) => state.dayclose);
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState<string>('');
    const [nextDate, setNextDate] = useState<string>('');
    const dispatch = useDispatch();
    const [startDate, setStartDate] = useState<Date | null>(null);
      const [saveButtonLoading, setSaveButtonLoading] = useState(false);
    const [formData, setFormData] = useState({
        current_date: "",
        next_date: "",
    });

    useEffect(() => {
        if (currentDate) {
          setStartDate( formatDateBdToUsd (currentDate) );
        }
      }, [currentDate]);

    const handleOnChange = (e: any) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    }

    useEffect(() => {
        setFormData({
            current_date: startDate ? startDate.toISOString().split('T')[0] : '',
            next_date: startDate ? startDate.toISOString().split('T')[0] : '',
        });
    }, [startDate]);


    // Update localStorage when settings change
    useEffect(() => {
        if (settings?.data?.trx_dt) {
            setFormData({
                current_date: settings?.data?.trx_dt,
                next_date: addDayInDate(settings?.data?.trx_dt, 1)
            });
            setCurrentDate(settings.data.trx_dt);
            setNextDate(settings.data.trx_dt);
            setNextDate(addDayInDate(settings.data.trx_dt, 1));
        }
        dispatch(getSettings());
    }, [settings.data.trx_dt, dayclose?.data?.trx_date]);

    // Listen for changes in other tabs
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'settings_updated') {
                dispatch(getSettings());
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [dispatch]);




    const handleSave = async () => {
        setSaveButtonLoading(true);
        await dispatch(storeDayClose(formData, function (message) {
            toast.success(`${message} has been saved.`);
        }));

        setTimeout(() => {
            setSaveButtonLoading(false);
        }, 1000);
    }
    const handleStartDate = (e: any) => {
        setStartDate(e);
    };
 
    const buttonLoading = true;
    return (
        <>
            <HelmetTitle title="Jump Date" />
            <div className="grid grid-cols-1 gap-2 w-2/3 md:w-2/3 lg:w-1/3 justify-center mx-auto mt-5 ">
          
            <div className='w-full mb-1'>
                <InputDatePicker 
                    id="jump_date"
                    name="jump_date" 
                    label={'Current Date (Transaction Date)'}
                    setCurrentDate={handleStartDate}
                    className="font-medium text-sm w-full h-8"
                    selectedDate={startDate}
                    setSelectedDate={setStartDate}
                />
            </div>
               
                <div className={`grid grid-cols-1 gap-1 md:grid-cols-3`}>
                    <ButtonLoading
                        onClick={handleSave}
                        buttonLoading={saveButtonLoading}
                        label="Update"
                        className="whitespace-nowrap text-center mr-0 h-8"
                        icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
                        disabled={saveButtonLoading}
                    />
                   

                     <Link to="/admin/dayclose" className="text-nowrap justify-center mr-0 h-8">
                        <FaArrowLeft className="text-white text-lg ml-2  mr-2" />
                        <span className='hidden md:block'>{'Back'}</span>
                    </Link>
                     <Link to="/dashboard" className="text-nowrap justify-center mr-0 h-8">
                        <FiHome className="text-white text-lg ml-2  mr-2" />
                        <span className='hidden md:block'>{'Home'}</span>
                    </Link>
                </div>
            </div>
        </>
    )
}

export default JumpDate