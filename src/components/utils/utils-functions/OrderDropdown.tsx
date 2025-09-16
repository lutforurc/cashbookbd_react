// Second Final Element
import React from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getDdlOrders } from '../../modules/orders/ordersSlice';
import {formatDate} from './formatDate';

interface OptionType {
    value: string;
    label: string;
    label_2?: string;
    label_3?: string;
    label_4?: string;
    label_5?: string;
    label_6?: string;
}

interface DropdownProps {
    id?: string;
    name?: string;
    onSelect: (selected: OptionType | null) => void;
    heightPx?: string;
    defaultValue?: { value: any, label: any } | null
    value: { value: any, label: any } | null
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void; // Optional onKeyDown prop
}

const OrderDropdown: React.FC<DropdownProps> = ({ onSelect, heightPx, defaultValue, value, id, name, onKeyDown }) => {
    const [isSelected, setIsSelected] = React.useState(false);
    const dispatch = useDispatch();

    const loadOptions = async (inputValue: string, callback: (options: OptionType[]) => void) => {
        if (inputValue.length >= 3) {
            try {
                // Dispatch the action and wait for the fetched data
                const response: any = await dispatch(getDdlOrders(inputValue));
                // Check and format the fetched data
                if (Array.isArray(response.payload)) {
                    const formattedOptions: OptionType[] = response.payload.map((item: any) => ({
                        value: item.value,
                        label: item.label,
                        label_2: item.label_2,
                        label_3: item.label_3,
                        label_4: item.label_4,
                        label_5: item.label_5,
                        label_6: item.label_6,
                    }));
                    callback(formattedOptions);
                } else {
                    callback([]); // Clear options if data is invalid
                }
            } catch (error) {
                console.error('Error loading options:', error);
                callback([]); // Clear options in case of an error
            }
        } else {
            callback([]); // Clear options if inputValue has less than 3 characters
        }
    };


    return (
        <div className="dark:bg-black focus:border-blue-500 ">
            <AsyncSelect<OptionType>
                id={id}
                name={name}
                className="cash-react-select-container w-full dark:bg-black focus:border-blue-500 "
                classNamePrefix="cash-react-select"
                loadOptions={loadOptions}
                onChange={onSelect} // Handle change in selection
                onMenuOpen={() => setIsSelected(true)}
                onMenuClose={() => setIsSelected(false)}
                onKeyDown={onKeyDown} // Pass it to the input
                getOptionLabel={(option) => {
                    return option.label
                }} // Show only primary label in selected input
                formatOptionLabel={(option) => {
                    return (
                        <div>
                            <div className="text-sm text-gray-900  dark:text-white focus:border-blue-500">
                                {option.label}
                            </div>
                            {isSelected && (
                                <div className='additional-info'>
                                    {option.label_2 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Name : {option.label_2}</div>
                                    )}
                                    {option.label_3 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Product: {option.label_3}</div>
                                    )}
                                    {option.label_4 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Order Date: {formatDate(option.label_4)}</div>
                                    )}
                                    {option.label_5 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Order Rate: {option.label_5}</div>
                                    )}
                                    {option.label_6 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Last Date: {formatDate(option.label_6)}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }}
                getOptionValue={(option) => option.value}

                placeholder="Select Order"
                styles={{
                    control: (base) => ({
                        ...base,
                        borderRadius: '0.0rem',
                        borderColor: 'blue',
                        height: heightPx,
                        minHeight: heightPx,
                    }),
                    option: (base) => ({
                        ...base,
                        whiteSpace: 'normal',
                        borderColor: 'blue',
                    }),
                    menu: (base) => ({
                        ...base,
                        zIndex: 1000,
                        borderColor: '#000',
                    }),
                }}
                defaultValue={defaultValue}
                value={value}
            />
        </div>
    );
};

export default OrderDropdown;