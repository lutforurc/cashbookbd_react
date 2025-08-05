import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCoal4Ddl } from '../../../modules/extrasliders/coal4Sliders';

interface DropAccountsProps {
    setSelectValue: (value: any) => void;
    account: React.RefObject<HTMLInputElement>;
    secondLine?: string;
    thirdLine?: string;
}

const DropAccounts: React.FC<DropAccountsProps> = ({ setSelectValue, account, secondLine, thirdLine }) => {
    const searchInput = useRef<HTMLInputElement>(null);
    const dispatch = useDispatch();
    const [searchText, setSearchText] = useState('');
    const [selectedItem, setSelectedItem] = useState<any>({});
    const [isShow, setIsShow] = useState(false);
    const { data } = useSelector((state: any) => state.ddlCoal4ListReducer);

    const handleShow = (shown: boolean) => setIsShow(shown);

    const handleClearSelection = () => {
        setSelectedItem({});
        setTimeout(() => searchInput.current?.focus(), 10);
    };

    const handleSelection = (item: any) => {
        setSelectedItem(item);
        setSelectValue(item);
        handleShow(false);
        setTimeout(() => {
            const input = document.getElementById('id-chart-of-accounts') as HTMLInputElement;
            input.value = item.id;
        }, 10);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value);
        if (value.length >= 3) {
            dispatch(getCoal4Ddl(value));
        }
    };

    useEffect(() => {
        if (searchText.length > 2) {
            dispatch(getCoal4Ddl(searchText));
        }
    }, [searchText, dispatch]);

    return (
        <div className="relative w-full max-w-md">
            <input type="hidden" ref={account} id="id-chart-of-accounts" value={selectedItem.name || ''} name="account" />

            <div
                className="flex items-center p-2 border border-gray-300 rounded-lg cursor-pointer"
                onClick={() => handleShow(!isShow)}
            >
                {Object.keys(selectedItem).length > 0 ? (
                    <div className="w-full text-gray-700" onClick={handleClearSelection}>
                        {selectedItem.name}
                    </div>
                ) : (
                    <input
                        type="text"
                        ref={searchInput}
                        onChange={handleSearchChange}
                        placeholder="Search Account"
                        className="w-full p-1 text-gray-700 placeholder-gray-400 bg-transparent focus:outline-none"
                        onFocus={() => handleShow(true)}
                    />
                )}
                <i className={`fa fa-caret-${isShow ? 'up' : 'down'} ml-2 text-gray-400`}></i>
            </div>

            {isShow && (
                <div className="absolute z-10 w-full mt-1 overflow-auto bg-white border border-gray-300 rounded-lg max-h-60">
                    <ul className="py-1">
                        {data && data.length > 0 ? (
                            data.map((item: any) => (
                                <li
                                    key={item.id}
                                    onClick={() => handleSelection(item)}
                                    className="flex items-center p-2 cursor-pointer hover:bg-gray-100"
                                >
                                    <div className="flex items-center space-x-2">
                                        <i className="icon ni ni-offer text-gray-500"></i>
                                        <div>
                                            <span className="block font-medium text-gray-700">{item.name}</span>
                                            {secondLine && <span className="text-xs text-gray-500">{item[secondLine]}</span>}
                                            {thirdLine && <span className="text-xs text-gray-500">{item[thirdLine]}</span>}
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="flex items-center p-2 cursor-pointer hover:bg-gray-100" onClick={() => handleShow(false)}>
                                <i className="icon ni ni-offer text-gray-500"></i>
                                <span className="ml-2 text-gray-700">No data found</span>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DropAccounts;