import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './css/style.css';
import './css/satoshi.css';
import 'jsvectormap/dist/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';
import { Provider } from 'react-redux';
import store from './store';
import { ToastContainer } from 'react-toastify';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
 


    <Provider store={store}>
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
      // toastClassName={() =>
      //   themeMode == 'dark'
      //     ? 'bg-gray-800 text-white'
      //     : 'bg-white text-black'
      // }

      />

      <App />
    </Provider>

);
