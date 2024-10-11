// Configuración
const dotenv = require("dotenv");
dotenv.config();
const STRAPI_URL = "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN_JSON;
console.log("Token usado:", STRAPI_API_TOKEN);

const LOCALES = ["es", "en", "ar", "fr"];
const DEFAULT_LOCALE = "es";
const EXTRA_LOCALE = ["en", "ar", "fr"];

const CONTENT_TYPES = {
  ORGANIZACIONES: "organizaciones",
  SEDES: "sedes",
  AREAS: "areas",
  COLECTIVOS: "colectivos",
  MACRO_AREAS: "macroareas",
};

module.exports = {
  STRAPI_URL,
  STRAPI_API_TOKEN,

  LOCALES,
  DEFAULT_LOCALE,
  EXTRA_LOCALE,
  CONTENT_TYPES,
};
