const axios = require('axios');
const {
  STRAPI_URL,
  STRAPI_API_TOKEN
} = require("./config.js");


async function createTranslation(
  id,
  locale,
  data,
  contentType,
  STRAPI_API_TOKEN,
  STRAPI_URL
) {
  try {
    console.log(
      `Creando traducción para el ID '${id}' en idioma '${locale}':`,
      JSON.stringify(data, null, 2)
    );
    const response = await axios.put(
      `${STRAPI_URL}/api/${contentType}/${id}`,
      { data },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
        params: { locale },
      }
    );
    if (response.status === 200) {
      console.log(`Traducción en '${locale}' creada con éxito.`);
    } else {
      console.log(`Traducción en '${locale}' no se pudo crear. Estado: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error al crear traducción en '${locale}':`, error.message);
    if (error.response) {
      console.error(
        "Respuesta del servidor:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
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

// Función para borrar los datos cargados
async function cleanLoadedData() {
  try {
    console.log("Limpiando datos existentes en Strapi...");
    
    const response = await axios.get(
      `${STRAPI_URL}/api/sedes/clean`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );
    
    console.log("Datos limpiados exitosamente.");
    return response.data;
  } catch (error) {
    console.error("Error al limpiar los datos:", error.message);
    if (error.response) {
      console.error(
        "Respuesta del servidor:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw error;
  }
}

module.exports = {
  createTranslation,
  cleanLoadedData,
  sendToStrapi,
};
