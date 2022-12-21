import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
	tab: localStorage.getItem('tab') as string || "andamento",
};

export const tabSlice = createSlice({
	name: "tab",
	initialState,
	reducers: {
        updateTab: (state, action: PayloadAction<string>) => {
            state.tab = action.payload;
		}
	},
});

export const { 
	updateTab 
} = tabSlice.actions;

export default tabSlice.reducer;