// src/theme.js
import { extendTheme } from '@mui/material/styles';

/* ========= Layout constants ========= */
const APP_BAR_HEIGHT = '58px';
const BOARD_BAR_HEIGHT = '60px';
const BOARD_CONTENT_HEIGHT = `calc(100vh - ${APP_BAR_HEIGHT} - ${BOARD_BAR_HEIGHT})`;
const COLUMN_HEADER_HEIGHT = '50px';
const COLUMN_FOOTER_HEIGHT = '50px';

/* ========= Color system ========= */
const gray = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#0F172A',
};

const brand = {
  red:  { 400: '#F51717', 200: '#FF6E6E', 100: '#FFC0C2', 50: '#FFEDEE' },
  blue: { 400: '#3882F6', 300: '#9DC3FD', 100: '#DBEAFF', 50: '#EFF6FF' },
  success: '#16A34A',
  warning: '#F59E0B',
  error:   '#F97316',
  info:    '#885CF6',
};

/* ========= Theme config ========= */
const theme = extendTheme({
  trelloCustom: {
    appBarHeight: APP_BAR_HEIGHT,
    boardBarHeight: BOARD_BAR_HEIGHT,
    boardContentHeight: BOARD_CONTENT_HEIGHT,
    columnHeaderHeight: COLUMN_HEADER_HEIGHT,
    columnFooterHeight: COLUMN_FOOTER_HEIGHT,
  },

  typography: {
    fontFamily: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    h0: { fontSize: '90px', fontWeight: 700, lineHeight: 1.2 }, // Custom variant
    h1: { fontSize: '24px', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: '20px', fontWeight: 600, lineHeight: 1.3 },
    h3: { fontSize: '18px', fontWeight: 600, lineHeight: 1.35 },
    body1: { fontSize: '16px', fontWeight: 400, lineHeight: 1.55 },
    body2: { fontSize: '14px', fontWeight: 400, lineHeight: 1.55 },
    caption: { fontSize: '12px', fontWeight: 400, lineHeight: 1.4 },
    button: { fontSize: '14px', fontWeight: 600 },
  },

  spacing: (factor) => {
    const scale = [0, 4, 8, 12, 16, 24, 32, 40, 64];
    return `${scale[factor] ?? factor}px`;
  },

  shape: { borderRadius: 12 },

  colorSchemes: {
    light: {
      palette: {
        mode: 'light',
        primary: {
          main: brand.red[400],
          light: brand.red[200],
          dark: '#C81010',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: brand.blue[400],
          light: brand.blue[300],
          dark: '#1F4AA9',
          contrastText: '#FFFFFF',
        },
        success: { main: brand.success },
        warning: { main: brand.warning },
        error:   { main: brand.error },
        info:    { main: brand.info },
        grey: gray,
        background: {
          default: gray[50],
          paper: gray[100],
        },
        divider: gray[300],
        text: {
          primary: '#111827',
          secondary: gray[600],
        },
      },
    },

    dark: {
      palette: {
        mode: 'dark',
        primary: {
          main: brand.red[400],
          light: brand.red[200],
          dark: '#BE0C0C',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: brand.blue[400],
          light: brand.blue[300],
          dark: '#1F4AA9',
          contrastText: '#FFFFFF',
        },
        success: { main: brand.success },
        warning: { main: brand.warning },
        error:   { main: brand.error },
        info:    { main: brand.info },
        grey: gray,
        background: {
          default: gray[900],
          paper: gray[800],
        },
        divider: gray[700],
        text: {
          primary: gray[50],
          secondary: gray[400],
        },
      },
    },
  },

  components: {
    /* --- Scrollbar --- */
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '*::-webkit-scrollbar': { width: '8px', height: '8px' },
          '*::-webkit-scrollbar-thumb': { backgroundColor: '#dcdde1', borderRadius: '4px' },
          '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#c1c2c3' },
        },
      },
    },

    /* --- Button --- */
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '6px 16px',
          fontWeight: 600,
          borderRadius: 6,
          '&:hover': { opacity: 0.9 },
        },
        containedPrimary: {
          backgroundColor: brand.red[400],
          '&:hover': { backgroundColor: '#BE0C0C' },
        },
        containedSecondary: {
          backgroundColor: brand.blue[400],
          '&:hover': { backgroundColor: '#1F4AA9' },
        },
        text: {
          color: 'var(--mui-palette-primary-main)',
          textDecoration: 'underline',
          textUnderlineOffset: '6px',
          '&:hover': {
            color: 'var(--mui-palette-primary-main)',
            fontWeight: 800,
            backgroundColor: 'transparent',
            textDecorationThickness: '3px',
          },
        },
      },
    },

    /* --- Chip --- */
    MuiChip: {
      styleOverrides: {
        root: { fontSize: '12px', fontWeight: 500, borderRadius: 8, paddingInline: 4 },
      },
    },

    /* --- Input --- */
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontSize: '14px',
          '& fieldset': { borderWidth: '0.5px !important' },
          '&:hover fieldset': { borderWidth: '2px !important' },
          '&.Mui-focused fieldset': { borderWidth: '2px !important' },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '14px' } } },

    /* --- Typography --- */
    MuiTypography: {
      variants: [
        { props: { variant: 'h0' }, style: { fontSize: '90px', fontWeight: 700, lineHeight: 1.2 } },
      ],
      styleOverrides: {
        root: {
          '&.MuiTypography-body1': { fontSize: '16px' },
          '&.MuiTypography-body2': { fontSize: '14px' },
        },
      },
    },

    /* --- Divider --- */
    MuiDivider: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.divider,
        }),
      },
    },
  },
});

export default theme;
