import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';

const errMsg = (e) => e.response?.data?.message || e.message;

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', creds);
    localStorage.setItem('token', data.token);
    return data.user;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('token', data.token);
    return data.user;
  } catch (e) {
    return rejectWithValue(errMsg(e));
  }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  if (!localStorage.getItem('token')) return null;
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (e) {
    localStorage.removeItem('token');
    return rejectWithValue(errMsg(e));
  }
});

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, ready: !localStorage.getItem('token'), loading: false, error: null },
  reducers: {
    logout(state) {
      localStorage.removeItem('token');
      state.user = null;
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    const pending = (s) => { s.loading = true; s.error = null; };
    const done = (s, a) => { s.loading = false; s.user = a.payload; };
    const fail = (s, a) => { s.loading = false; s.error = a.payload; };
    b.addCase(login.pending, pending).addCase(login.fulfilled, done).addCase(login.rejected, fail);
    b.addCase(register.pending, pending).addCase(register.fulfilled, done).addCase(register.rejected, fail);
    b.addCase(fetchMe.fulfilled, (s, a) => { s.user = a.payload; s.ready = true; });
    b.addCase(fetchMe.rejected, (s) => { s.user = null; s.ready = true; });
  },
});

export const { logout, setUser, clearError } = slice.actions;
export default slice.reducer;
