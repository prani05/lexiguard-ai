import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#9f7aea', // Violet accent
      dark: '#805ad5',
      light: '#b794f4',
    },
    secondary: {
      main: '#ec4899', // Pink accent
    },
    background: {
      default: '#05020a',
      paper: 'rgba(20, 16, 35, 0.65)',
    },
    text: {
      primary: '#f3f4f6',
      secondary: '#9ca3af',
    },
  },
  typography: {
    fontFamily: "'Outfit', sans-serif",
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        },
      },
    },
  },
});

export default theme;
