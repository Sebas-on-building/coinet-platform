import { createSlice, createEntityAdapter, createAsyncThunk, PayloadAction, EntityState, Draft, ActionReducerMapBuilder } from '@reduxjs/toolkit';

export type User = { id: string; name: string; email: string; avatar: string; preferences: any };
const usersAdapter = createEntityAdapter<User, string>();

export const fetchUser = createAsyncThunk<User, string>('user/fetchUser', async (userId: string) => {
  const { fetchJson } = await import('./api');
  try {
    const data = await fetchJson<{ user?: User } & Partial<User>>('/api/auth/me');
    const u = (data as { user?: User })?.user ?? data;
    if (u && typeof u === 'object' && u.id) return u as User;
    return { id: userId, name: '', email: '', avatar: '', preferences: {} };
  } catch {
    return { id: userId, name: '', email: '', avatar: '', preferences: {} };
  }
});

interface UserState extends EntityState<User, string> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: UserState = usersAdapter.getInitialState({
  status: 'idle',
  error: null,
});

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    addUser: usersAdapter.addOne,
    removeUser: usersAdapter.removeOne,
    updateUser: usersAdapter.updateOne,
    setAllUsers: usersAdapter.setAll,
  },
  extraReducers: (builder: ActionReducerMapBuilder<UserState>) => {
    builder
      .addCase(fetchUser.pending, (state: Draft<UserState>) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state: Draft<UserState>, action: PayloadAction<User>) => {
        state.status = 'succeeded';
        usersAdapter.setAll(state, [action.payload]);
      })
      .addCase(fetchUser.rejected, (state: Draft<UserState>, action) => {
        state.status = 'failed';
        state.error = action.error?.message || 'Failed to fetch user';
      });
  },
});

const getUserEntityState = (state: { user: UserState }) => {
  const { status, error, ...entityState } = state.user;
  return entityState as EntityState<User, string>;
};

export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = usersAdapter.getSelectors(getUserEntityState);

export const { addUser, removeUser, updateUser, setAllUsers } = userSlice.actions;
export default userSlice.reducer; 