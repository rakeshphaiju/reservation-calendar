const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
}