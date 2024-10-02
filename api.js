const axios = require('axios');

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
      data
    );
    const response = await axios.put(
      `${STRAPI_URL}/api/${contentType}/${id}?locale=${locale}`,
      {
        data: {
          ...data,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );
    console.log(`Traducción en '${locale}' creada con éxito.`);
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

module.exports = {
    createTranslation
};
