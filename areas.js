// this module gets the areas.json and macro-areas.json files and sends them to Strapi

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

function preprocessAreasData(areasData, macroareasSeaToStrapiMap) {
  return areasData.map((area) => {
    delete area.sedes;
    area.idfromjson = area._id;
    const cleanedArea = omitEmptyFields(area);
    // replace macroArea seatable id with Strapi id
    cleanedArea.macroarea = macroareasSeaToStrapiMap.get(
      cleanedArea.macroarea[0]
    );
    return cleanedArea;
  });
}

function preprocessMacroAreasData(macroAreasData) {
  return macroAreasData.map((macroArea) => {
    delete macroArea.areas;
    macroArea.idfromjson = macroArea._id;
    const cleanedMacroArea = omitEmptyFields(macroArea);
    return cleanedMacroArea;
  });
}

async function sendMacroAreasAndgetIdMap(macroAreasData) {
  const macroAreasMap = new Map();
  for (const macroArea of macroAreasData) {
    omitEmptyFields(macroArea);
    try {
      const id = macroArea.idfromjson;
      delete macroArea.idfromjson;
      const response = await sendToStrapi(macroArea, CONTENT_TYPES.MACRO_AREAS);
      macroAreasMap.set(id, response.data.id);
    } catch (error) {
      return;
    }
  }
  return macroAreasMap;
}

async function sendAreasAndgetIdMap(areasData) {
  const areasMap = new Map();
  for (const area of areasData) {
    try {
      const id = area.idfromjson;
      delete area.idfromjson;
      const response = await sendToStrapi(area, CONTENT_TYPES.AREAS);
      areasMap.set(id, response.data.id);
    } catch (error) {
      return;
    }
  }
  return areasMap;
}

async function createAreasAndMacro(areasData, macroAreasData) {
  const cleanedMacroAreas = preprocessMacroAreasData(macroAreasData);
  const macroareasSeaToStrapiMap = await sendMacroAreasAndgetIdMap(
    cleanedMacroAreas
  );
  console.log("----------------------------- areas -----------------------------");
  const cleanedAreas = preprocessAreasData(areasData, macroareasSeaToStrapiMap);
  const areasSeaToStrapiMap = await sendAreasAndgetIdMap(cleanedAreas);

  console.log("cleanedAreas", areasSeaToStrapiMap);
  return { areasSeaToStrapiMap, macroareasSeaToStrapiMap };
}
module.exports = {
  createAreasAndMacro,
};
