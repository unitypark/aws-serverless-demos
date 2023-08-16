import client from './Client';
import { useEffect, useState } from 'react';
import SessionExpiredDialog from '../components/ResponsiveDialog'

const ApiErrorHandler = () => {
    const [sessionExpired, setSessionExpired] = useState(false);

    useEffect(() => {
        console.log('ApiErrorHandler sessionExpired: ', sessionExpired);
        // Response interceptor
        const responseInterceptor = client.interceptors.response.use(
            (response) => {
                // Handle response here
                return response;
            },
            (error) => {
                console.log('AxiosErrorHandler Response: ', error.response);
                if (error.response) {
                    switch (error.response.status) {
                        // Handle Unauthenticated here
                        case 401:
                            setSessionExpired(true);
                            break;
                        // Handle Unauthorized here
                        case 403:
                            break;
                        default:
                            return error;
                    }
                }
                return error;
            },
        );
        return () => {
            // Remove handlers here
            client.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    // hadnling sessionExpired, then show Modal
    return (
        <SessionExpiredDialog 
            title={"Session Expired"} 
            description={"Your current session has expired. Click Refresh button to renew your session, a new login may be required."}
            buttonText={"Refresh"} 
            open={sessionExpired} 
        />
    );
};

export default ApiErrorHandler;
