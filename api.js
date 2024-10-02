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

module.exports = {
    createTranslation
};
