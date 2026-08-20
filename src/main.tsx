import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// First, so every colour the sheets below reach for is already defined.
import './theme/tokens.css';
import './css/style.css';
import './css/satoshi.css';
import 'jsvectormap/dist/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';
import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';
import { useIsDarkMode } from './theme/userTheme';


/**
 * The messages in the corner, in the mode the page is in.
 *
 * react-toastify picks its palette from `theme`, and it was never told -- so it
 * used its light one always, which style.css had painted dark. The class on
 * <html> is the app's own record of the mode, and it is watched rather than
 * read once: the switch in the header changes it mid-session.
 */
const Toasts = () => (
  <ToastContainer
    position="bottom-right"
    autoClose={1500}
    hideProgressBar={false}
    newestOnTop={false}
    closeOnClick
    rtl={false}
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme={useIsDarkMode() ? 'dark' : 'light'}
  />
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
 


    <Provider store={store}>
      <Toasts />

      <App />
    </Provider>

);
