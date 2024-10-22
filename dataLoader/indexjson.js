const fs = require("fs").promises;
const axios = require("axios");
const dotenv = require("dotenv");
const util = require('util');
dotenv.config();

const {
  createTranslation,
  cleanLoadedData,
  sendToStrapi,
} = require("./api.js");
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

const { createAreasAndMacro } = require("./areas.js");
const { createColectivos } = require("./colectivosProc.js");
const { processAllSedes } = require("./sedesProc.js");

const FILE_PATH = "../dataProc/";
const ORGANIZACIONES_FILE_PATH = FILE_PATH + "organizaciones.json";
const AREAS_FILE_PATH = FILE_PATH + "areas.json";
const COLECTIVOS_FILE_PATH = FILE_PATH + "colectivos.json";
const MACRO_AREAS_FILE_PATH = FILE_PATH + "macroareas.json";
const SEDES_FILE_PATH = FILE_PATH + "sedes.json";
const OUTPUT_FILE_PATH = FILE_PATH + "output.json";

let consoleOutput = [];
const originalConsoleLog = console.log;
const origianlConsoleError = console.error;
console.log = (...args) => {
  consoleOutput.push(util.format(...args));
  originalConsoleLog(...args);
};
console.error = (...args) => {
  consoleOutput.push(util.format(...args));
  origianlConsoleError(...args);
};

async function writeOutputToFile(data) {
  try {
    await fs.writeFile(OUTPUT_FILE_PATH, JSON.stringify(consoleOutput, null, 2));
    originalConsoleLog(`Salidad de la terminal guardada en ${OUTPUT_FILE_PATH}`);
  } catch (error) {
    origianlConsoleError(`Error al escribir en ${OUTPUT_FILE_PATH}:`, error);
  }
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

  const organizacionData = prepareOrganizacionData(
    organizacion,
    sedesIds,
    "es"
  );
  const response = await sendToStrapi(organizacionData, "organizaciones");
  const documentId = response.data.documentId;

  for (const locale of EXTRA_LOCALE) {
    const localeOrganizacionData = prepareOrganizacionDataLocale(
      organizacion,
      locale,
      sedesIds
    );
    console.log(documentId, locale, localeOrganizacionData);
    await createTranslation(
      documentId,
      locale,
      localeOrganizacionData,
      CONTENT_TYPES.ORGANIZACIONES,
      STRAPI_API_TOKEN,
      STRAPI_URL
    );
  }
}

// Función para preparar los datos de la organización
function prepareOrganizacionData(organizacion, sedesIds, _locale = "es") {
  const { id, ...restData } = organizacion;
  let cleanedData = omitEmptyFields(restData);
  cleanedData.logo = cleanedData.logo[0]??'';
  // Para el idioma por defecto, envía los campos sin sufijo
  if (_locale === "es") {
    cleanedData.descripcion_general = cleanedData.descripcion_general;
    cleanedData.nombre_largo = cleanedData.nombre_largo;
    cleanedData.listado_servicios_organizacion =
      cleanedData.listado_servicios_organizacion;
  }

  // Elimina los nombre de otros idiomas para no mandarlos
  for (const locale of LOCALES) {
    delete cleanedData["descripcion_general_" + locale];
    delete cleanedData["nombre_largo_" + locale];
    delete cleanedData["listado_servicios_organizacion_" + locale];
  }

  return {
    ...cleanedData,
    idfromjson: id,
    sedes: sedesIds.map((id) => ({ id })),
  };
}

function prepareOrganizacionDataLocale(organizacion, _locale = "es", sedesIds) {
  const { id, ...restData } = organizacion;
  let cleanedData = omitEmptyFields(restData);
    cleanedData.logo = cleanedData.logo[0] ?? "";


  // Asignar los campos que se debe "traducir" según el idioma
  if (_locale !== "es") {
    cleanedData.descripcion_general =
      cleanedData[`descripcion_general_${_locale}`];
    cleanedData.nombre_largo = cleanedData[`nombre_largo_${_locale}`];
    cleanedData.listado_servicios_organizacion =
      cleanedData[`listado_servicios_organizacion_${_locale}`];
  }

  // Elimina los campos en otros idiomas para no enviarlos
  for (const locale of LOCALES) {
    delete cleanedData[`descripcion_general_${locale}`];
    delete cleanedData[`nombre_largo_${locale}`];
    delete cleanedData[`listado_servicios_organizacion_${locale}`];
  }

  // incluir el campo 'sedes' de las traducciones
  cleanedData.sedes = sedesIds.map((id) => ({ id }));

  return {
    ...cleanedData,
    idfromjson: id,
  };
}

// Función principal para leer los datos y enviarlos a Strapi
async function main() {
  try {
    await cleanLoadedData();

    const organizacionesData = await readJSON(ORGANIZACIONES_FILE_PATH);
    const sedesData = await readJSON(SEDES_FILE_PATH);
    const areasData = await readJSON(AREAS_FILE_PATH);
    const colectivosData = await readJSON(COLECTIVOS_FILE_PATH);
    const macroAreasData = await readJSON(MACRO_AREAS_FILE_PATH);

    const colectivosMap = await createColectivos(colectivosData);
    const { areasSeaToStrapiMap, macroareasSeaToStrapiMap } =
      await createAreasAndMacro(areasData, macroAreasData);

    // TMP: remove fields with relations
    const organizacionesMap = new Map(
      organizacionesData.map((org) => [org._id, org.nombre])
    );
    console.log("Procesando sedes...");
    const sedesMap = await processAllSedes(
      sedesData.slice(0),
      organizacionesMap,
      areasSeaToStrapiMap,
      colectivosMap
    );

    console.log("Procesando organizaciones...");
    for (const organizacion of organizacionesData) {
      await processOrganizacion(organizacion, sedesMap);
    }

    console.log("Proceso completado.");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await writeOutputToFile();
    console.log = originalConsoleLog;
    console.error = origianlConsoleError;
  }
}

main();
