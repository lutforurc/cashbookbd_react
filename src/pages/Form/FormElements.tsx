import Breadcrumb from '../../components/Breadcrumbs/Breadcrumb';
import CheckboxFive from '../../components/Checkboxes/CheckboxFive';
import CheckboxFour from '../../components/Checkboxes/CheckboxFour';
import CheckboxOne from '../../components/Checkboxes/CheckboxOne';
import CheckboxThree from '../../components/Checkboxes/CheckboxThree';
import CheckboxTwo from '../../components/Checkboxes/CheckboxTwo';
import SwitcherFour from '../../components/Switchers/SwitcherFour';
import SwitcherOne from '../../components/Switchers/SwitcherOne';
import SwitcherThree from '../../components/Switchers/SwitcherThree';
import SwitcherTwo from '../../components/Switchers/SwitcherTwo';
import DatePickerOne from '../../components/Forms/DatePicker/DatePickerOne';
import DatePickerTwo from '../../components/Forms/DatePicker/DatePickerTwo';
import SelectGroupTwo from '../../components/Forms/SelectGroup/SelectGroupTwo';
import MultiSelect from '../../components/Forms/MultiSelect';
import { FIELD_BASE, FIELD_TEXTAREA } from '../../theme/fieldStyles';
import { Input, Textarea } from '../../components/utils/fields/FormControls';

const FormElements = () => {
  return (
    <>
      <Breadcrumb pageName="Form Elements" />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-2">
        <div className="flex flex-col gap-9">
          {/* <!-- Input Fields --> */}
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
            <div className="border-b border-[rgb(var(--c-border))] py-4 px-6.5">
              <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Input Fields
              </h3>
            </div>
            <div className="flex flex-col gap-5.5 p-6.5">
              <div>
                <label className="mb-3 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Default Input
                </label>
                <Input
                  type="text"
                  placeholder="Default Input"
                  className={`${FIELD_BASE} w-full py-3 px-5`}
                />
              </div>

              <div>
                <label className="mb-3 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Active Input
                </label>
                <Input
                  type="text"
                  placeholder="Active Input"
                  className={`${FIELD_BASE} w-full py-3 px-5`}
                />
              </div>

              <div>
                <label className="mb-3 block font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Disabled label
                </label>
                <Input
                  type="text"
                  placeholder="Disabled label"
                  disabled
                  className={`${FIELD_BASE} w-full py-3 px-5`}
                />
              </div>
            </div>
          </div>

          {/* <!-- Toggle switch input --> */}
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
            <div className="border-b border-[rgb(var(--c-border))] py-4 px-6.5">
              <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Toggle switch input
              </h3>
            </div>
            <div className="flex flex-col gap-5.5 p-6.5">
              <SwitcherOne />
              <SwitcherTwo />
              <SwitcherThree />
              <SwitcherFour />
            </div>
          </div>

          {/* <!-- Time and date --> */}
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
            <div className="border-b border-[rgb(var(--c-border))] py-4 px-6.5">
              <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Time and date
              </h3>
            </div>
            <div className="flex flex-col gap-5.5 p-6.5">
              <DatePickerOne />
              <DatePickerTwo />
            </div>
          </div>

          {/* <!-- File upload --> */}
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
            <div className="border-b border-[rgb(var(--c-border))] py-4 px-6.5">
              <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                File upload
              </h3>
            </div>
            <div className="flex flex-col gap-5.5 p-6.5">
              <div>
                <label className="mb-3 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Attach file
                </label>
                <Input
 type="file"
 className="w-full cursor-pointer border-[1.5px] border-[rgb(var(--c-border))] bg-transparent outline-none transition file:mr-5 file:border-collapse file:cursor-pointer file:border-0 file:border-r file:border-solid file:border-stroke file:bg-whiter file:py-3 file:px-5 file:hover:bg-primary/10 focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:bg-form-input dark:file:border-form-strokedark dark:file:bg-white/30 dark:file:text-white dark:focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-3 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Attach file
                </label>
                <Input
 type="file"
 className="w-full border border-[rgb(var(--c-border))] p-3 outline-none transition file:mr-4 file: file:border-[0.5px] file:border-stroke file:bg-[rgb(var(--c-gray-100))] file:py-1 file:px-2.5 file:text-sm focus:border-primary file:focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:bg-form-input dark:file:border-strokedark dark:file:bg-white/30 dark:file:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-9">
          {/* <!-- Textarea Fields --> */}
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
            <div className="border-b border-[rgb(var(--c-border))] py-4 px-6.5">
              <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Textarea Fields
              </h3>
            </div>
            <div className="flex flex-col gap-5.5 p-6.5">
              <div>
                <label className="mb-3 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Default textarea
                </label>
                <Textarea
                  rows={6}
                  placeholder="Default textarea"
                  className={`${FIELD_TEXTAREA} w-full py-3 px-5`}
                ></Textarea>
              </div>

              <div>
                <label className="mb-3 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Active textarea
                </label>
                <Textarea
                  rows={6}
                  placeholder="Active textarea"
                  className={`${FIELD_TEXTAREA} w-full py-3 px-5`}
                ></Textarea>
              </div>

              <div>
                <label className="mb-3 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Disabled textarea
                </label>
                <Textarea
                  rows={6}
                  disabled
                  placeholder="Disabled textarea"
                  className={`${FIELD_TEXTAREA} w-full py-3 px-5`}
                ></Textarea>
              </div>
            </div>
          </div>

          {/* <!-- Checkbox and radio --> */}
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
            <div className="border-b border-[rgb(var(--c-border))] py-4 px-6.5">
              <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Checkbox and radio
              </h3>
            </div>
            <div className="flex flex-col gap-5.5 p-6.5">
              <CheckboxOne />
              <CheckboxTwo />
              <CheckboxThree />
              <CheckboxFour />
              <CheckboxFive />
            </div>
          </div>

          {/* <!-- Select input --> */}
          <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
            <div className="border-b border-[rgb(var(--c-border))] py-4 px-6.5">
              <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Select input
              </h3>
            </div>
            <div className="flex flex-col gap-5.5 p-6.5">
              <SelectGroupTwo />
              <MultiSelect id="multiSelect" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FormElements;
