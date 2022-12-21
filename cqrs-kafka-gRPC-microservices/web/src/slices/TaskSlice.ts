import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ITask, ITasks } from '../interfaces/Task';
import { nanoid } from 'nanoid';

const initialState = {
	tasks: JSON.parse(localStorage.getItem('tasks')!) as ITasks || [] as ITasks,
};

export const taskSlice = createSlice({
	name: "tasks",
	initialState,
	reducers: {
		addTask: (state, action: PayloadAction<string>) => {
            const task:ITask = {
                id: nanoid(),
                description: action.payload,
                complete: false
            };
			state.tasks.push(task);
		},
        updateTask: (state, action: PayloadAction<ITask>) => {
            state.tasks = state.tasks.map((task) =>
            task.id === action.payload.id
                ? { ...action.payload, complete: false }
                : task
            );
		},
		deleteTask: (state, action: PayloadAction<ITask>) => {
			state.tasks = state.tasks.filter(
				(task) => task.id !== action.payload.id
			);
		},
        deleteAllTasks: (state) => {
            state.tasks = [];
        },
		toggleComplete: (state, action: PayloadAction<ITask>) => {
			state.tasks = state.tasks.map((task) =>
				task.id === action.payload.id
					? { ...task, complete: !task.complete }
					: task
			);
		},
	},
});

export const { 
	addTask, 
	updateTask, 
	deleteTask, 
	deleteAllTasks, 
	toggleComplete 
} = taskSlice.actions;

export default taskSlice.reducer;