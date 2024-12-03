const axios = require("axios");
require("dotenv").config();
const fs = require("fs").promises;

const {
  STRAPI_URL,
  STRAPI_API_TOKEN,
  LOCALES,
  DEFAULT_LOCALE,
  EXTRA_LOCALE,
  CONTENT_TYPES,
} = require("./config.js");
const { createTranslation, sendToStrapi } = require("./api.js");
const { omitEmptyFields } = require("./dataProcutils.js"); // Assuming these functions are in utils.js

const coordinatesJSON = require("./coordinates.json");
async function processAllSedes(
  sedesData,
  organizacionesMap,
  areasSeaToStrapiMap,
  colectivosMap
) {

  const sedesMap = new Map();
  for (const sede of sedesData) {
    const sedeData = prepareSedeData(sede, organizacionesMap, DEFAULT_LOCALE);
    if (sedeData.areas) {
      for (const i in sedeData.areas) {
        sedeData.areas[i] = areasSeaToStrapiMap.get(sedeData.areas[i]);
      }
    }
    if (sedeData.colectivos_prioritarios) {
      for (const i in sedeData.colectivos_prioritarios) {
        sedeData.colectivos_prioritarios[i] = colectivosMap.get(
          sedeData.colectivos_prioritarios[i]
        );
      }
    }
    if (sedeData.colectivos_exclusivos) {
      for (const i in sedeData.colectivos_exclusivos) {
        sedeData.colectivos_exclusivos[i] = colectivosMap.get(
          sedeData.colectivos_exclusivos[i]
        );
      }
    }

    if (!sedeData.organizacion) {
      console.warn(
        `Advertencia: La sede con ID '${sede.id}' no tiene una organización asociada y no será asignada`
      );
      continue;
    }

    try {
      console.log(sedeData);
      const response = await sendToStrapi(sedeData, "sedes");
      const documentId = response.data.documentId;
      sedesMap.set(sede._id, {
        strapiId: response.data.id,
        originalId: sede.id,
      });

      for (const locale of EXTRA_LOCALE) {
        const localeSedeData = prepareSedeData(
          sede,
          organizacionesMap,
          locale
        );
        // console.log(locale, localeSedeData);
        createTranslation(
          documentId,
          locale,
          localeSedeData,
          CONTENT_TYPES.SEDES,
          STRAPI_API_TOKEN,
          STRAPI_URL
        );
      }
    } catch (error) {
      console.error(`Error al procesar la sede ${sede.id}:`, error.message);
      process.exit(1);
    }
  }
  return sedesMap;
}

function prepareSedeData(sede, organizacionesMap, _locale = "es") {
  const { id, organizacion, ...restData } = sede;
  const organizacionNombre =
    organizacion && organizacion.length > 0
      ? organizacionesMap.get(organizacion[0])
      : null;
  let cleanedData = omitEmptyFields(restData);
  cleanedData["listado_de_servicios_" + _locale] =
    cleanedData["listado_de_servicios_" + _locale];
  for (const locale of LOCALES) {
    delete cleanedData["listado_de_servicios_" + locale];
  }

  // const nombreSedeNombreOrganizacion = `${cleanedData.nombre_sede || ""} - ${
  //   organizacionNombre || ""
  // }`.trim();

  const coordinateObject = coordinatesJSON.find((element) => element.id === id);

  if (coordinateObject) {
    cleanedData.geodata = {"lat":coordinateObject.latitude, "lng":coordinateObject.longitude};
  } else {
    console.warn(`No se pudieron obtener coordenadas para la sede: ${id}`);
  }

  return {
    ...cleanedData,
    idfromjson: id,
    organizacion: organizacionNombre,
    
  };
}

module.exports = {
  processAllSedes,
};
