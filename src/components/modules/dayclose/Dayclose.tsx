import React, { useEffect, useState } from 'react'
import HelmetTitle from '../../utils/others/HelmetTitle'
import InputElement from '../../utils/fields/InputElement'
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiHome, FiSave } from 'react-icons/fi';
import Link from '../../utils/others/Link';
import { useDispatch, useSelector } from 'react-redux';
import { storeDayClose } from './daycloseSlice';
import { toast } from 'react-toastify';
import { addDayInDate } from '../../utils/utils-functions/addDayInDate';
import { getSettings } from '../settings/settingsSlice';
import { FaPersonSkating } from "react-icons/fa6";
import { hasPermission } from '../../utils/permissionChecker';
import { useNavigate } from 'react-router-dom';
import { setTime } from 'react-datepicker/dist/date_utils';

interface Props {
    transaction_date: string;
    day: number;
}

const Dayclose = () => {
    const settings = useSelector((s: any) => s.settings);
    const dayclose = useSelector((state: any) => state.dayclose);
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState<string>('');
    const [nextDate, setNextDate] = useState<string>('');
    const dispatch = useDispatch();
      const [saveButtonLoading, setSaveButtonLoading] = useState(false);
      const [jumpDateButtonLoading, setJumpDateButtonLoading] = useState(false);
    const [formData, setFormData] = useState({
        current_date: "",
        next_date: "",
    });

    const handleOnChange = (e: any) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    }

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

    // Update localStorage when settings change
    useEffect(() => {
        if (settings.data.trx_dt) {
            localStorage.setItem('settings_updated', Date.now().toString());
        }
    }, [settings.data.trx_dt]);

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

    const handleJumpDate = () => {
        navigate('/admin/jumpdate', { state: { current_date: formData.current_date, next_date: formData.next_date } });
    }

    const handleSave = async () => {
        setSaveButtonLoading(true);
        await dispatch(storeDayClose(formData, function (message) {
            toast.success(`${message} has been saved.`);
        }));
        setTimeout(() => {
            setSaveButtonLoading(false);
        }, 1000);
    }
 
    const buttonLoading = true;
    return (
        <>
            <HelmetTitle title="Day Close" />
            <div className="grid grid-cols-1 gap-2 w-full md:w-2/3 lg:w-1/2 justify-center mx-auto mt-5 "> 
                <InputElement
                    id="current_date"
                    value={currentDate}
                    name="current_date"
                    placeholder={'Current Date (Transaction Date)'}
                    label={'Current Date (Transaction Date)'}
                    className={'mb-2'}
                    onChange={handleOnChange}
                />
                <InputElement
                    id="current_date"
                    value={nextDate}
                    name="current_date"
                    placeholder={'Next Date (Upcoming Transaction Date)'}
                    label={'Next Date (Upcoming Transaction Date)'}
                    className={'mb-2'}
                    onChange={handleOnChange}
                />

                <div className={`grid grid-cols-1 gap-x-1 gap-y-1 ${hasPermission(settings.data.permissions, 'dayclose.jumpdate') ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    <ButtonLoading
                        onClick={handleSave}
                        buttonLoading={saveButtonLoading}
                        label="Update"
                        className="whitespace-nowrap text-center mr-0 h-8"
                        icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
                        disabled={saveButtonLoading}
                    />
                    
                    {hasPermission(settings.data.permissions, 'dayclose.jumpdate') && (
                        <ButtonLoading
                        onClick={handleJumpDate}
                        buttonLoading={jumpDateButtonLoading}
                        label="Jump Date"
                        className="whitespace-nowrap text-center mr-0 h-8"
                        icon={<FaPersonSkating className="text-white text-lg ml-2 mr-2" />}
                    /> 
                    )}
                    <Link to="/dashboard" className="text-nowrap justify-center mr-0 h-8">
                        <FiHome className="text-white text-lg ml-2  mr-2" />
                        <span className='hidden md:block'>{'Home'}</span>
                    </Link>
                    
                </div>
            </div>
        </>
    )
}

export default Dayclose