const fs = require("fs").promises;
const axios = require("axios");
const dotenv = require("dotenv");
const { createTranslation } = require("./api.js");

const CONTENT_TYPES= {
  ORGANIZACIONES: 'organizaciones',
  SEDES: 'sedes',
}
dotenv.config();

// Configuración
const STRAPI_URL = "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN_JSON;
console.log(STRAPI_API_TOKEN);
const ORGANIZACIONES_FILE_PATH =
  "../backend_strapi_5/dataProc/organizaciones.json";
const SEDES_FILE_PATH = "../backend_strapi_5/dataProc/sedes.json";
const LOCALES = ["es", "en", "ar", "fr"];
const DEFAULT_LOCALE = "es";
const EXTRA_LOCALE = ["en", "ar", "fr"];

// Función para leer un archivo JSON
async function readJSON(filePath) {
  const content = await fs.readFile(filePath, { encoding: "utf-8" });
  const parsedContent = JSON.parse(content);
  if (parsedContent.rows && Array.isArray(parsedContent.rows)) {
    return parsedContent.rows;
  }
  throw new Error(
    `El archivo JSON ${filePath} debe contener un array de objetos en la propiedad "rows"`
  );
}

// Validar si los campos obligatorios están presentes
function validateRequiredFields(data) {
  const requiredFields = ["id", "nombre", "descripcion_general_es"];

  for (const field of requiredFields) {
    if (!data[field]) {
      console.error(`Error: El campo ${field} es obligatorio y está vacío`);
      return false;
    }
  }
  return true;
}

// Validación de email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return email && typeof email === "string" && emailRegex.test(email);
}

// Omitir los campos que son null, undefined o strings vacíos, y los que empiezan por '_'
function omitEmptyFields(data) {
  const cleanedData = {};
  for (const key in data) {
    if (!key.startsWith("_")) {
      const value = data[key];
      if (value !== null && value !== undefined && value !== "") {
        if (typeof value === "string") {
          const trimmedValue = value.trim();
          if (trimmedValue !== "") {
            if (key === "email_general" && !isValidEmail(trimmedValue)) {
              console.warn(
                `Advertencia: El email ${trimmedValue} no es válido y será omitido`
              );
            } else {
              cleanedData[key] = trimmedValue;
            }
          }
        } else {
          cleanedData[key] = value;
        }
      }
    }
  }
  return cleanedData;
}

// Función para enviar datos a Strapi
async function sendToStrapi(data, contentType) {
  try {
    console.log(
      `Enviando datos a ${contentType}:`,
      JSON.stringify(data, null, 2)
    );
    const response = await axios.post(
      `${STRAPI_URL}/api/${contentType}`,
      { data },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );
    console.log(
      `Datos enviados con éxito a ${contentType}. ID: ${response.data.data.id}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error al enviar datos a ${contentType}:`, error.message);
    if (error.response) {
      console.error(
        "Respuesta del servidor:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

// Función para procesar todas las sedes
async function processAllSedes(sedesData, organizacionesMap) {
  const sedesMap = new Map();
  for (const sede of sedesData) {
    const sedeData = prepareSedeData(sede, organizacionesMap, DEFAULT_LOCALE);
    try {
      const response = await sendToStrapi(sedeData, "sedes");
      console.log("response", response.data.documentId);

      const documentId = response.data.documentId;
      sedesMap.set(sede._id, {
        strapiId: response.data.id,
        originalId: sede.id,
      });

      for (const locale of EXTRA_LOCALE) {
        const localeSedeData = prepareSedeData(sede, organizacionesMap, locale);
        console.log("");
        createTranslation(documentId, locale, localeSedeData, CONTENT_TYPES.SEDES, STRAPI_API_TOKEN, STRAPI_URL);
      }
    } catch (error) {
      console.error(`Error al procesar la sede ${sede.id}:`, error.message);
    }
  }
  return sedesMap;
}

// Función para procesar cada organización
async function processOrganizacion(organizacion, sedesMap) {
  if (!validateRequiredFields(organizacion)) {
    return;
  }

  const sedesIds = organizacion.sedes
    .map((sedeId) => {
      const sede = sedesMap.get(sedeId);
      return sede ? sede.strapiId : null;
    })
    .filter((id) => id !== null);

  const organizacionData = prepareOrganizacionData(organizacion, sedesIds);
  await sendToStrapi(organizacionData, "organizaciones");
}

// Función para preparar los datos de la organización
function prepareOrganizacionData(organizacion, sedesIds) {
  const { id, ...restData } = organizacion;
  return {
    ...omitEmptyFields(restData),
    idfromjson: id,
    sedes: sedesIds.map((id) => ({ id })),
  };
}

function prepareSedeData(sede, organizacionesMap, _locale = "es") {
  const { id, organizacion, ...restData } = sede;
  const organizacionNombre =
    organizacion && organizacion.length > 0
      ? organizacionesMap.get(organizacion[0])
      : null;
  let cleanedData = omitEmptyFields(restData);
  cleanedData.listado_de_servicios =
    cleanedData["listado_de_servicios_" + _locale];
  for (const locale of LOCALES) {
    delete cleanedData["listado_de_servicios_" + locale];
  }
  return {
    ...cleanedData,
    idfromjson: id,
    organizacion: organizacionNombre,
  };
}

// Función principal para leer los datos y enviarlos a Strapi
async function main() {
  try {
    const organizacionesData = await readJSON(ORGANIZACIONES_FILE_PATH);
    const sedesData = await readJSON(SEDES_FILE_PATH);

    const organizacionesMap = new Map(
      organizacionesData.map((org) => [org._id, org.nombre])
    );

    console.log("Procesando sedes...");
    const sedesMap = await processAllSedes(sedesData, organizacionesMap);

    // console.log('Procesando organizaciones...');
    // for (const organizacion of organizacionesData) {
    //   await processOrganizacion(organizacion, sedesMap);
    // }

    console.log("Proceso completado.");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
