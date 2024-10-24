const fs = require("fs").promises;
const axios = require("axios");
const dotenv = require("dotenv");
const util = require('util');
const path = require("path");
dotenv.config();

const {
  createTranslation,
  cleanLoadedData,
  sendToStrapi,
  uploadLogo,
  updateOrganizacionLogo,
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
const LOGOS_PATH = FILE_PATH + "";

let consoleOutput = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  const formattedArgs = args.map(arg => {
    return typeof arg === "object" ? JSON.stringify(arg, null, 2) : util.format(arg);
  });
  consoleOutput.push(...formattedArgs);
  originalConsoleLog(...args);
};

console.error = (...args) => {
  const formattedArgs = args.map(arg => {
    return typeof arg === "object" ? JSON.stringify(arg, null, 2) : util.format(arg);
  });
  consoleOutput.push(...formattedArgs);
  originalConsoleError(...args);
};

async function writeOutputToFile(data) {
  try {
    await fs.writeFile(OUTPUT_FILE_PATH, JSON.stringify(consoleOutput, null, 2));
    originalConsoleLog(`Salidad de la terminal guardada en ${OUTPUT_FILE_PATH}`);
  } catch (error) {
    originalConsoleError(`Error al escribir en ${OUTPUT_FILE_PATH}:`, error);
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

      // Cargar el logo
  let logoId = null;
  if (organizacion.logo && organizacion.logo[0]) {
    const logoPath = path.join(LOGOS_PATH, organizacion.logo[0]);
    try {
      logoId = await uploadLogo(logoPath, STRAPI_API_TOKEN, STRAPI_URL);
    } catch (error) {
      
      console.error(`No se pudo subir el logo para ${organizacion.nombre}`);
      process.exit(1);
    }
  }

  const organizacionData = prepareOrganizacionData(
    organizacion,
    sedesIds,
    "es",
    logoId
  );
  const response = await sendToStrapi(organizacionData, "organizaciones");
  const documentId = response.data.documentId;

  // if (logoId) {
  //   try {
  //     await updateOrganizacionLogo(documentId, logoId, STRAPI_API_TOKEN, STRAPI_URL);
  //   } catch (error) {
  //     console.error(`No se pudo asociar el logo para ${organizacion.nombre}:`, error.message);
  //   }
  // }

  for (const locale of EXTRA_LOCALE) {
    const localeOrganizacionData = prepareOrganizacionDataLocale(
      organizacion,
      locale,
      sedesIds,
      logoId
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
function prepareOrganizacionData(organizacion, sedesIds, _locale = "es", logoId = null) {
  const { id, ...restData } = organizacion;
  let cleanedData = omitEmptyFields(restData);

  if (logoId) {
    cleanedData.logo = logoId;
  } else {
    delete cleanedData.logo;
  }

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

function prepareOrganizacionDataLocale(organizacion, _locale = "es", sedesIds, logoId = null) {
  const { id, ...restData } = organizacion;
  let cleanedData = omitEmptyFields(restData);

  if (logoId) {
    cleanedData.logo = logoId;
  } else {
    delete cleanedData.logo;
  }

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
    console.error = originalConsoleError;
  }
}

main();
