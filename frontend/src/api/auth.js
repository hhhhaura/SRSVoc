import api from './axios';

export const login = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  
  const response = await api.post('/token', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  
  const { access_token } = response.data;
  localStorage.setItem('token', access_token);
  
  return response.data;
};

export const register = async (username, password) => {
  const response = await api.post('/register', { username, password });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getMe = async () => {
  const response = await api.get('/me');
  return response.data;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
