import React, { useEffect, useRef } from 'react';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  numInputs: number;
  renderInput: (props: React.InputHTMLAttributes<HTMLInputElement>, index: number) => React.ReactNode;
};

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, numInputs, renderInput }) => {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const normalizedValue = value.slice(0, numInputs).padEnd(numInputs, ' ');

  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, numInputs);
  }, [numInputs]);

  const focusInput = (index: number) => {
    const target = inputsRef.current[index];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const updateValueAt = (index: number, nextChar: string) => {
    const chars = normalizedValue.split('');
    chars[index] = nextChar;
    onChange(chars.join('').replace(/\s/g, ''));
  };

  const handleChange = (index: number, nextValue: string) => {
    const digit = nextValue.replace(/\D/g, '').slice(-1);
    updateValueAt(index, digit);

    if (digit && index < numInputs - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();

      if (normalizedValue[index]?.trim()) {
        updateValueAt(index, '');
        return;
      }

      if (index > 0) {
        updateValueAt(index - 1, '');
        focusInput(index - 1);
      }
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === 'ArrowRight' && index < numInputs - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, numInputs);
    if (!pasted) return;
    onChange(pasted);
    focusInput(Math.min(pasted.length, numInputs) - 1);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {Array.from({ length: numInputs }, (_, index) => {
        const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
          value: normalizedValue[index] === ' ' ? '' : normalizedValue[index],
          onChange: (event) => handleChange(index, event.target.value),
          onKeyDown: (event) => handleKeyDown(index, event),
          onPaste: handlePaste,
          onFocus: (event) => event.target.select(),
          inputMode: 'numeric',
          autoComplete: index === 0 ? 'one-time-code' : 'off',
          maxLength: 1,
          ref: (element) => {
            inputsRef.current[index] = element;
          },
        };

        return <React.Fragment key={index}>{renderInput(inputProps, index)}</React.Fragment>;
      })}
    </div>
  );
};

export default OtpInput;
