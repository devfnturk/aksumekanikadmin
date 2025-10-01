// src/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://aksu-mekanik-9bhv.onrender.com', // Buraya IP veya domain
});

export default api;
