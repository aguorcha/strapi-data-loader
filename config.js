// Configuración
const dotenv = require("dotenv");
dotenv.config();
const STRAPI_URL = "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN_JSON;
console.log("Token usado:", STRAPI_API_TOKEN);
const FILE_PATH = "./";
const ORGANIZACIONES_FILE_PATH =
  FILE_PATH+"organizaciones.json";
const SEDES_FILE_PATH = FILE_PATH+"sedes.json";
const LOCALES = ["es", "en", "ar", "fr"];
const DEFAULT_LOCALE = "es";
const EXTRA_LOCALE = ["en", "ar", "fr"];

module.exports = {
    STRAPI_URL,
    STRAPI_API_TOKEN,
    ORGANIZACIONES_FILE_PATH,
    SEDES_FILE_PATH,
    LOCALES,
    DEFAULT_LOCALE,
    EXTRA_LOCALE,
    };