const {
  readJSON,
  validateRequiredFields,
  omitEmptyFields,
} = require("./dataProcutils.js");

const {
  STRAPI_URL,
  STRAPI_API_TOKEN,
  LOCALES,
  DEFAULT_LOCALE,
  EXTRA_LOCALE,
  CONTENT_TYPES,
} = require("./config.js");

const { sendToStrapi } = require("./api.js");

function preprocessColectivosData(colectivosData) {
  return colectivosData.map((colectivo) => {
    delete colectivo.sedes_prioritarias;
    delete colectivo.sedes_exclusivas;
    colectivo.idfromjson = colectivo._id;
    const cleanedColectivo = omitEmptyFields(colectivo);
    // replace macrocolectivo seatable id with Strapi id
    return cleanedColectivo;
  });
}

const sendColectivosAndGetIdMap = async (colectivosData) => {
  const colectivosMap = new Map();
  for (const colectivo of colectivosData) {
    omitEmptyFields(colectivo);
    try {
      const id = colectivo.idfromjson;
      delete colectivo.idfromjson;
      const response = await sendToStrapi(colectivo, CONTENT_TYPES.COLECTIVOS);
      colectivosMap.set(id, response.data.id);
    } catch (error) {
      return;
    }
  }
  return colectivosMap;
};

async function createColectivos(colectivosData) {   
    
    const colectivosDataCleaned = preprocessColectivosData(colectivosData);
    const colectivosMap = await sendColectivosAndGetIdMap(colectivosDataCleaned);
    console.log("Colectivos map:", colectivosMap);
    return colectivosMap;
}

module.exports = {
  createColectivos,
};
