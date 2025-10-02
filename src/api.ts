import axios from 'axios';
const BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log("BASE_URL",BASE_URL)
if (!BASE_URL) {
  console.error("REACT_APP_API_BASE_URL is not defined in .env file!");
}

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;