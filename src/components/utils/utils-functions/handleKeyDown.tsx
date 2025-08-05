// Focus Next Property Input on Enter Key Press
type HandleInputKeyDownType = (
  event: React.KeyboardEvent<HTMLElement>,
  nextElementId: string,
) => void;
export const handleInputKeyDown: HandleInputKeyDownType = (
  event,
  nextElementId,
) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Prevent default Enter behavior (e.g., form submission)
    setTimeout(() => {
      const nextElement = document.getElementById(nextElementId);
      if (nextElement instanceof HTMLElement) {
        nextElement.focus();

        // Optional: Select text if it's an input or textarea
        if (
          'select' in nextElement &&
          typeof (nextElement as HTMLInputElement).select === 'function'
        ) {
          (nextElement as HTMLInputElement).select();
        }
      }
    }, 100); // Delay to let any DOM update (like dropdown selection) happen
  }
};

// Focus Next Property Select on Enter Key Press
type HandleSelectKeyDownType = (
  event: React.KeyboardEvent<HTMLElement>,
  wrapperSelector: string,
) => void;

export const handleSelectKeyDown = (
  event: React.KeyboardEvent,
  wrapperSelector: string,
) => {
  if (event.key === 'Enter') {
    event.preventDefault();

    // Let any dropdown close or input lose focus before moving to next input
    setTimeout(() => {
      const input = document.querySelector(
        `${wrapperSelector} input`,
      ) as HTMLElement | null;

      if (input) {
        // Ensure input is focusable
        input.focus();

        // If input supports select, select the text
        if (
          'select' in input &&
          typeof (input as HTMLInputElement).select === 'function'
        ) {
          (input as HTMLInputElement).select();
        }
      } else {
        console.warn(`Input not found in selector: ${wrapperSelector}`);
      }
    }, 100);
  }
};

// export const handleSelectKeyDown: HandleSelectKeyDownType = (event, wrapperSelector) => {
//     if (event.key === 'Enter') {
//         event.preventDefault();
//         setTimeout(() => {
//             const wrapper = document.querySelector(wrapperSelector);
//             const input = wrapper?.querySelector('input');
//             if (input instanceof HTMLElement) {
//                 input.focus();

//                 if ('select' in input && typeof (input as HTMLInputElement).select === 'function') {
//                     (input as HTMLInputElement).select();
//                 }
//             }
//         }, 100); // Allow dropdown selection or other DOM updates
//     }
// };
