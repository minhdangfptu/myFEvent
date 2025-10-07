import * as React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CssBaseline, CssVarsProvider, ThemeProvider } from '@mui/material';
import theme from './theme';
import HomePage from './pages/Normal/HomePage';   
import ErrorPage404 from './pages/Errors/ErrorPage404'; 
import ErrorPage403 from './pages/Errors/ErrorPage403';
import ErrorPage401 from './pages/Errors/ErrorPage401';
import ErrorPage502 from './pages/Errors/ErrorPage502';
import ErrorPageOffline from './pages/Errors/ErrorPageOffline';

export default function App() {
  return (
    <CssVarsProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={< ErrorPage404 />} /> 
          <Route path="/403" element={< ErrorPage403 />} /> 
          <Route path="/401" element={< ErrorPage401/>} /> 
          <Route path="/502" element={< ErrorPage502/>} /> 
          <Route path="/502" element={< ErrorPage502/>} /> 
          <Route path="/off" element={< ErrorPageOffline/>} /> 
        </Routes>
      </BrowserRouter>
    </CssVarsProvider>
  );
}
