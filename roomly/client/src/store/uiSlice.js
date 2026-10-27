import { createSlice } from '@reduxjs/toolkit';

const initial = localStorage.getItem('theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const slice = createSlice({
  name: 'ui',
  initialState: { theme: initial },
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
  },
});

export const { toggleTheme } = slice.actions;
export default slice.reducer;
