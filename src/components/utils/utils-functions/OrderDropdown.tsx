// Second Final Element
import React from 'react';
import { useDispatch } from 'react-redux';
import AsyncSelect from 'react-select/async';
import { getDdlOrders } from '../../modules/orders/ordersSlice';
import {formatDate} from './formatDate';
import thousandSeparator from './thousandSeparator';

interface OptionType {
    value: string;
    label: string;
    label_2?: string;
    label_3?: string;
    label_4?: string;
    label_5?: string;
    label_6?: string;
    label_7?: string;
    label_8?: string | number;
    label_9?: string;
    order_type?: string;
    [key: string]: any;
}

const toNumber = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getRemainingQty = (option: OptionType) => {
    const orderQty =
        toNumber(option.order_qty) ??
        toNumber(option.total_order) ??
        toNumber(option.quantity) ??
        toNumber(option.label_7);

    const trxQty =
        toNumber(option.trx_quantity) ??
        toNumber(option.delivery_qty) ??
        toNumber(option.linked_quantity) ??
        toNumber(option.base_qty);

    if (orderQty !== null && trxQty !== null) {
        return orderQty - trxQty;
    }

    return toNumber(option.remaining_qty) ?? toNumber(option.remaining_quantity) ?? toNumber(option.label_8);
};

interface DropdownProps {
    id?: string;
    name?: string;
    onSelect: (selected: OptionType | null) => void;
    heightPx?: string;
    defaultValue?: { value: any, label: any } | null
    value: { value: any, label: any } | null
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void; // Optional onKeyDown prop
    orderType?: string;
    excludeId?: string | number;
    refDirection?: 'reference' | 'linked';
    isDisabled?: boolean;
    focusTrigger?: number;
}

const OrderDropdown: React.FC<DropdownProps> = ({
    onSelect,
    heightPx,
    defaultValue,
    value,
    id,
    name,
    onKeyDown,
    orderType,
    excludeId,
    refDirection,
    isDisabled,
    focusTrigger,
}) => {
    const [isSelected, setIsSelected] = React.useState(false);
    const [loadedOptions, setLoadedOptions] = React.useState<OptionType[]>([]);
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const dispatch = useDispatch();
    const selectRef = React.useRef<any>(null);
    const isDarkMode =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');

    React.useEffect(() => {
        if (!focusTrigger || isDisabled) {
            return;
        }

        window.setTimeout(() => {
            selectRef.current?.focus?.();
        }, 0);
    }, [focusTrigger, isDisabled]);

    const loadOptions = async (inputValue: string, callback: (options: OptionType[]) => void) => {
        if (inputValue.length >= 3) {
            try {
                // Dispatch the action and wait for the fetched data
                const response: any = await dispatch(
                    getDdlOrders(inputValue, {
                        orderType,
                        excludeId,
                        refDirection,
                    }),
                );
                // Check and format the fetched data
                if (Array.isArray(response.payload)) {
                    const hasOrderTypeInPayload = response.payload.some(
                        (item: any) => item?.order_type !== undefined && item?.order_type !== null,
                    );

                    const filteredPayload = orderType && hasOrderTypeInPayload
                        ? response.payload.filter((item: any) => String(item.order_type) === String(orderType))
                        : response.payload;

                    const formattedOptions: OptionType[] = filteredPayload.map((item: any) => ({
                        value: item.value,
                        label: item.label,
                        label_2: item.label_2,
                        label_3: item.label_3,
                        label_4: item.label_4,
                        label_5: item.label_5,
                        label_6: item.label_6,
                        label_7: item.label_7,
                        label_8: item.label_8,
                        label_9: item.label_9,
                        order_type: item.order_type,
                        ...item,
                    }));
                    setLoadedOptions(formattedOptions);
                    callback(formattedOptions);
                } else {
                    setLoadedOptions([]);
                    callback([]); // Clear options if data is invalid
                }
            } catch (error) {
                console.error('Error loading options:', error);
                setLoadedOptions([]);
                callback([]); // Clear options in case of an error
            }
        } else {
            setLoadedOptions([]);
            callback([]); // Clear options if inputValue has less than 3 characters
        }
    };

    const handleKeyDownInternal = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && isMenuOpen && loadedOptions.length > 0) {
            event.preventDefault();

            const focusedOption = selectRef.current?.state?.focusedOption as OptionType | undefined;
            const optionToSelect = focusedOption ?? loadedOptions[0];

            if (optionToSelect) {
                onSelect(optionToSelect);
                setIsSelected(false);
                setIsMenuOpen(false);
                selectRef.current?.blur?.();

                window.setTimeout(() => {
                    onKeyDown?.(event);
                }, 0);
                return;
            }
        }

        onKeyDown?.(event);
    };


    return (
        <div className="dark:bg-black focus:border-blue-500 ">
            <AsyncSelect<OptionType>
                ref={selectRef}
                id={id}
                inputId={id}
                name={name}
                className="cash-react-select-container w-full dark:bg-black focus:border-blue-500 "
                classNamePrefix="cash-react-select"
                loadOptions={loadOptions}
                onChange={onSelect} // Handle change in selection
                onMenuOpen={() => {
                    setIsSelected(true);
                    setIsMenuOpen(true);
                }}
                onMenuClose={() => {
                    setIsSelected(false);
                    setIsMenuOpen(false);
                }}
                onKeyDown={handleKeyDownInternal}
                openMenuOnFocus
                isDisabled={isDisabled}
                isClearable={!isDisabled}
                escapeClearsValue
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
                                        <div className="text-gray-600 dark:text-white text-sm">Order Date: {option.label_4}</div>
                                    )}
                                    {option.label_5 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Order Rate: {option.label_5}</div>
                                    )}
                                    {/* {option.label_6 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Last Date: {option.label_6}</div>
                                    )} */}
                                    {option.label_7 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Order Qty: { thousandSeparator( Number(option.label_7), 0) }</div>
                                    )}
                                    {getRemainingQty(option) !== null && (
                                        <div className="text-gray-600 dark:text-white text-sm">
                                            Remaining Qty: { thousandSeparator( Number( getRemainingQty(option)),0 ) }
                                        </div>
                                    )}
                                    {option.label_9 && (
                                        <div className="text-gray-600 dark:text-white text-sm">Note: {option.label_9}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }}
                getOptionValue={(option) => option.value}

                placeholder={isDisabled ? "Select Order Type First" : "Select Order"}
                styles={{
                    control: (base) => ({
                        ...base,
                        borderRadius: '0.0rem',
                        borderColor: 'blue',
                        height: heightPx,
                        minHeight: heightPx,
                    }),
                    option: (base, state) => ({
                        ...base,
                        whiteSpace: 'normal',
                        borderColor: 'blue',
                        backgroundColor: state.isSelected
                            ? (isDarkMode ? '#1d4ed8' : '#2563eb')
                            : state.isFocused
                                ? (isDarkMode ? '#334155' : '#dbeafe')
                                : (isDarkMode ? '#374151' : '#f3f4f6'),
                        color: state.isSelected
                            ? '#ffffff'
                            : (isDarkMode ? '#f3f4f6' : '#0f172a'),
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
