export interface ITask {
    id: string,
    description: string,
    complete: boolean
}

export interface ITasks extends Array<ITask>{}

export interface IState {
    tasksWatch: {
        tasks : ITasks
    }
}

export interface IBtnUpdate {
    task: ITask
}

export interface IBtnDelete {
    task: ITask
}
