const axios = require('axios');
require('dotenv').config();

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

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

async function getCoordinates(sede) {
  const { tipo_calle, direccion, numero, localidad, provincia, cp } = sede;

  if (!direccion || !localidad || !provincia) {
    console.log(`Skipping sede ${sede.id} due to incomplete address information`);
    return null;
  }

  const address = `${tipo_calle || ''} ${direccion} ${numero || ''}`.trim();
  const query = `${address}, ${localidad}, ${provincia} ${cp || ''}`.trim();
  const encodedQuery = encodeURIComponent(query);

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json`;

  try {
    const response = await axios.get(url, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        country: 'es'
      }
    });

    if (response.data.features && response.data.features.length > 0) {
      const [longitude, latitude] = response.data.features[0].center;
      return { latitude, longitude };
    } else {
      console.log(`No coordinates found for sede ${sede.id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting coordinates for sede ${sede.id}:`, error.message);
    return null;
  }
}

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
        for(const i in sedeData.areas){
            sedeData.areas[i] = areasSeaToStrapiMap.get(sedeData.areas[i]);
        }
    }
    if (sedeData.colectivos_prioritarios) {
        for (const i in sedeData.colectivos_prioritarios) {
            sedeData.colectivos_prioritarios[i] = colectivosMap.get(sedeData.colectivos_prioritarios[i]);
        }
    }
    if (sedeData.colectivos_exclusivos) {
        for (const i in sedeData.colectivos_exclusivos) {
            sedeData.colectivos_exclusivos[i] = colectivosMap.get(sedeData.colectivos_exclusivos[i]);
        }
    }

    if (!sedeData.organizacion) {
      console.warn(
        `Advertencia: La sede con ID '${sede.id}' no tiene una organización asociada y no será asignada`
      );
      continue;
    }

    try {
      const response = await sendToStrapi(sedeData, "sedes");
      console.log(sedeData);
      const documentId = response.data.documentId;
      sedesMap.set(sede._id, {
        strapiId: response.data.id,
        originalId: sede.id,
      });

      for (const locale of EXTRA_LOCALE) {
        const localeSedeData = await prepareSedeData(sede, organizacionesMap, locale);
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
    }
  }
  return sedesMap;
}

async function prepareSedeData(sede, organizacionesMap, _locale = "es") {
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

  const nombreSedeNombreOrganizacion = `${cleanedData.nombre_sede || ""} - ${
    organizacionNombre || ""
  }`.trim();

  const coordinates = await getCoordinates(cleanedData);
  if (coordinates) {
    cleanedData.latitud = coordinates.latitude;
    cleanedData.longitud = coordinates.longitude;
  } else {
    console.warn(`No se pudieron obtener coordenadas para la sede: ${id}`);
  }

  return {
    ...cleanedData,
    idfromjson: id,
    organizacion: organizacionNombre,
    nombreSedeNombreOrganizacion: nombreSedeNombreOrganizacion,
  };
}

module.exports = {
  processAllSedes,
};
