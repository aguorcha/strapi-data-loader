const fs = require('fs').promises;
const { parse } = require('csv-parse');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Configuración
const STRAPI_URL = 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;
const FILE_PATH = './test.csv'; // Puedes cambiarlo a .json si quieres leer un archivo JSON
const CONTENT_TYPE = 'test-organizations';

// Función para leer y parsear el archivo CSV
async function readCSV(filePath) {
  const content = await fs.readFile(filePath, { encoding: 'utf-8' });
  return new Promise((resolve, reject) => {
    parse(content, { columns: true, skip_empty_lines: true }, (err, records) => {
      if (err) reject(err);
      else resolve(records);
    });
  });
}

// Función para leer un archivo JSON
async function readJSON(filePath) {
  const content = await fs.readFile(filePath, { encoding: 'utf-8' });
  return JSON.parse(content);
}

// Función para enviar datos a Strapi
async function sendToStrapi(data) {
  // Validar que el campo email no esté vacío
  if (!data.email) {
    console.error('Error: El campo email no puede estar vacío');
    return;
  }

  // Preparamos los datos que vamos a enviar a Strapi
  const validData = (({
    idfromcsv,
    name,
    description,
    website,
    email,
    phone,
    description_en,
    description_ar,
  }) => ({
    idfromcsv,
    name,
    description,
    website,
    email,
    phone,
    description_en,
    description_ar,
  }))(data);

  try {
    // Hacemos la petición POST a la API de Strapi
    const response = await axios.post(
      `${STRAPI_URL}/api/${CONTENT_TYPE}`,
      { data: validData },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        },
      }
    );
    console.log(`Datos enviados con éxito. ID: ${response.data.data.id}`);
  } catch (error) {
    console.error('Error al enviar datos a Strapi:', error.message);
    if (error.response) {
      console.error('Respuesta del servidor:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Función principal para leer los datos y enviarlos a Strapi
async function main() {
  try {
    let data;

    // Verificar si el archivo es CSV o JSON
    if (FILE_PATH.endsWith('.csv')) {
      data = await readCSV(FILE_PATH);
    } else if (FILE_PATH.endsWith('.json')) {
      data = await readJSON(FILE_PATH);
    } else {
      throw new Error('Formato de archivo no soportado. Use CSV o JSON.');
    }

    let i = 0;
    // Enviar cada registro a Strapi
    for (const item of data) {
      await sendToStrapi(item);
      i++;
      console.log(`Registro ${i} procesado.`);
    }

    console.log('Proceso completado.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
