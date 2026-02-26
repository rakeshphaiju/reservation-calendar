import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

const handleResponse = (response) => response.data;
const handleError = (error) => {
    console.error('API Call Failed:', error);
    throw error;
};

export const reservationService = {
    getAll: () => apiClient.get('/reserve').then(handleResponse).catch(handleError),

    create: (data) => apiClient.post('/reserve/add', data).then(handleResponse).catch(handleError),

    getById: (id) => apiClient.get(`/reserve/${id}`).then(handleResponse).catch(handleError),

    delete: (id) => apiClient.delete(`/reserve/${id}`).then(handleResponse).catch(handleError),
};

export default apiClient;