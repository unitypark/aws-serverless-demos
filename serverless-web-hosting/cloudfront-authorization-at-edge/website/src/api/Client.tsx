import axios, { AxiosInstance } from 'axios';

const client: AxiosInstance = axios.create({
    baseURL: `${window.location.origin}/api`,
    withCredentials: true,
});

export default client;